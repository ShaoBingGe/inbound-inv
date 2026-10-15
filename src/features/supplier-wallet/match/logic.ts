/**
 * 三单匹配的判定与工作台计算（纯函数，页面与 mock 共用，有单测）。
 * 判定沿用设计稿的 derive 思路：单价 / 数量任一超容差 → 冻结差异；吻合度低于阈值 → 人工复核；
 * 否则自动确认。组匹配率 = 已匹配行 / 总行数。
 */
import type {
  LineHint,
  LinkKind,
  MatchGroup,
  MatchRun,
  MatchTolerance,
  RecAction,
  Verdict,
  WbDoc,
  WbInbLine,
  WbInvLine,
  WbLink,
  Zone,
} from './types';

/* ================= 匹配组看板 ================= */

export function deriveVerdict(g: MatchGroup, tol: MatchTolerance): Verdict {
  if (g.confirmed) return 'confirmed';
  if (Math.abs(g.pv) > tol.priceTol || Math.abs(g.qv) > tol.qtyTol) return 'block';
  if (g.fit < tol.autoFit) return 'review';
  return 'auto';
}

export function verdictZone(v: Verdict): Zone {
  return v === 'auto' ? 'auto' : v === 'confirmed' ? 'done' : 'manual';
}

export interface CardModel {
  verdict: Verdict;
  zone: Zone;
  matchedRows: number;
  totalRows: number;
  /** 行级匹配率（%） */
  lineRate: number;
  /** 被强调的推荐操作 */
  recAction: RecAction;
}

export function cardModel(g: MatchGroup, tol: MatchTolerance): CardModel {
  const verdict = deriveVerdict(g, tol);
  const totalRows = g.invCats || 1;
  const full = verdict === 'auto' || verdict === 'confirmed';
  // 未完全匹配的组至少差一行（设计稿按四舍五入会出现「未完全匹配却 100%」）
  const matchedRows = full ? totalRows : Math.max(0, Math.min(totalRows - 1, Math.floor((totalRows * g.fit) / 100)));
  const priceOut = Math.abs(g.pv) > tol.priceTol;
  const recAction: RecAction =
    verdict === 'block'
      ? priceOut
        ? 'adjust'
        : 'manual'
      : verdict === 'review'
        ? 'manual'
        : verdict === 'auto'
          ? 'confirm'
          : 'none';
  return {
    verdict,
    zone: verdictZone(verdict),
    matchedRows,
    totalRows,
    lineRate: Math.round((matchedRows / totalRows) * 100),
    recAction,
  };
}

/** 行匹配率的色调：100% 绿、≥85% 橙、其余红 */
export function rateTone(rate: number): 'green' | 'orange' | 'red' {
  return rate >= 100 ? 'green' : rate >= 85 ? 'orange' : 'red';
}

/** 手工新增匹配组按金额差估算吻合度 / 置信度 */
export function estimateFit(invAmt: number, inbAmt: number) {
  const pv = invAmt ? +(((invAmt - inbAmt) / invAmt) * 100).toFixed(1) : 0;
  const fit = Math.max(60, Math.min(100, Math.round(100 - Math.abs(pv) * 3)));
  return { pv, fit, conf: Math.max(55, fit - 4) };
}

/* ---------------- 匹配引擎执行状态（mock 用时间推演，live 由后端返回） ---------------- */

export interface RunTiming {
  syncTotal: number;
  syncStep: number;
  syncTickMs: number;
  syncHoldMs: number;
  staggerMs: number;
  stageMs: number;
}

/** 在 elapsed 毫秒时，按设计稿节奏推演的批处理状态：先同步发票，再逐组经过 4 个阶段 */
export function simulateRun(elapsed: number, groups: string[], tm: RunTiming): MatchRun {
  const ticks = Math.ceil(tm.syncTotal / tm.syncStep);
  const syncEnd = ticks * tm.syncTickMs;
  if (elapsed < syncEnd) {
    const syncNow = Math.min(tm.syncTotal, Math.floor(elapsed / tm.syncTickMs) * tm.syncStep);
    return {
      phase: 'sync',
      syncNow,
      syncTotal: tm.syncTotal,
      stages: {},
      done: [],
    };
  }
  const t0 = syncEnd + tm.syncHoldMs;
  const stages: Record<string, number> = {};
  const done: string[] = [];
  groups.forEach((mg, i) => {
    const local = elapsed - t0 - i * tm.staggerMs;
    if (local < 0) return;
    const st = Math.floor(local / tm.stageMs);
    if (st >= 4) done.push(mg);
    else stages[mg] = st;
  });
  const phase = elapsed < t0 ? 'sync' : done.length >= groups.length ? 'complete' : 'processing';
  return {
    phase,
    syncNow: tm.syncTotal,
    syncTotal: tm.syncTotal,
    stages,
    done,
  };
}

