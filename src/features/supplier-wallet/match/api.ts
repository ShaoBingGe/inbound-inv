/**
 * 三单匹配取数与写操作。live 模式调用业务 API；mock 模式用示例数据，并在内存里保留本次会话的写操作
 * （确认、新增匹配组、工作台保存 / 下推），切换页签或从工作台返回后状态不丢。
 * 所有查询都携带国家（数据驻留在各国数据中心），过滤条件作为查询参数交给后端，前端不做本地过滤。
 */
import { http, isMock, mockDelay } from '@/lib/http';
import { hs, rng } from '@/lib/sample';
import type { CountryCode } from '../types';
import {
  buildDrugMapping,
  DEFAULT_TOLERANCE,
  isInternalSupplier,
  MATCH_GROUPS,
  MATCH_POOL,
  PAYABLES,
  PAYABLES_BASE,
  PENDING_INB,
  PENDING_INBOUNDS,
  SYNC_TOTAL,
  UNMATCHED_INV,
  UNMATCHED_INVOICES,
  WB_CAND_INB,
  WB_CAND_INV,
  WB_INBOUNDS,
  WB_INVOICES,
  WB_LINKS,
} from './data';
import { estimateFit, findInvLine, linkedSets, simulateRun, summarize, type RunTiming } from './logic';
import type {
  AdjDoc,
  AdjType,
  DraftGroup,
  DrugMapping,
  MatchBoardData,
  MatchBoardFilter,
  MatchGroup,
  MatchPool,
  MatchRun,
  Payable,
  PayableLine,
  PendingDoc,
  StrategyForm,
  Workbench,
} from './types';

const countryBase = (c: CountryCode) => `/v1/supplier-wallet/countries/${c}`;
const groupPath = (mg: string) => `/v1/supplier-wallet/match-groups/${encodeURIComponent(mg)}`;

/* ---------------- mock 会话状态 ---------------- */

/** 示例数据只有中国大陆（医药三单匹配） */
const MOCK_COUNTRY: CountryCode = 'CN';

/** 设计稿节奏 × 0.6：同步发票 → 逐组经过 4 个阶段 */
const TIMING: RunTiming = {
  syncTotal: SYNC_TOTAL,
  syncStep: 8,
  syncTickMs: 165,
  syncHoldMs: 1350,
  staggerMs: 1860,
  stageMs: 2280,
};

interface DraftSource {
  draft: DraftGroup;
  /** 首张发票的供应商 / 首张入库单的组织 */
  sup: string;
  buyer: string;
}

const mock = {
  runStart: 0,
  confirmed: new Map<string, string>(),
  drafts: [] as DraftSource[],
  manualGroups: [] as MatchGroup[],
  deleted: new Set<string>(),
  /** 工作台保存后更新的判定字段 */
  overrides: new Map<string, Partial<MatchGroup>>(),
  workbenches: new Map<string, Workbench>(),
  payables: [] as Payable[],
  groupSeq: 0,
  apSeq: 620,
  adjSeq: 881,
};

const nowStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function allGroups(): MatchGroup[] {
  return [...MATCH_GROUPS, ...mock.manualGroups]
    .filter((g) => !mock.deleted.has(g.mg))
    .map((g) => {
      const ap = mock.confirmed.get(g.mg);
      const o = mock.overrides.get(g.mg);
      return { ...g, ...o, ...(ap ? { confirmed: true, ap } : null) };
    });
}

function mockRun(): MatchRun {
  if (!mock.runStart) mock.runStart = Date.now();
  return simulateRun(
    Date.now() - mock.runStart,
    MATCH_GROUPS.map((g) => g.mg),
    TIMING,
  );
}

const emptyRun = (): MatchRun => ({
  phase: 'complete',
  syncNow: 0,
  syncTotal: 0,
  stages: {},
  done: [],
});

