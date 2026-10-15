/** H5 页面采集（发票导入窗口）领域类型 */

/** ISO 国家代码；'UNK' 表示发生地待归属 */
export type GeoCode = string;

/** 双语文案（中文 / 英文），用于国家说明与税种 */
export interface Localized {
  zh: string;
  en: string;
}

/** 识别能力：full 税局直连 · ocr 有识别 · none 暂无识别 */
export type RecognitionTier = 'full' | 'ocr' | 'none';

/** 国家条目：名称、索引、币种、汇率、税种/税率、特殊说明 */
export interface CountryMeta {
  zh: string;
  en: string;
  es?: string;
  ar?: string;
  /** 拼音首字母（中文 / 阿拉伯语界面下的索引） */
  idx?: string;
  currency: string;
  /** 币种中文名 */
  currencyCn: string;
  /** 1 单位原币折合人民币 */
  cny: number;
  tier: RecognitionTier;
  tax: string | Localized;
  note?: Localized;
}

export type FieldKey = 'kind' | 'no' | 'date' | 'seller' | 'sellerTax' | 'net' | 'tax' | 'verify' | 'rateClass';
/** 字段来源（简体中文原文，显示时经 t()） */
export type FieldSource = 'OCR' | '税局' | '人工' | '推算';

export interface FieldDef {
  label: string;
  key: FieldKey;
  src: FieldSource;
}

/** 各国录入配置 */
export interface CountryDetail {
  emptyHint: string;
  lockNote: string;
  fields: FieldDef[];
}

/** 缺失项（与内置 MSG 词条同名） */
export type MissingKey = 'tax' | 'sellerTax' | 'seller' | 'no' | 'date' | 'amt' | 'noInvoice';
export type FlagKey = 'needPax' | 'dup' | 'langKR' | 'ambNL' | 'twoInOne';
export type VerifyKey = 'verifiedFull' | 'verified';

export interface InvoiceFlag {
  k: FlagKey;
  a?: string;
}

export interface InvoiceRow {
  id: number;
  c: GeoCode;
  kind: string;
  seller: string;
  no: string;
  date: string;
  amt: number;
  net: number | null;
  tax: number | null;
  sellerTax: string;
  rateClass?: string;
  attach: number;
  missing: MissingKey[];
  flag: InvoiceFlag | null;
  verify?: VerifyKey;
  isNew?: boolean;
}

/** 校验项 */
export type CheckKey = 'img' | 'geo' | 'dup' | 'auth' | 'tid' | 'sum' | 'cur' | 'buyer' | 'req';
/** pass 通过 | fix 可自动纠正 | warn 提示 | fail 不通过 | lock 以税局为准、不得更正 */
export type CheckStatus = 'pass' | 'fix' | 'warn' | 'fail' | 'lock';
/** 运行时状态：fix 被采纳后为 fixed */
export type CheckState = CheckStatus | 'fixed';
/** 可自动纠正的字段 */
export type FixField = 'tax' | 'sellerTax' | 'amt';
export type FixValue = string | number | null;

export interface CheckDef {
  key: CheckKey;
  st: CheckStatus;
  /** 简体中文原文 */
  msg: string;
  field?: FixField;
  from?: FixValue;
  to?: FixValue;
}

/** 修正记录（修正前 → 修正后）。field / src 为简体中文原文 */
export interface CorrectionLog {
  id: number;
  field: string;
  before: string;
  after: string;
  src: string;
  at: string;
}

/** 手机端演示票据 */
export interface DemoDoc {
  seller: string;
  kind: string;
  amt: number;
  tax: number | null;
  askTax?: boolean;
}

/** 一次导入会话（报销单）的全部数据 */
export interface CaptureSession {
  reportNo: string;
  /** 本位币国家 */
  localCountry: GeoCode;
  /** 是否显示折算本位币 */
  showConversion: boolean;
  entities: Record<string, string>;
  pool: Record<GeoCode, CountryMeta>;
  unknown: CountryMeta;
  detail: Partial<Record<GeoCode, CountryDetail>>;
  rows: InvoiceRow[];
  checks: Record<number, CheckDef[]>;
  /** 票据 → 已匹配的费用明细（简体中文原文） */
  matched: Record<number, string>;
  demo: Partial<Record<GeoCode, DemoDoc>>;
  log: CorrectionLog[];
  /** 已启用的发生地 */
  active: GeoCode[];
  /** 默认勾选的票据 */
  checked: number[];
  /** 默认选中的发生地 */
  sel: GeoCode;
}

/** 手机拍票会话阶段 */
export type QrStage = 'waiting' | 'cam' | 'result' | 'sent';
