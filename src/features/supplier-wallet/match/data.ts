/**
 * 三单匹配示例数据（与设计稿「医药三单匹配」的发票匹配生成应付单、手工匹配工作台、
 * 应付单查询、药品匹配关系一致）。只在 mock 模式下由 api.ts 使用。
 */
import type { Tone } from '@/components/ui';
import type {
  AdjType,
  DocLineState,
  Drug,
  DrugEdge,
  DrugGroup,
  DrugInv,
  DrugMapping,
  DrugMat,
  DrugStatus,
  LineHint,
  MatchGroup,
  MatchPool,
  MatchTolerance,
  NoQtyStrategy,
  Payable,
  PayableStatus,
  PendingDoc,
  StrategyForm,
  Verdict,
  WbDoc,
  WbInbLine,
  WbInvLine,
  WbLink,
  Zone,
} from './types';

/* ---------------- 标签与色调（简体中文原文，显示时经 t()） ---------------- */

export const VERDICT_META: Record<Verdict, { label: string; sugg: string; tone: Tone }> = {
  auto: { label: '建议自动确认', sugg: '建议自动确认', tone: 'green' },
  review: { label: '建议人工复核', sugg: '建议人工复核', tone: 'orange' },
  block: { label: '建议冻结差异', sugg: '建议冻结差异', tone: 'red' },
  confirmed: { label: '已确认', sugg: '已确认完成', tone: 'purple' },
};

export const ZONE_META: Record<Zone, { title: string; desc: string; tone: Tone }> = {
  manual: {
    title: '未完全匹配',
    desc: '行匹配率未达 100% · 调整策略重跑或手工勾稽',
    tone: 'orange',
  },
  auto: {
    title: '已完全匹配',
    desc: '组内行全绿且各项在容差内 · 可确认生成应付单',
    tone: 'green',
  },
  done: {
    title: '已确认匹配',
    desc: '已生成应付单 · 进入付款流程',
    tone: 'purple',
  },
};
export const ZONE_ORDER: Zone[] = ['manual', 'auto', 'done'];

/** 匹配引擎内部四阶段；对外三态见 EXEC_STATE */
export const RUN_STAGES = ['数据情况分析', '策略选择', '匹配算法执行', '匹配结果展示'];
export const EXEC_STATE: Array<{ label: string; tone: Tone }> = [
  { label: '队列中', tone: 'gray' },
  { label: '向量化中', tone: 'purple' },
  { label: '匹配中', tone: 'blue' },
];

export const DOC_LINE_LABEL: Record<DocLineState, { label: string; tone: Tone }> = {
  unmatched: { label: '未匹配', tone: 'red' },
  partial: { label: '部分匹配', tone: 'orange' },
  matched: { label: '已匹配', tone: 'green' },
};

export const LINE_HINT_LABEL: Record<LineHint, string> = {
  suggest: '建议匹配',
  diff: '有差异',
  none: '无法匹配',
};

export const ADJ_LABEL: Record<AdjType, { label: string; tone: Tone }> = {
  price: { label: '入库调价单', tone: 'red' },
  return: { label: '退货单', tone: 'red' },
  rounding: { label: '尾差', tone: 'orange' },
  discount: { label: '折让', tone: 'orange' },
};

export const PAYABLE_STATUS: Record<PayableStatus, { label: string; tone: Tone }> = {
  pushed: { label: '已推送', tone: 'blue' },
  posted: { label: '已过账', tone: 'green' },
  unpaid: { label: '待付款', tone: 'orange' },
  paid: { label: '已付款', tone: 'gray' },
};

export const DRUG_STATUS: Record<DrugStatus, { label: string; tone: Tone }> = {
  full: { label: '全部匹配', tone: 'green' },
  partial: { label: '部分匹配', tone: 'orange' },
  none: { label: '未匹配', tone: 'red' },
};

export const NO_QTY_LABEL: Record<NoQtyStrategy, string> = {
  merge: '金额合并',
  prorate: '按比例分摊',
  separate: '单独挂账',
  offset: '与蓝票轧差',
};

export const DATE_RANGES = ['近 7 天', '近 30 天', '本月 (2026-07)', '上月 (2026-06)', '本季度'];
export const DEFAULT_RANGE = '本月 (2026-07)';