/** 由已确认匹配组生成应付单明细（示例：按品规数把发票金额拆成明细行） */
function synthPayableLines(g: MatchGroup): PayableLine[] {
  const r = rng(hs(g.mg));
  const names = [
    '注射用青霉素钠',
    '葡萄糖注射液',
    '维生素C注射液',
    '注射用兰索拉唑',
    '复方氨基酸注射液',
    '甘露醇注射液',
    '注射用美罗培南',
  ];
  const n = Math.max(1, g.invCats);
  const weights = Array.from({ length: n }, () => 0.5 + r());
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w, i) => {
    const amt = (g.invAmt * w) / sum;
    const qty = 50 + Math.floor(r() * 1950);
    return {
      name: names[(hs(g.mg) + i) % names.length],
      spec: '—',
      unit: '盒',
      qty,
      price: Math.round((amt / qty) * 100) / 100,
      inv: g.inv.split(' ')[0],
      gr: `GR-2026-${7100 + i}`,
    };
  });
}

function addPayable(p: Omit<Payable, 'amt'>) {
  const amt = Math.round(p.lines.reduce((a, l) => a + l.qty * l.price, 0));
  mock.payables.unshift({ ...p, amt });
}

function confirmMock(mgs: string[], actor: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  const groups = allGroups();
  mgs.forEach((mg) => {
    const g = groups.find((x) => x.mg === mg);
    if (!g || g.confirmed) return;
    const ap = `AP-2026-0${mock.apSeq++}`;
    mock.confirmed.set(mg, ap);
    out[mg] = ap;
    addPayable({
      id: ap,
      mg,
      sup: g.sup,
      buyer: g.buyer,
      st: 'pushed',
      at: nowStamp(),
      creator: actor,
      lines: synthPayableLines(g),
    });
  });
  return out;
}

function seedWorkbench(mg: string): Workbench {
  const g = allGroups().find((x) => x.mg === mg);
  const d = mock.drafts.find((x) => x.draft.id === mg);
  return {
    mg,
    pairFrom: g?.sup ?? d?.sup ?? WB_INVOICES[0].party,
    pairTo: g?.buyer ?? d?.buyer ?? '集团中心仓 / 川渝配送中心',
    locked: !!g?.confirmed,
    apNo: g?.ap,
    invoices: structuredClone(WB_INVOICES),
    inbounds: structuredClone(WB_INBOUNDS),
    candInv: structuredClone(WB_CAND_INV),
    candInb: structuredClone(WB_CAND_INB),
    links: structuredClone(WB_LINKS),
    adjDocs: [],
  };
}

function mockWorkbench(mg: string): Workbench {
  let wb = mock.workbenches.get(mg);
  if (!wb) {
    wb = seedWorkbench(mg);
    mock.workbenches.set(mg, wb);
  }
  return structuredClone(wb);
}

/** 工作台保存：手工新增的匹配组生成匹配卡片；行全绿且无金额差的组升级为已完全匹配 */
function applyWorkbenchResult(wb: Workbench) {
  const s = summarize(wb.invoices, wb.inbounds, wb.links);
  const invAmt = wb.invoices.reduce((a, d) => a + d.lines.reduce((b, l) => b + l.amt, 0), 0);
  const inbAmt = wb.inbounds.reduce((a, d) => a + d.lines.reduce((b, l) => b + l.amt, 0), 0);
  const di = mock.drafts.findIndex((x) => x.draft.id === wb.mg);
  if (di >= 0) {
    const src = mock.drafts[di];
    const est = estimateFit(invAmt, inbAmt);
    mock.drafts.splice(di, 1);
    mock.manualGroups.push({
      mg: wb.mg,
      inv: wb.invoices.map((d) => d.id).join(' / '),
      sup: src.sup,
      buyer: src.buyer,
      rel: `${wb.invoices.length}票:${wb.inbounds.length}单`,
      invDocs: wb.invoices.length,
      invCats: s.invLines,
      invAmt,
      inbDocs: wb.inbounds.length,
      inbMats: s.inbLines,
      inbAmt,
      strategy: '手工新增匹配组（人工选定发票与入库单）',
      ratio: '人工确认',
      pv: est.pv,
      qv: 0,
      av: est.pv,
      fit: est.fit,
      conf: est.conf,
      tax: true,
      manual: true,
    });
    return;
  }
  if (s.remainInvLines === 0 && !s.hasDiff) mock.overrides.set(wb.mg, { pv: 0, qv: 0, av: 0, fit: 100 });
}