/** 对外三态：0 队列中、1 向量化中、2–3 匹配中 */
export const execStateIndex = (stage: number) => (stage <= 0 ? 0 : stage === 1 ? 1 : 2);

/* ================= 手工匹配工作台 ================= */

export function linkKind(invCount: number, inbCount: number): LinkKind {
  return `${invCount > 1 ? 'n' : '1'}:${inbCount > 1 ? 'n' : '1'}` as LinkKind;
}

/** 两端都有明细行的连线所覆盖的行 */
export function linkedSets(links: WbLink[]) {
  const inv = new Set<string>();
  const inb = new Set<string>();
  links.forEach((g) => {
    if (!g.inv.length || !g.inb.length) return;
    g.inv.forEach((x) => inv.add(x));
    g.inb.forEach((x) => inb.add(x));
  });
  return { inv, inb };
}

export function groupOf(links: WbLink[], lid: string): WbLink | undefined {
  return links.find((g) => g.inv.includes(lid) || g.inb.includes(lid));
}

export const invLineHasDiff = (l: WbInvLine) => Math.abs(l.amtDiff) > 0 || Math.abs(l.qtyDiff) > 0;

export function findInvLine(docs: WbDoc<WbInvLine>[], lid: string): WbInvLine | undefined {
  for (const d of docs) {
    const l = d.lines.find((x) => x.id === lid);
    if (l) return l;
  }
  return undefined;
}

/** 入库行所在连线中是否有带差额的发票行 */
export function inbLineHasDiff(lid: string, links: WbLink[], invDocs: WbDoc<WbInvLine>[]): boolean {
  const g = groupOf(links, lid);
  return !!g?.inv.some((iid) => {
    const il = findInvLine(invDocs, iid);
    return !!il && invLineHasDiff(il);
  });
}

/** 叠加手工连线后的行建议：已连线的「无法匹配」行视为建议匹配；被删除连线的行置为无法匹配 */
export function effectiveHint(
  lid: string,
  base: LineHint,
  linked: boolean,
  forceNone: Record<string, boolean>,
): LineHint {
  if (linked) return base === 'none' ? 'suggest' : base;
  if (forceNone[lid]) return 'none';
  return base;
}

/** 三色结果：绿 = 完全匹配、黄 = 有差额、红 = 未匹配 */
export type LineResult = 'full' | 'partial' | 'unmatched';
export function lineResult(linked: boolean, hasDiff: boolean): LineResult {
  return !linked ? 'unmatched' : hasDiff ? 'partial' : 'full';
}

const cloneLinks = (links: WbLink[]) => links.map((g) => ({ ...g, inv: g.inv.slice(), inb: g.inb.slice() }));

/**
 * 编辑已选连线：点左右明细行增减端点。
 * 一端被清空时连线删除，返回 dissolved（原连线剩余的行，需置为无法匹配）。
 */
export function toggleLinkEndpoint(links: WbLink[], linkId: string, side: 'inv' | 'inb', lid: string) {
  const next = cloneLinks(links);
  const g = next.find((x) => x.id === linkId);
  if (!g) return { links, dissolved: null as string[] | null };
  const arr = g[side];
  const i = arr.indexOf(lid);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(lid);
  g.kind = linkKind(g.inv.length, g.inb.length);
  const kept = next.filter((x) => x.inv.length && x.inb.length);
  const dissolved = kept.some((x) => x.id === linkId) ? null : g.inv.concat(g.inb);
  return { links: kept, dissolved };
}

/**
 * 手工建立连接：在「无法匹配」的行上逐个点选，两侧都有行时自动生成连线。
 * curId 为正在建立的连线；为空时新建 newId。
 */
export function toggleDraftEndpoint(
  links: WbLink[],
  curId: string | null,
  side: 'inv' | 'inb',
  lid: string,
  newId: string,
) {
  const next = cloneLinks(links);
  let cur = next.find((g) => g.id === curId);
  if (!cur) {
    cur = { id: newId, inv: [], inb: [], ratio: '1 : 1', kind: '1:1' };
    next.push(cur);
  }
  const arr = cur[side];
  const i = arr.indexOf(lid);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(lid);
  cur.kind = linkKind(cur.inv.length, cur.inb.length);
  const cleaned = next.filter((g) => g.inv.length + g.inb.length > 0);
  const id = cur.id;
  return {
    links: cleaned,
    curId: cleaned.some((g) => g.id === id) ? id : null,
  };
}