export const DEFAULT_TOLERANCE: MatchTolerance = {
  priceTol: 2,
  qtyTol: 1,
  autoFit: 95,
};

export const DEFAULT_STRATEGY: StrategyForm = {
  taxBasis: 'gross',
  amtMode: 'pct',
  amtPct: 2,
  amtAbs: 50,
  qtyMode: 'pct',
  qtyPct: 1,
  qtyAbs: 10,
  priceMode: 'pct',
  pricePct: 2,
  priceAbs: 0.5,
  fxOn: true,
  fxRule: 'invoiceDate',
  unitConv: 'convert',
  blueInv: true,
  blueStrategy: 'merge',
  redInv: true,
  redStrategy: 'merge',
};

/* ---------------- 匹配组 ---------------- */

const S = {
  cq: '重庆医药(集团)股份有限公司',
  sc: '重庆医药集团四川医药有限公司',
  hn: '重庆医药集团湖南有限公司',
  gz: '贵州省医药(集团)和平医药有限公司',
  mm: '重庆医药集团医贸药品有限公司',
};
/** 集团内部供应商（重庆医药体系） */
export const isInternalSupplier = (name: string) => /重庆医药|重控股/.test(name);

export const SYNC_TOTAL = 124;
export const UNMATCHED_INVOICES = 26;
export const PENDING_INBOUNDS = 15;
export const PAYABLES_BASE = 82;

export const MATCH_GROUPS: MatchGroup[] = [
  {
    mg: 'MG-20260712-014',
    inv: 'INV-2026-8842',
    sup: S.cq,
    buyer: '集团中心仓',
    rel: '1票:1单',
    invDocs: 1,
    invCats: 5,
    invAmt: 128400,
    inbDocs: 1,
    inbMats: 5,
    inbAmt: 128400,
    strategy: 'PO 精确匹配（采购订单号 + 行项目）',
    ratio: '1 : 1',
    pv: 0,
    qv: 0,
    av: 0,
    fit: 99,
    conf: 99,
    tax: true,
  },
  {
    mg: 'MG-20260712-015',
    inv: 'INV-2026-8847',
    sup: S.sc,
    buyer: '川渝配送中心',
    rel: '1票:1单',
    invDocs: 1,
    invCats: 8,
    invAmt: 97300,
    inbDocs: 1,
    inbMats: 8,
    inbAmt: 96720,
    strategy: '智能匹配（名称 + 规格 + 单位换算）',
    ratio: '1 盒 = 10 支',
    pv: 0.6,
    qv: 0,
    av: 0.6,
    fit: 97,
    conf: 98,
    tax: true,
  },
  {
    mg: 'MG-20260712-016',
    inv: 'INV-2026-8851',
    sup: S.gz,
    buyer: '湘黔配送中心',
    rel: '1票:1单',
    invDocs: 1,
    invCats: 3,
    invAmt: 221704,
    inbDocs: 1,
    inbMats: 3,
    inbAmt: 214000,
    strategy: '容差匹配（价格差异校验）',
    ratio: '1 : 1',
    pv: 3.6,
    qv: 0,
    av: 3.6,
    fit: 88,
    conf: 84,
    tax: true,
  },
  {
    mg: 'MG-20260712-017',
    inv: 'INV-2026-8856',
    sup: S.hn,
    buyer: '华中区域仓',
    rel: '1票:1单',
    invDocs: 1,
    invCats: 4,
    invAmt: 355000,
    inbDocs: 1,
    inbMats: 4,
    inbAmt: 340000,
    strategy: '智能匹配（名称 + 规格 + 单位换算）',
    ratio: '1 箱 = 200 支',
    pv: 0,
    qv: -4.2,
    av: -4.2,
    fit: 86,
    conf: 80,
    tax: true,
  },
  {
    mg: 'MG-20260712-018',
    inv: 'INV-2026-8860',
    sup: S.cq,
    buyer: '重庆片区仓',
    rel: '1票:3单',
    invDocs: 1,
    invCats: 6,
    invAmt: 162000,
    inbDocs: 3,
    inbMats: 6,
    inbAmt: 162000,
    strategy: '一票多单（按批次 / 收货单拆分匹配）',
    ratio: '1 盒 = 12 粒',
    pv: 0.3,
    qv: 0,
    av: 0.3,
    fit: 95,
    conf: 93,
    tax: true,
  },
  {
    mg: 'MG-20260712-019',
    inv: 'INV-2026-8863',
    sup: S.mm,
    buyer: '集团中心仓',
    rel: '1票:1单',
    invDocs: 1,
    invCats: 5,
    invAmt: 88600,
    inbDocs: 1,
    inbMats: 5,
    inbAmt: 87540,
    strategy: '智能匹配（名称 + 规格 + 单位换算）',
    ratio: '1 盒 = 5 支',
    pv: 1.2,
    qv: 0.5,
    av: 1.2,
    fit: 91,
    conf: 88,
    tax: false,
  },
  {
    mg: 'MG-20260712-020',
    inv: 'INV-2026-8867 等 2 张',
    sup: S.sc,
    buyer: '川渝配送中心',
    rel: '2票:1单',
    invDocs: 2,
    invCats: 4,
    invAmt: 203400,
    inbDocs: 1,
    inbMats: 4,
    inbAmt: 200400,
    strategy: '多票一单（合并发票匹配单一收货）',
    ratio: '1 : 1',
    pv: 1.5,
    qv: 0,
    av: 1.5,
    fit: 93,
    conf: 90,
    tax: true,
  },
  {
    mg: 'MG-20260712-011',
    inv: 'INV-2026-8830',
    sup: S.cq,
    buyer: '集团中心仓',
    rel: '1票:1单',
    invDocs: 1,
    invCats: 7,
    invAmt: 150000,
    inbDocs: 1,
    inbMats: 7,
    inbAmt: 150000,
    strategy: 'PO 精确匹配（采购订单号 + 行项目）',
    ratio: '1 : 1',
    pv: 0,
    qv: 0,
    av: 0,
    fit: 98,
    conf: 99,
    tax: true,
    ap: 'AP-2026-0311',
    confirmed: true,
  },
];