/* ================= 匹配组看板 ================= */

export async function fetchMatchBoard(country: CountryCode, f: MatchBoardFilter): Promise<MatchBoardData> {
  if (!isMock()) {
    return http.get<MatchBoardData>(`${countryBase(country)}/match/board`, {
      query: {
        range: f.range,
        buyer: f.buyer === 'all' ? undefined : f.buyer,
        supplier: f.supplier === 'all' ? undefined : f.supplier,
      },
    });
  }
  const all = country === MOCK_COUNTRY ? allGroups() : [];
  const groups = all.filter(
    (g) => (f.buyer === 'all' || g.buyer === f.buyer) && (f.supplier === 'all' || g.sup === f.supplier),
  );
  const sups = [...new Set(MATCH_GROUPS.map((g) => g.sup))];
  return mockDelay({
    country,
    groups,
    drafts: country === MOCK_COUNTRY ? mock.drafts.map((d) => d.draft) : [],
    tolerance: DEFAULT_TOLERANCE,
    buyers: country === MOCK_COUNTRY ? [...new Set(MATCH_GROUPS.map((g) => g.buyer))] : [],
    suppliers: country === MOCK_COUNTRY ? sups.map((name) => ({ name, internal: isInternalSupplier(name) })) : [],
    syncTotal: country === MOCK_COUNTRY ? SYNC_TOTAL : 0,
    unmatchedInvoices: country === MOCK_COUNTRY ? UNMATCHED_INVOICES : 0,
    pendingInbounds: country === MOCK_COUNTRY ? PENDING_INBOUNDS : 0,
    payables: country === MOCK_COUNTRY ? PAYABLES_BASE + mock.confirmed.size : 0,
  });
}

/** 匹配引擎批处理状态（任务提交后轮询；后端也可改为 SSE） */
export async function fetchMatchRun(country: CountryCode): Promise<MatchRun> {
  if (!isMock()) return http.get<MatchRun>(`${countryBase(country)}/match/run`);
  return mockDelay(country === MOCK_COUNTRY ? mockRun() : emptyRun(), 40);
}

/** 重新运行：重新同步税务发票并对当前过滤上下文重跑匹配 */
export async function replayMatchRun(country: CountryCode): Promise<MatchRun> {
  if (!isMock()) return http.post<MatchRun>(`${countryBase(country)}/match/run`);
  mock.runStart = Date.now();
  return mockDelay(country === MOCK_COUNTRY ? mockRun() : emptyRun(), 40);
}

/** 新增匹配组时可选的发票与入库单 */
export async function fetchMatchPool(country: CountryCode): Promise<MatchPool> {
  if (!isMock()) return http.get<MatchPool>(`${countryBase(country)}/match/pool`);
  return mockDelay(country === MOCK_COUNTRY ? MATCH_POOL : { inv: [], inb: [] });
}

/** 未匹配发票明细（kind=inv）/ 供应商待匹配入库单明细（kind=inb） */
export async function fetchPendingDocs(country: CountryCode, kind: 'inv' | 'inb'): Promise<PendingDoc[]> {
  if (!isMock())
    return http.get<PendingDoc[]>(`${countryBase(country)}/match/pending`, {
      query: { kind },
    });
  if (country !== MOCK_COUNTRY) return mockDelay([]);
  return mockDelay(kind === 'inv' ? UNMATCHED_INV : PENDING_INB);
}