export interface WorkbenchSummary {
  invDocs: number;
  inbDocs: number;
  invLines: number;
  inbLines: number;
  matchedInvLines: number;
  /** 行级匹配率（%） */
  lineRate: number;
  remainInvLines: number;
  remainInbLines: number;
  matchedInvAmt: number;
  matchedInbAmt: number;
  /** 已匹配金额差（发票 − 入库） */
  diff: number;
  hasDiff: boolean;
  /** 差异比例（%） */
  diffRatio: number;
  invLeftLines: number;
  invLeftAmt: number;
  inbLeftLines: number;
  inbLeftAmt: number;
  /** 两端齐全的连线数 */
  linkCount: number;
}

export function summarize(invDocs: WbDoc<WbInvLine>[], inbDocs: WbDoc<WbInbLine>[], links: WbLink[]): WorkbenchSummary {
  const linked = linkedSets(links);
  let matchedInvAmt = 0;
  let invLeftLines = 0;
  let invLeftAmt = 0;
  let matchedInvLines = 0;
  let fullInvLines = 0;
  let invLines = 0;
  invDocs.forEach((d) =>
    d.lines.forEach((l) => {
      invLines++;
      if (linked.inv.has(l.id)) {
        matchedInvAmt += l.amt;
        matchedInvLines++;
        if (!invLineHasDiff(l)) fullInvLines++;
      } else {
        invLeftLines++;
        invLeftAmt += l.amt;
      }
    }),
  );
  let matchedInbAmt = 0;
  let inbLeftLines = 0;
  let inbLeftAmt = 0;
  let fullInbLines = 0;
  let inbLines = 0;
  inbDocs.forEach((d) =>
    d.lines.forEach((l) => {
      inbLines++;
      if (linked.inb.has(l.id)) {
        matchedInbAmt += l.amt;
        if (!inbLineHasDiff(l.id, links, invDocs)) fullInbLines++;
      } else {
        inbLeftLines++;
        inbLeftAmt += l.amt;
      }
    }),
  );
  const diff = matchedInvAmt - matchedInbAmt;
  return {
    invDocs: invDocs.length,
    inbDocs: inbDocs.length,
    invLines,
    inbLines,
    matchedInvLines,
    lineRate: invLines ? Math.round((matchedInvLines / invLines) * 100) : 0,
    remainInvLines: invLines - fullInvLines,
    remainInbLines: inbLines - fullInbLines,
    matchedInvAmt,
    matchedInbAmt,
    diff,
    hasDiff: Math.abs(diff) >= 1,
    diffRatio: matchedInvAmt ? (Math.abs(diff) / matchedInvAmt) * 100 : 0,
    invLeftLines,
    invLeftAmt,
    inbLeftLines,
    inbLeftAmt,
    linkCount: links.filter((g) => g.inv.length && g.inb.length).length,
  };
}

/** 选中发票行的金额 / 数量 / 单价差比例（%，带符号） */
export function lineDeviation(l: WbInvLine) {
  const amtP = 100 - l.amtM;
  const qtyP = 100 - l.qtyM;
  const amtPct = l.amtDiff < 0 ? -amtP : amtP;
  const qtyPct = l.qtyDiff < 0 ? -qtyP : qtyP;
  const pricePct = +(amtPct - qtyPct).toFixed(1);
  return { amtPct, qtyPct, pricePct, full: amtPct === 0 && qtyPct === 0 };
}

/** 吻合度色调：≥99 绿、≥90 橙、其余红 */
export function fitTone(p: number): 'green' | 'orange' | 'red' {
  return p >= 99 ? 'green' : p >= 90 ? 'orange' : 'red';
}

/* ================= 通用格式 ================= */

/** ¥128,400（与设计稿一致：人民币、整数、千分位） */
export const cny = (n: number) => `${n < 0 ? '-' : ''}¥${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
/** 带符号百分比：+1.2% / -4.2% / 0% */
export const signedPct = (v: number, digits?: number) =>
  `${v > 0 ? '+' : ''}${digits == null ? v : v.toFixed(digits)}%`;