/** 新增匹配组时可选的发票与入库单 */
export const MATCH_POOL: MatchPool = {
  inv: [
    {
      id: 'INV-2026-9001',
      party: S.cq,
      lines: [
        {
          lid: 'INV-2026-9001-1',
          name: '注射用青霉素钠',
          spec: '0.24g×10支/盒 · 盒',
          amt: 42000,
        },
        {
          lid: 'INV-2026-9001-2',
          name: '注射用兰索拉唑',
          spec: '30mg · 支',
          amt: 27300,
        },
      ],
    },
    {
      id: 'INV-2026-9002',
      party: S.sc,
      lines: [
        {
          lid: 'INV-2026-9002-1',
          name: '葡萄糖注射液',
          spec: '250ml · 瓶',
          amt: 18500,
        },
      ],
    },
    {
      id: 'INV-2026-9003',
      party: S.gz,
      lines: [
        {
          lid: 'INV-2026-9003-1',
          name: '维生素C注射液',
          spec: '2ml:0.5g · 支',
          amt: 9600,
        },
        {
          lid: 'INV-2026-9003-2',
          name: '复方氨基酸注射液',
          spec: '250ml · 瓶',
          amt: 21400,
        },
      ],
    },
  ],
  inb: [
    {
      id: 'GR-2026-8001',
      party: '集团中心仓',
      lines: [
        {
          lid: 'GR-2026-8001-1',
          name: '注射用青霉素钠',
          spec: '0.24g×10支/盒 · 盒',
          amt: 42000,
        },
        {
          lid: 'GR-2026-8001-2',
          name: '注射用兰索拉唑',
          spec: '30mg×5支/盒 · 盒',
          amt: 26800,
        },
      ],
    },
    {
      id: 'GR-2026-8002',
      party: '川渝配送中心',
      lines: [
        {
          lid: 'GR-2026-8002-1',
          name: '葡萄糖注射液',
          spec: '250ml · 瓶',
          amt: 18100,
        },
      ],
    },
    {
      id: 'GR-2026-8003',
      party: '湘黔配送中心',
      lines: [
        {
          lid: 'GR-2026-8003-1',
          name: '维生素C注射液',
          spec: '2ml:0.5g · 支',
          amt: 9600,
        },
        {
          lid: 'GR-2026-8003-2',
          name: '复方氨基酸注射液',
          spec: '250ml · 瓶',
          amt: 20950,
        },
      ],
    },
  ],
};