/**
 * 手工新增匹配组，进入匹配中队列。发票必选；未勾选入库单时默认匹配全部入库单。
 * 后端校验供应商 / 组织一致性与入库余额。
 */
export async function createMatchGroup(
  country: CountryCode,
  body: { inv: string[]; inb: string[]; source: 'pool' | 'pending' },
): Promise<DraftGroup> {
  if (!isMock()) return http.post<DraftGroup>(`${countryBase(country)}/match/groups`, body);
  const id = `MG-NEW-${++mock.groupSeq}`;
  const docs = body.source === 'pool' ? MATCH_POOL : { inv: UNMATCHED_INV, inb: PENDING_INB };
  const inbIds = body.source === 'pool' && !body.inb.length ? MATCH_POOL.inb.map((d) => d.id) : body.inb;
  const inv = docs.inv.filter((d) => body.inv.includes(d.id));
  const inb = docs.inb.filter((d) => inbIds.includes(d.id));
  const sum = (ds: Array<{ lines: Array<{ amt: number }> }>) =>
    ds.reduce((a, d) => a + d.lines.reduce((b, l) => b + l.amt, 0), 0);
  const draft: DraftGroup = {
    id,
    invDocs: inv.map((d) => d.id),
    inbDocs: inb.map((d) => d.id),
    invAmt: sum(inv),
    inbAmt: sum(inb),
  };
  mock.drafts.push({
    draft,
    sup: inv[0]?.party ?? WB_INVOICES[0].party,
    buyer: inb[0]?.party ?? '集团中心仓',
  });
  return mockDelay(draft);
}

/** 调整策略：保存该组的策略覆盖项（版本化、可审计）并触发单组重跑 */
export async function saveGroupStrategy(mg: string, form: StrategyForm): Promise<{ rerun: boolean }> {
  if (!isMock()) return http.put(`${groupPath(mg)}/strategy`, form);
  return mockDelay({ rerun: true });
}

/** 确认匹配（幂等）：生成应付单并回写发票 / 入库单匹配状态；支持批量 */
export async function confirmMatchGroups(mgs: string[], actor: string | null): Promise<{ ap: Record<string, string> }> {
  if (!isMock())
    return http.post('/v1/supplier-wallet/match-groups/confirm', {
      groups: mgs,
    });
  return mockDelay({ ap: confirmMock(mgs, actor) });
}

/* ================= 手工匹配工作台 ================= */

export async function fetchWorkbench(mg: string): Promise<Workbench> {
  if (!isMock()) return http.get<Workbench>(`${groupPath(mg)}/workbench`);
  return mockDelay(mockWorkbench(mg));
}

/** 保存手工匹配结果：持久化连线与判定，重算行占用、入库余额与组匹配率 */
export async function saveWorkbench(
  mg: string,
  body: Pick<Workbench, 'invoices' | 'inbounds' | 'links'>,
): Promise<{ savedAt: string }> {
  if (!isMock()) {
    return http.put(`${groupPath(mg)}/workbench`, {
      invoices: body.invoices.map((d) => d.id),
      inbounds: body.inbounds.map((d) => d.id),
      links: body.links,
    });
  }
  const wb = mockWorkbench(mg);
  const savedAt = nowStamp().slice(11);
  const next: Workbench = {
    ...wb,
    invoices: body.invoices,
    inbounds: body.inbounds,
    links: body.links,
    savedAt,
  };
  mock.workbenches.set(mg, next);
  applyWorkbenchResult(next);
  return mockDelay({ savedAt });
}

