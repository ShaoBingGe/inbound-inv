/** 税务统计看板 · 领域类型 */

export type CountryCode = 'CN' | 'JP' | 'DE' | 'US' | 'BR' | 'IN' | 'SA' | 'MX';
/** GLOBAL = 主数据中心全球汇总（折算 CNY） */
export type TaxScope = 'GLOBAL' | CountryCode;
export type TaxPeriod = '2026-09' | '2026-Q3' | '2026';
export type CountrySort = 'net' | 'pend' | 'risk';

/** 进项税处理阶段 */
export type TaxStateId = 'capture' | 'pending' | 'creditable' | 'filed' | 'nonCreditable' | 'reversed';

export interface TaxBoardQuery {
  scope: TaxScope;
  period: TaxPeriod;
}

/** 国家 / 法人维度统计。金额单位：CNY 万 */
export interface CountryTaxRow {
  code: CountryCode;
  name: string;
  regime: string;
  entities: string;
  /** 进项税净额（已按期间放大） */
  net: number;
  /** 同比 % */
  yoy: number;
  /** 逆向冲减（已按期间放大） */
  rev: number;
  /** 待认证 / 待匹配张数 */
  pendingCount: number;
  /** 待认证 / 待匹配税额 */
  pendingAmount: number;
  /** 申报期描述 */
  filingPeriod: string;
  /** 申报进度 % */
  filing: number;
  /** 风险发票张数 */
  riskCount: number;
}

export interface TaxStateSlice {
  id: TaxStateId;
  label: string;
  /** 占毛额比例 0–1 */
  share: number;
  /** 税额（CNY 万） */
  amount: number;
  count: number;
}

export interface TaxTypeSlice {
  name: string;
  sub: string;
  /** 税额（CNY 万） */
  amount: number;
  /** 可抵扣 / 不可抵扣 / 代扣 占比 0–1 */
  creditable: number;
  nonCreditable: number;
  withheld: number;
}

export interface TaxTotals {
  gross: number;
  net: number;
  rev: number;
  pendingAmount: number;
  pendingCount: number;
  riskCount: number;
  /** 净额加权同比 % */
  yoy: number;
}

export interface TaxTrend {
  /** 月份标签（中文原文，显示时 t()） */
  months: string[];
  /** 本年净额（CNY 万） */
  current: number[];
  /** 去年同期（同口径） */
  lastYear: number[];
  /** 逆向冲减 */
  reversed: number[];
}

export interface TaxRisk {
  name: string;
  sub: string;
  count: number;
  /** 涉及税额（CNY 万） */
  amount: number;
  action: string;
}

/** 视角币种：全球汇总为 null（显示 CNY 万 / 亿） */
export interface LocalCurrency {
  symbol: string;
  /** CNY → 本币 */
  scale: number;
}

export interface TaxBoardData {
  scope: TaxScope;
  period: TaxPeriod;
  scopeName: string;
  currency: LocalCurrency | null;
  totals: TaxTotals;
  states: TaxStateSlice[];
  byTax: TaxTypeSlice[];
  countries: CountryTaxRow[];
  trend: TaxTrend;
  risks: TaxRisk[];
}

export interface DrillInvoice {
  no: string;
  country: string;
  supplier: string;
  tax: string;
  /** 票面金额原文 */
  amount: string;
  period: string;
  reason: string;
}

export interface TaxDrillQuery extends TaxBoardQuery {
  state: TaxStateId;
}