export const UNMATCHED_INV: PendingDoc[] = [
  {
    id: 'INV-2026-8871',
    party: S.cq,
    date: '2026-07-12',
    status: 'unmatched',
    lines: [
      {
        name: '注射用头孢曲松钠',
        spec: '1.0g · 支',
        qty: '500 支',
        price: 8.6,
        amt: 4300,
        tax: '13%',
        st: 'unmatched',
      },
      {
        name: '盐酸氨溴索注射液',
        spec: '2ml:15mg · 支',
        qty: '800 支',
        price: 3.2,
        amt: 2560,
        tax: '13%',
        st: 'unmatched',
      },
    ],
  },
  {
    id: 'INV-2026-8875',
    party: S.sc,
    date: '2026-07-12',
    status: 'partial',
    lines: [
      {
        name: '注射用泮托拉唑钠',
        spec: '40mg · 支',
        qty: '300 支',
        price: 15.0,
        amt: 4500,
        tax: '13%',
        st: 'partial',
      },
      {
        name: '氯化钠注射液',
        spec: '500ml · 瓶',
        qty: '400 瓶',
        price: 2.8,
        amt: 1120,
        tax: '13%',
        st: 'matched',
      },
    ],
  },
  {
    id: 'INV-2026-8879',
    party: S.gz,
    date: '2026-07-11',
    status: 'unmatched',
    lines: [
      {
        name: '维生素B6注射液',
        spec: '2ml:0.1g · 支',
        qty: '600 支',
        price: 1.9,
        amt: 1140,
        tax: '13%',
        st: 'unmatched',
      },
    ],
  },
];

export const PENDING_INB: PendingDoc[] = [
  {
    id: 'GR-2026-8041',
    party: '重庆片区仓',
    date: '2026-07-12',
    lines: [
      {
        name: '注射用头孢曲松钠',
        spec: '1.0g · 支',
        qty: '500 支',
        bal: '500 支',
        amt: 4300,
        st: 'unmatched',
      },
      {
        name: '甘露醇注射液',
        spec: '250ml · 瓶',
        qty: '300 瓶',
        bal: '120 瓶',
        amt: 6240,
        st: 'partial',
      },
    ],
  },
  {
    id: 'GR-2026-8046',
    party: '华中区域仓',
    date: '2026-07-12',
    lines: [
      {
        name: '注射用美罗培南',
        spec: '0.5g×5支/盒 · 盒',
        qty: '40 盒',
        bal: '40 盒',
        amt: 29500,
        st: 'unmatched',
      },
    ],
  },
  {
    id: 'GR-2026-8052',
    party: '川渝配送中心',
    date: '2026-07-11',
    lines: [
      {
        name: '复方电解质注射液',
        spec: '500ml · 瓶',
        qty: '200 瓶',
        bal: '80 瓶',
        amt: 5120,
        st: 'partial',
      },
    ],
  },
];

/* ---------------- 手工匹配工作台 ---------------- */

type InvTuple = [string, string, string, string, number, LineHint, number, number, number, number, string];
const invLines = (xs: InvTuple[]): WbInvLine[] =>
  xs.map(([id, name, spec, qty, amt, st, amtM, qtyM, amtDiff, qtyDiff, unit]) => ({
    id,
    name,
    spec,
    qty,
    amt,
    st,
    amtM,
    qtyM,
    amtDiff,
    qtyDiff,
    unit,
  }));
type InbTuple = [string, string, string, string, number, LineHint, string, number];
const inbLines = (xs: InbTuple[]): WbInbLine[] =>
  xs.map(([id, name, spec, qty, amt, st, bal, balAmt]) => ({
    id,
    name,
    spec,
    qty,
    amt,
    st,
    bal,
    balAmt,
  }));