/** 按行差异生成差额单（入库调价单 / 退货单 / 尾差 / 折让），过账后进入应付流程 */
export async function createAdjustments(mg: string, rows: Array<{ lid: string; type: AdjType }>): Promise<AdjDoc[]> {
  if (!isMock()) return http.post<AdjDoc[]>(`${groupPath(mg)}/adjustments`, { rows });
  const wb = mockWorkbench(mg);
  const docs: AdjDoc[] = [];
  rows.forEach((r) => {
    const doc = wb.invoices.find((d) => d.lines.some((l) => l.id === r.lid));
    const line = findInvLine(wb.invoices, r.lid);
    if (!doc || !line) return;
    docs.push({
      id: `ADJ-2026-0${mock.adjSeq++}`,
      type: r.type,
      name: line.name,
      invId: doc.id,
      lid: line.id,
      amt: line.amtDiff,
    });
  });
  mock.workbenches.set(mg, { ...wb, adjDocs: [...wb.adjDocs, ...docs] });
  return mockDelay(docs);
}

/** 下推应付单：匹配组锁定为「已推送应付」，不可再修改 */
export async function pushWorkbenchToAp(mg: string, actor: string | null): Promise<{ apNo: string }> {
  if (!isMock()) return http.post(`${groupPath(mg)}/push`);
  const wb = mockWorkbench(mg);
  const apNo = `AP-2026-0${mock.apSeq++}`;
  const linked = linkedSets(wb.links);
  const firstInb = (lid: string) => {
    const g = wb.links.find((x) => x.inv.includes(lid));
    const rid = g?.inb[0];
    return wb.inbounds.find((d) => d.lines.some((l) => l.id === rid))?.id ?? '—';
  };
  const lines: PayableLine[] = [];
  wb.invoices.forEach((d) =>
    d.lines.forEach((l) => {
      if (!linked.inv.has(l.id)) return;
      const qty = parseFloat(l.qty) || 1;
      lines.push({
        name: l.name,
        spec: l.spec.split(' · ')[0],
        unit: l.unit,
        qty,
        price: Math.round((l.amt / qty) * 100) / 100,
        inv: d.id,
        gr: firstInb(l.id),
      });
    }),
  );
  wb.adjDocs.forEach((a) =>
    lines.push({
      name: a.name,
      spec: '—',
      unit: '项',
      qty: 1,
      price: a.amt,
      inv: a.invId,
      gr: a.id,
      lt: a.type,
    }),
  );
  addPayable({
    id: apNo,
    mg,
    sup: wb.pairFrom,
    buyer: wb.pairTo,
    st: 'pushed',
    at: nowStamp(),
    creator: actor,
    lines,
  });
  mock.workbenches.set(mg, { ...wb, locked: true, apNo });
  const di = mock.drafts.findIndex((x) => x.draft.id === mg);
  if (di >= 0) applyWorkbenchResult(wb);
  mock.confirmed.set(mg, apNo);
  return mockDelay({ apNo });
}

/** 删除匹配组：清空连线，相关明细行回到未匹配池 */
export async function deleteMatchGroup(mg: string): Promise<void> {
  if (!isMock()) return http.del(groupPath(mg));
  mock.deleted.add(mg);
  mock.drafts = mock.drafts.filter((x) => x.draft.id !== mg);
  mock.workbenches.delete(mg);
  return mockDelay(undefined);
}

/* ================= 应付单查询 / 药品匹配关系 ================= */

/** 三单匹配确认 / 下推生成的应付单（只读） */
export async function fetchPayables(country: CountryCode): Promise<Payable[]> {
  if (!isMock()) return http.get<Payable[]>(`${countryBase(country)}/payables`);
  return mockDelay(country === MOCK_COUNTRY ? [...mock.payables, ...PAYABLES] : []);
}

let drugCache: DrugMapping | null = null;
/** 药品匹配关系知识库：库存物料与供应商发票品规的匹配对及换算比例（向量化匹配的依据） */
export async function fetchDrugMapping(country: CountryCode): Promise<DrugMapping> {
  if (!isMock()) return http.get<DrugMapping>(`${countryBase(country)}/drug-mapping`);
  if (country !== MOCK_COUNTRY) return mockDelay({ drugs: [], suppliers: [] });
  drugCache ??= buildDrugMapping();
  return mockDelay(drugCache);
}
