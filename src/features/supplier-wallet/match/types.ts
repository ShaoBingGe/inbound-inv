import type { CountryCode } from '../types';

/* ================= 匹配组看板（发票匹配 · 生成应付单） ================= */

/** 引擎对匹配组的处理建议：自动确认 / 人工复核 / 冻结差异 / 已确认 */
export type Verdict = 'auto' | 'review' | 'block' | 'confirmed';
/** 看板分区：未完全匹配 / 已完全匹配 / 已确认匹配 */
export type Zone = 'manual' | 'auto' | 'done';
/** 卡片上被强调的推荐操作 */
export type RecAction = 'adjust' | 'manual' | 'confirm' | 'none';

/** 匹配组（Match Group）：一次勾稽的业务单元，支持 1:1 / 1:n / n:1 / n:n */
export interface MatchGroup {
  /** 匹配组编号，如 MG-20260712-019 */
  mg: string;
  /** 发票号（多张时为「INV-… 等 2 张」） */
  inv: string;
  /** 供应商（开票方，主数据） */
  sup: string;
  /** 购买入库组织（主数据） */
  buyer: string;
  /** 票单关系，如「1票:3单」 */
  rel: string;
  invDocs: number;
  /** 发票明细行数（品规数） */
  invCats: number;
  invAmt: number;
  inbDocs: number;
  inbMats: number;
  inbAmt: number;
  /** 命中的匹配策略（简体中文原文） */
  strategy: string;
  /** 单位换算比例 */
  ratio: string;
  /** 单价 / 数量 / 金额偏差（%） */
  pv: number;
  qv: number;
  av: number;
  /** 吻合度 / 置信度（%） */
  fit: number;
  conf: number;
  /** 税率是否一致 */
  tax: boolean;
  /** 已确认时生成的应付单号 */
  ap?: string;
  confirmed?: boolean;
  /** 手工新增的匹配组 */
  manual?: boolean;
}

/** 匹配规则：单价 / 数量容差与自动确认阈值（%） */
export interface MatchTolerance {
  priceTol: number;
  qtyTol: number;
  autoFit: number;
}

/** 手工新增、尚未保存匹配结果的匹配组（匹配中） */
export interface DraftGroup {
  id: string;
  invDocs: string[];
  inbDocs: string[];
  invAmt: number;
  inbAmt: number;
}

export interface SupplierOption {
  name: string;
  /** 集团内部供应商 */
  internal: boolean;
}

export interface MatchBoardFilter {
  /** 时间区间（选项值） */
  range: string;
  /** 购买入库组织，'all' 为全部 */
  buyer: string;
  /** 供应商，'all' 为全部 */
  supplier: string;
}

/** 三单匹配概况：供应商票夹顶部流程导航使用 */
export interface MatchSummary {
  /** 未完全匹配 / 已完全匹配（待确认）/ 已确认的匹配组数 */
  manual: number;
  auto: number;
  done: number;
  /** 手工新增、尚在匹配中的组 */
  drafts: number;
  unmatchedInvoices: number;
  pendingInbounds: number;
  payables: number;
  /** 药品匹配关系知识库：物料数与匹配率（%） */
  drugs: number;
  drugRate: number;
}

export interface MatchBoardData {
  country: CountryCode;
  groups: MatchGroup[];
  drafts: DraftGroup[];
  tolerance: MatchTolerance;
  buyers: string[];
  suppliers: SupplierOption[];
  /** 税务机关同步的发票总数 */
  syncTotal: number;
  unmatchedInvoices: number;
  pendingInbounds: number;
  payables: number;
}

/** 匹配任务对外暴露的三态：队列中 / 向量化中 / 匹配中（stage 0 / 1 / 2–3） */
export type RunPhase = 'idle' | 'sync' | 'processing' | 'complete';

/** 匹配引擎批处理的执行状态（前端轮询） */
export interface MatchRun {
  phase: RunPhase;
  syncNow: number;
  syncTotal: number;
  /** 处理中的匹配组 → 当前阶段（0 数据情况分析 … 3 匹配结果展示） */
  stages: Record<string, number>;
  /** 已处理完成、已分发到看板分区的匹配组 */
  done: string[];
}

/** 新增匹配组弹窗里的候选单据 */
export interface PoolLine {
  lid: string;
  name: string;
  spec: string;
  amt: number;
}
export interface PoolDoc {
  id: string;
  /** 发票为供应商，入库单为入库组织（主数据） */
  party: string;
  lines: PoolLine[];
}
export interface MatchPool {
  inv: PoolDoc[];
  inb: PoolDoc[];
}

/** 行匹配状态 */
export type DocLineState = 'unmatched' | 'partial' | 'matched';