export const WB_INVOICES: WbDoc<WbInvLine>[] = [
  {
    id: 'INV-2026-8842',
    tag: '四川医药',
    party: S.sc,
    date: '2026-07-12',
    lines: invLines([
      ['L1', '注射用头孢曲松钠', '1.0g×10支/盒 · 盒', '80 盒', 128400, 'suggest', 100, 100, 0, 0, '盒'],
      ['L2', '盐酸氨溴索注射液', '2ml:10mg · 支', '2000 支', 46000, 'suggest', 100, 100, 0, 0, '支'],
      ['L3', '注射用美罗培南', '0.5g · 支', '600 支', 88600, 'diff', 93.3, 96.0, -5900, -24, '支'],
      ['L4', '甘露醇注射液', '250ml · 瓶', '300 瓶', 15600, 'none', 0, 0, 0, 0, '瓶'],
    ]),
  },
  {
    id: 'INV-2026-8851',
    tag: '贵州和平',
    party: S.gz,
    date: '2026-07-12',
    lines: invLines([
      ['L5', '注射用头孢他啶', '1.0g×10支/盒 · 盒', '120 盒', 120000, 'suggest', 100, 100, 0, 0, '盒'],
      ['L6', '注射用头孢他啶(拆零)', '1.0g · 支', '300 支', 30000, 'suggest', 100, 100, 0, 0, '支'],
      ['L7', '注射用美罗培南', '0.5g×5支/盒 · 盒', '160 盒', 118000, 'diff', 88.0, 90.0, -14160, -16, '盒'],
      ['L8', '复方电解质注射液', '500ml · 瓶', '200 瓶', 12800, 'none', 0, 0, 0, 0, '瓶'],
    ]),
  },
];

export const WB_INBOUNDS: WbDoc<WbInbLine>[] = [
  {
    id: 'GR-2026-7001',
    tag: '集团中心仓',
    party: '集团中心仓',
    date: '2026-07-12',
    lines: inbLines([
      ['R1', '注射用头孢曲松钠', '1.0g×10支/盒 · 盒', '80 盒', 128400, 'suggest', '0 盒', 0],
      ['R2', '盐酸氨溴索注射液', '2ml:10mg×10支/盒 · 盒', '150 盒', 34500, 'suggest', '0 盒', 0],
      ['R3', '注射用美罗培南', '0.5g×5支/盒 · 盒', '80 盒', 59000, 'diff', '20 盒', 14750],
    ]),
  },
  {
    id: 'GR-2026-7002',
    tag: '川渝配送中心',
    party: '川渝配送中心',
    date: '2026-07-12',
    lines: inbLines([
      ['R4', '盐酸氨溴索注射液(拆零)', '2ml:10mg · 支', '500 支', 11500, 'suggest', '0 支', 0],
      ['R5', '注射用头孢他啶', '1.0g×10支/盒 · 盒', '150 盒', 150000, 'suggest', '0 盒', 0],
      ['R6', '注射用美罗培南', '0.5g×5支/盒 · 盒', '80 盒', 59000, 'diff', '16 盒', 11800],
      ['R7', '一次性使用输液器', '0.7mm · 支', '500 支', 4000, 'none', '500 支', 4000],
    ]),
  },
];

export const WB_CAND_INB: WbDoc<WbInbLine>[] = [
  {
    id: 'GR-2026-7008',
    tag: '重庆片区仓',
    party: '重庆片区仓',
    date: '2026-07-12',
    lines: inbLines([
      ['C1', '甘露醇注射液', '250ml · 瓶', '300 瓶', 15600, 'none', '300 瓶', 15600],
      ['C2', '复方电解质注射液', '500ml · 瓶', '200 瓶', 12800, 'none', '200 瓶', 12800],
    ]),
  },
  {
    id: 'GR-2026-7011',
    tag: '华中区域仓',
    party: '华中区域仓',
    date: '2026-07-12',
    lines: inbLines([['C3', '注射用美罗培南', '0.5g×5支/盒 · 盒', '40 盒', 29500, 'none', '40 盒', 29500]]),
  },
];

export const WB_CAND_INV: WbDoc<WbInvLine>[] = [
  {
    id: 'INV-2026-9101',
    tag: '重庆医药',
    party: S.cq,
    date: '2026-07-12',
    lines: invLines([
      ['D1', '甘露醇注射液', '250ml · 瓶', '300 瓶', 15600, 'none', 0, 0, 0, 0, '瓶'],
      ['D2', '复方电解质注射液', '500ml · 瓶', '200 瓶', 12800, 'none', 0, 0, 0, 0, '瓶'],
    ]),
  },
  {
    id: 'INV-2026-9102',
    tag: '重庆医药湖南',
    party: S.hn,
    date: '2026-07-12',
    lines: invLines([['D3', '注射用美罗培南', '0.5g×5支/盒 · 盒', '40 盒', 29500, 'none', 0, 0, 0, 0, '盒']]),
  },
];

