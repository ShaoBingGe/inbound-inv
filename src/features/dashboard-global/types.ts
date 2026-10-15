/** 全球统一看板 · 领域类型 */

export type RegionKey = 'APAC' | 'EMEA' | 'NA' | 'MEA' | 'LATAM';
export type StageKey = 'collect' | 'taxsync' | 'ap' | 'exp' | 'posted' | 'paid';
export type GroupKey = 'pending' | 'review' | 'posted' | 'paid';
export type FocusKey = GroupKey | 'all';
export type LevelKey = 'region' | 'country' | 'prov' | 'ind';
export type PresetKey = 'geo' | 'ci' | 'ind';
export type ExcTab = 'timeout' | 'err';
/** 'GLOBAL' = 主数据中心全球汇总；否则为国家代码 */
export type Scope = string;
export const GLOBAL_SCOPE = 'GLOBAL';

export type StageMap = Record<StageKey, number>;

/** 可选的数据视角（国家 / 数据中心） */
export interface ScopeCountry {
  code: string;
  /** 简体中文国家名（显示时经 t()） */
  name: string;
  /** 数据中心代码，如 CN-QD */
  dc: string;
  /** 数据中心全称（简体中文原文） */
  dcName: string;
  /** 设计稿视角下拉中默认列出的国家（按此顺序） */
  featured: boolean;
}

/** 最细粒度：国家 × 省/州 × 行业 */
export interface Leaf {
  region: RegionKey;
  regionName: string;
  country: string;
  countryName: string;
  prov: string;
  ind: string;
  n: number;
  cnt: StageMap;
  amt: number;
  amtS: StageMap;
  /** 去年同月同口径数量 / 金额 */
  nly: number;
  amtly: number;
  acc: number;
  accLy: number;
  dur: number;
  durLy: number;
  timeout: number;
  highErr: number;
}

export interface Agg {
  n: number;
  amt: number;
  nly: number;
  amtly: number;
  cnt: StageMap;
  amtS: StageMap;
  acc: number;
  accLy: number;
  dur: number;
  durLy: number;
  timeout: number;
  highErr: number;
}

export interface TreeNode {
  path: string;
  name: string;
  level: LevelKey;
  depth: number;
  stats: Agg;
  kids: TreeNode[];
}

export type FieldStatus = 'fix' | 'tax' | 'ok' | 'lock';

export interface ExcField {
  label: string;
  ocr: string;
  cur: string;
  /** 0 表示漏识 */
  conf: number;
  status: FieldStatus;
}

export interface ExcTiming {
  label: string;
  s: number;
}

/** 需关注的单张发票（识别超时 / 误差率高） */
export interface ExcInvoice {
  id: string;
  countryCode: string;
  country: string;
  sup: string;
  kind: string;
  dur: number;
  errN: number;
  tot: number;
  stage: string;
  why: string;
  timing: ExcTiming[];
  fields: ExcField[];
}

export interface DashboardQuery {
  month: string;
  scope: Scope;
}

export interface DashboardData {
  leaves: Leaf[];
  exceptions: ExcInvoice[];
}

/** 当月同比（趋势最后一个点） */
export interface TrendNow {
  c: number;
  a: number;
  acc: number;
  dur: number;
}

export interface TrendPoint extends TrendNow {
  /** 简体中文月份，如「10月」 */
  m: string;
}

export interface TrendQuery extends DashboardQuery {
  /** 选中的分级节点路径；空为合计 */
  node: string | null;
  now: TrendNow;
}
