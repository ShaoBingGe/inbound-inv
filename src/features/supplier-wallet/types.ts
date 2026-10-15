import type { Tone } from '@/components/ui';

/** 票夹按国家隔离（数据驻留在各自数据中心） */
export type CountryCode = 'CN' | 'JP' | 'DE' | 'US' | 'MX';

export interface WalletCountry {
  code: CountryCode;
  /** 国家名（简体中文原文） */
  name: string;
  /** 数据中心 */
  dc: string;
  /** 本国票夹字段误差率 */
  err: string;
  /** 三单匹配自动通过率 */
  auto: string;
  /** AP 无人工过账率 */
  touchless: string;
  /** 票夹内发票张数 */
  invoiceCount: number;
}

/** 三单匹配状态 */
export type MatchState = 'ok' | 'tol' | 'diff' | 'wait' | 'na';
/** AP 自动化状态 */
export type ApState = 'posted' | 'draft' | 'none' | 'blocked';
/** 费控状态 */
export type ExpState = 'na' | 'linked' | 'wait';
/** 匹配行结果 */
export type LineResult = 'ok' | 'tol' | 'diff' | 'wait';
/** 票夹到下游的路由：有 PO / 无 PO 费控 / 框架合同 */
export type InvoiceRoute = 'PO' | '费控' | '合同';

export interface MatchLine {
  item: string;
  /** PO 数量 × 单价 */
  po: string;
  /** 收货数量 */
  grn: string;
  /** 发票数量 × 单价 */
  inv: string;
  res: LineResult;
}

export interface CorrectionLogEntry {
  at: string;
  field: string;
  before: string;
  after: string;
  source: string;
}

export interface WalletInvoice {
  no: string;
  kind: string;
  date: string;
  amt: string;
  /** [误差字段数, 识别字段数] */
  err: [number, number];
  route: InvoiceRoute;
  m: MatchState;
  ap: ApState;
  ex: ExpState;
  po: string;
  grn: string;
  lines: MatchLine[];
  log: CorrectionLogEntry[];
}

export interface WalletSupplier {
  code: string;
  name: string;
  /** 行业 / 品类 */
  ind: string;
  invs: WalletInvoice[];
}

export interface RouteRule {
  when: string;
  to: string;
  how: string;
}

export interface WalletOverview {
  countries: WalletCountry[];
  routes: RouteRule[];
}

export interface CountrySuppliers {
  country: CountryCode;
  suppliers: WalletSupplier[];
}

/** 页面内对发票状态的本地覆盖（写操作结果） */
export interface InvoiceOverride {
  m?: MatchState;
  ap?: ApState;
  ex?: ExpState;
}

export interface StateLabel {
  label: string;
  tone: Tone;
}

export type DetailTab = 'face' | 'match' | 'ap' | 'exp' | 'log';