export const WB_LINKS: WbLink[] = [
  { id: 'g1', inv: ['L1'], inb: ['R1'], ratio: '1 : 1', kind: '1:1' },
  {
    id: 'g2',
    inv: ['L2'],
    inb: ['R2', 'R4'],
    ratio: '1 盒 = 10 支',
    kind: '1:n',
  },
  {
    id: 'g3',
    inv: ['L5', 'L6'],
    inb: ['R5'],
    ratio: '10 支 = 1 盒',
    kind: 'n:1',
  },
  {
    id: 'g4',
    inv: ['L3', 'L7'],
    inb: ['R3', 'R6'],
    ratio: '1 盒 = 5 支',
    kind: 'n:n',
  },
];

/* ---------------- 应付单 ---------------- */

type PlTuple = [string, string, string, number, number, string, string, AdjType?];
const pl = (xs: PlTuple[]) =>
  xs.map(([name, spec, unit, qty, price, inv, gr, lt]) => ({
    name,
    spec,
    unit,
    qty,
    price,
    inv,
    gr,
    lt,
  }));

export const PAYABLES: Payable[] = [
  {
    id: 'AP-2026-0619',
    mg: 'MG-20260712-010',
    sup: S.sc,
    buyer: '集团中心仓 / 川渝配送中心',
    amt: 286400,
    st: 'pushed',
    at: '2026-07-12 14:36',
    creator: null,
    lines: pl([
      ['注射用青霉素钠', '0.24g×10支/盒', '盒', 400, 105, 'INV-2026-8811', 'GR-2026-7001'],
      ['注射用青霉素钠', '0.24g×10支/盒', '盒', 200, 105, 'INV-2026-8811', 'GR-2026-7002'],
      ['葡萄糖注射液', '250ml', '瓶', 3000, 6.2, 'INV-2026-8812', 'GR-2026-7003'],
      ['维生素C注射液', '2ml:0.5g', '支', 4800, 2, 'INV-2026-8813', 'GR-2026-7004'],
      ['注射用兰索拉唑', '30mg×5支/盒', '盒', 560, 132.5, 'INV-2026-8813', 'GR-2026-7005'],
      ['复方氨基酸注射液', '250ml', '瓶', 900, 23.8, 'INV-2026-8814', 'GR-2026-7003'],
      ['甘露醇注射液', '250ml', '瓶', 300, 52, 'INV-2026-8814', 'GR-2026-7008'],
      ['葡萄糖注射液 · 差额调整', '250ml', '项', 1, -420, 'INV-2026-8812', 'ADJ-2026-0881', 'rounding'],
      ['注射用兰索拉唑 · 差额调整', '30mg×5支/盒', '项', 1, -13250, 'INV-2026-8813', 'ADJ-2026-0882', 'price'],
    ]),
  },
  {
    id: 'AP-2026-0612',
    mg: 'MG-20260711-016',
    sup: S.cq,
    buyer: '集团中心仓',
    amt: 152300,
    st: 'posted',
    at: '2026-07-11 10:02',
    creator: '王建国',
    lines: pl([
      ['注射用美罗培南', '0.5g×5支/盒', '盒', 120, 737.5, 'INV-2026-8791', 'GR-2026-6981'],
      ['复方电解质注射液', '500ml', '瓶', 2000, 16, 'INV-2026-8791', 'GR-2026-6982'],
      ['葡萄糖注射液', '500ml', '瓶', 4300, 7.3, 'INV-2026-8792', 'GR-2026-6982'],
    ]),
  },
  {
    id: 'AP-2026-0608',
    mg: 'MG-20260710-014',
    sup: S.gz,
    buyer: '湘黔配送中心',
    amt: 96800,
    st: 'posted',
    at: '2026-07-10 16:44',
    creator: null,
    lines: pl([
      ['维生素C注射液', '2ml:0.5g', '支', 24000, 2.2, 'INV-2026-8766', 'GR-2026-6950'],
      ['甘露醇注射液', '250ml', '瓶', 850, 51.76, 'INV-2026-8767', 'GR-2026-6951'],
    ]),
  },
  {
    id: 'AP-2026-0601',
    mg: 'MG-20260709-011',
    sup: S.mm,
    buyer: '华中区域仓',
    amt: 331500,
    st: 'unpaid',
    at: '2026-07-09 09:18',
    creator: '李欣',
    lines: pl([
      ['注射用兰索拉唑', '30mg×5支/盒', '盒', 800, 132.5, 'INV-2026-8740', 'GR-2026-6921'],
      ['注射用兰索拉唑', '30mg×5支/盒', '盒', 400, 132.5, 'INV-2026-8741', 'GR-2026-6921'],
      ['注射用美罗培南', '0.5g×5支/盒', '盒', 160, 737.5, 'INV-2026-8742', 'GR-2026-6922'],
      ['复方氨基酸注射液', '250ml', '瓶', 1200, 23.8, 'INV-2026-8742', 'GR-2026-6923'],
      ['葡萄糖注射液', '250ml', '瓶', 4500, 6.2, 'INV-2026-8743', 'GR-2026-6923'],
    ]),
  },
  {
    id: 'AP-2026-0594',
    mg: 'MG-20260708-009',
    sup: S.hn,
    buyer: '重庆片区仓',
    amt: 21400,
    st: 'unpaid',
    at: '2026-07-08 11:27',
    creator: null,
    lines: pl([['复方氨基酸注射液', '250ml', '瓶', 899, 23.8, 'INV-2026-8722', 'GR-2026-6890']]),
  },
  {
    id: 'AP-2026-0587',
    mg: 'MG-20260706-005',
    sup: S.cq,
    buyer: '川渝配送中心',
    amt: 448200,
    st: 'paid',
    at: '2026-07-06 15:51',
    creator: '王建国',
    lines: pl([
      ['注射用青霉素钠', '0.24g×10支/盒', '盒', 1800, 105, 'INV-2026-8690', 'GR-2026-6852'],
      ['注射用美罗培南', '0.5g×5支/盒', '盒', 200, 737.5, 'INV-2026-8690', 'GR-2026-6853'],
      ['葡萄糖注射液', '250ml', '瓶', 9000, 6.2, 'INV-2026-8691', 'GR-2026-6854'],
      ['复方电解质注射液', '500ml', '瓶', 3400, 16, 'INV-2026-8692', 'GR-2026-6854'],
    ]),
  },
  {
    id: 'AP-2026-0575',
    mg: 'MG-20260703-002',
    sup: S.sc,
    buyer: '集团中心仓',
    amt: 42000,
    st: 'paid',
    at: '2026-07-03 10:12',
    creator: null,
    lines: pl([['注射用青霉素钠', '0.24g×10支/盒', '盒', 400, 105, 'INV-2026-8655', 'GR-2026-6801']]),
  },
];