/** 未匹配发票 / 待匹配入库单明细 */
export interface PendingLine {
  name: string;
  spec: string;
  /** 发票：数量；入库单：入库数量 */
  qty: string;
  /** 入库余额（仅入库单） */
  bal?: string;
  /** 单价（仅发票） */
  price?: number;
  /** 税率（仅发票） */
  tax?: string;
  amt: number;
  st: DocLineState;
}
export interface PendingDoc {
  id: string;
  party: string;
  date: string;
  /** 单据状态（仅发票） */
  status?: DocLineState;
  lines: PendingLine[];
}

/** 调整策略（匹配口径） */
export type TolMode = 'pct' | 'abs';
export type NoQtyStrategy = 'merge' | 'prorate' | 'separate' | 'offset';
export interface StrategyForm {
  taxBasis: 'gross' | 'net';
  amtMode: TolMode;
  amtPct: number;
  amtAbs: number;
  qtyMode: TolMode;
  qtyPct: number;
  qtyAbs: number;
  priceMode: TolMode;
  pricePct: number;
  priceAbs: number;
  fxOn: boolean;
  fxRule: 'invoiceDate' | 'fixed';
  unitConv: 'exact' | 'convert';
  blueInv: boolean;
  blueStrategy: NoQtyStrategy;
  redInv: boolean;
  redStrategy: NoQtyStrategy;
}

/* ================= 手工匹配工作台 ================= */

/** 引擎给出的行建议：建议匹配 / 匹配有差异 / 无法匹配 */
export type LineHint = 'suggest' | 'diff' | 'none';
export type LineFilter = 'all' | LineHint;
/** 连线两端的明细行数关系 */
export type LinkKind = '1:1' | '1:n' | 'n:1' | 'n:n';

export interface WbInvLine {
  id: string;
  name: string;
  spec: string;
  qty: string;
  unit: string;
  amt: number;
  st: LineHint;
  /** 金额 / 数量吻合度（%） */
  amtM: number;
  qtyM: number;
  /** 与入库侧的金额 / 数量差 */
  amtDiff: number;
  qtyDiff: number;
}
export interface WbInbLine {
  id: string;
  name: string;
  spec: string;
  qty: string;
  amt: number;
  st: LineHint;
  /** 入库余额（剩余可匹配量 / 金额） */
  bal: string;
  balAmt: number;
}
export interface WbDoc<L> {
  id: string;
  /** 简称（主数据） */
  tag: string;
  /** 供应商或收货仓（主数据） */
  party: string;
  date: string;
  lines: L[];
}
export interface WbLink {
  id: string;
  inv: string[];
  inb: string[];
  ratio: string;
  kind: LinkKind;
}

/** 差额单类型：入库调价单 / 退货单 / 尾差 / 折让 */
export type AdjType = 'price' | 'return' | 'rounding' | 'discount';
export interface AdjDoc {
  id: string;
  type: AdjType;
  name: string;
  invId: string;
  lid: string;
  amt: number;
}

export interface Workbench {
  mg: string;
  pairFrom: string;
  pairTo: string;
  /** 已推送应付，不可修改 */
  locked: boolean;
  apNo?: string;
  invoices: WbDoc<WbInvLine>[];
  inbounds: WbDoc<WbInbLine>[];
  /** 可添加的候选发票 / 入库单 */
  candInv: WbDoc<WbInvLine>[];
  candInb: WbDoc<WbInbLine>[];
  links: WbLink[];
  adjDocs: AdjDoc[];
  savedAt?: string;
}

/* ================= 应付单查询 ================= */

export type PayableStatus = 'pushed' | 'posted' | 'unpaid' | 'paid';
export interface PayableLine {
  name: string;
  spec: string;
  unit: string;
  qty: number;
  price: number;
  /** 来源发票 / 入库单（或差额单）号 */
  inv: string;
  gr: string;
  /** 差额行类型；普通行为入库单 */
  lt?: AdjType;
}
export interface Payable {
  id: string;
  mg: string;
  sup: string;
  buyer: string;
  amt: number;
  st: PayableStatus;
  /** 2026-07-12 14:36 */
  at: string;
  /** 创建人；null 为系统自动下推 */
  creator: string | null;
  lines: PayableLine[];
}

/* ================= 药品匹配关系 ================= */

export interface DrugMat {
  name: string;
  spec: string;
  unit: string;
}
export interface DrugInv {
  iname: string;
  supplier: string;
  buyer: string;
  ispec: string;
  iunit: string;
}
export interface DrugEdge {
  m: number;
  i: number;
  ratio: string;
  conf: number;
}
export interface DrugGroup {
  mats: DrugMat[];
  invs: DrugInv[];
  edges: DrugEdge[];
}
export type DrugStatus = 'full' | 'partial' | 'none';
export interface Drug {
  id: string;
  name: string;
  groups: DrugGroup[];
  matCnt: number;
  invCnt: number;
  matchedMatCnt: number;
  status: DrugStatus;
}
export interface DrugMapping {
  drugs: Drug[];
  suppliers: string[];
}