/* ---------------- 药品匹配关系（确定性生成，与设计稿一致） ---------------- */

const DRUG_NAMES = [
  '人促红素注射液',
  '硫酸氢氯吡格雷片',
  '注射用头孢他啶',
  '盐酸氨溴索注射液',
  '注射用亚胺培南西司他丁钠',
  '盐酸万古霉素注射液',
  '注射用头孢曲松钠',
  '阿托伐他汀钙片',
  '注射用奥美拉唑钠',
  '盐酸左氧氟沙星注射液',
  '注射用头孢哌酮钠舒巴坦钠',
  '葡萄糖注射液',
  '氯化钠注射液',
  '注射用甲泼尼龙琥珀酸钠',
  '地塞米松磷酸钠注射液',
  '注射用兰索拉唑',
  '盐酸多巴胺注射液',
  '硝酸甘油注射液',
  '注射用头孢唑林钠',
  '盐酸利多卡因注射液',
  '胰岛素注射液',
  '肝素钠注射液',
  '维生素C注射液',
  '注射用美罗培南',
  '甲硝唑注射液',
  '盐酸胺碘酮注射液',
  '前列地尔注射液',
  '注射用尿激酶',
  '依诺肝素钠注射液',
  '氨氯地平片',
];
const DRUG_SUPS = [S.gz, S.cq, S.sc, S.hn, S.mm, '重控股湖南民生药业有限公司'];
const DRUG_BUYERS = ['集团中心仓', '重庆片区仓', '川渝配送中心', '湘黔配送中心', '华中区域仓'];
const SPECS = [
  '0.25g',
  '0.5g',
  '1.0g',
  '2.0g',
  '100mg',
  '250mg',
  '500mg',
  '5ml:50mg',
  '10ml:100mg',
  '2ml:10mg',
  '0.4g',
  '5mg',
  '10mg',
  '20mg',
  '40mg',
  '100ml',
  '250ml',
  '500ml',
];
const PKG = ['×10支/盒', '×1支', '×5支/盒', '×20片/盒', '×100ml/袋', '×250ml/袋', '', '×12粒/板'];
const UNITS = ['盒', '支', '瓶', '袋', '盒'];
const IUNITS = ['支', '盒', '瓶', '袋'];
const SFX = ['', '(进口)', '(原研)', '(集采)', '(基药)'];
const RNUM = [10, 5, 12, 6, 100, 2, 20, 50];

function h(s: string): number {
  let x = 7;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) % 100000;
  return x;
}

function mkEdge(mat: DrugMat, inv: DrugInv, m: number, i: number, seed: number): DrugEdge {
  const ratio = mat.unit === inv.iunit ? '1 : 1' : `1 ${mat.unit} = ${RNUM[seed % RNUM.length]} ${inv.iunit}`;
  return { m, i, ratio, conf: 76 + (seed % 24) };
}

export function buildDrugMapping(): DrugMapping {
  const drugs: Drug[] = DRUG_NAMES.slice()
    .sort((a, b) => a.localeCompare(b, 'zh'))
    .map((name, di) => {
      const c = h(name);
      const gCount = 2 + (c % 3);
      const groups: DrugGroup[] = [];
      for (let g = 0; g < gCount; g++) {
        const pat = (c + g * 7) % 10;
        let mCount = 1;
        let iCount = 1;
        if (pat < 4) [mCount, iCount] = [1, 1];
        else if (pat < 6) [mCount, iCount] = [1, 2];
        else if (pat === 6) [mCount, iCount] = [1, 3];
        else if (pat < 9) [mCount, iCount] = [2, 1];
        else [mCount, iCount] = [1, 0];
        if (c % 9 === 0) [mCount, iCount] = [1, 0];
        const mats: DrugMat[] = [];
        const invs: DrugInv[] = [];
        const edges: DrugEdge[] = [];
        for (let m = 0; m < mCount; m++) {
          mats.push({
            name,
            spec: SPECS[(c + g * 5 + m * 3) % SPECS.length] + PKG[(c + g * 3 + m) % PKG.length],
            unit: UNITS[(c + g + m) % UNITS.length],
          });
        }
        for (let i = 0; i < iCount; i++) {
          invs.push({
            iname: name + SFX[(c + g * 2 + i) % SFX.length],
            supplier: DRUG_SUPS[(c + g * 3 + i * 2) % DRUG_SUPS.length],
            buyer: DRUG_BUYERS[(c + g + i) % DRUG_BUYERS.length],
            ispec: SPECS[(c + g * 7 + i * 5 + 3) % SPECS.length] + PKG[(c + g * 5 + i * 3 + 2) % PKG.length],
            iunit: IUNITS[(c + g + i * 3) % IUNITS.length],
          });
        }
        if (mCount === 1) for (let i = 0; i < iCount; i++) edges.push(mkEdge(mats[0], invs[i], 0, i, c + g * 11 + i));
        else for (let m = 0; m < mCount; m++) edges.push(mkEdge(mats[m], invs[0], m, 0, c + g * 11 + m));
        groups.push({ mats, invs, edges });
      }
      const matCnt = groups.reduce((a, g) => a + g.mats.length, 0);
      const invCnt = groups.reduce((a, g) => a + g.invs.length, 0);
      const matchedMatCnt = groups.reduce((a, g) => a + (g.invs.length > 0 ? g.mats.length : 0), 0);
      const status: DrugStatus = matchedMatCnt === matCnt ? 'full' : matchedMatCnt === 0 ? 'none' : 'partial';
      return {
        id: `d${di}`,
        name,
        groups,
        matCnt,
        invCnt,
        matchedMatCnt,
        status,
      };
    });
  return { drugs, suppliers: DRUG_SUPS };
}
