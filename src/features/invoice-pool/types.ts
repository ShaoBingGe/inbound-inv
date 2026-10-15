/** 企业票池：领域类型 */

export type CountryCode = 'CN' | 'JP' | 'KR' | 'VN' | 'IN' | 'DE' | 'FR' | 'US' | 'MX' | 'BR';
/** 票面原文语言 */
export type DocLang = 'zh' | 'ja' | 'ko' | 'vi' | 'en' | 'de' | 'fr' | 'es' | 'pt';
/** 智能翻译目标语言 */
export type TranslateTarget = 'zh' | 'en';

export type InvoiceStatus = 'review' | 'posted' | 'paid';
/** 标记分类：any 需关注 / rev 有逆向单据 / due 30 天内到期 */
export type FlagKey = '' | 'any' | 'rev' | 'due';
export type ReviewDoc = 'AP单' | '费控单';
export type Period = '2026-08' | '2026-09' | '2026-10' | 'q';
/** 状态卡片 */
export type StatusKey = 'all' | InvoiceStatus | 'due' | 'flag';

/** 票面字段标签键 */
export type LabelKey =
  | 'no'
  | 'date'
  | 'seller'
  | 'buyer'
  | 'taxId'
  | 'addr'
  | 'po'
  | 'item'
  | 'qty'
  | 'price'
  | 'amount'
  | 'net'
  | 'tax'
  | 'total'
  | 'pay'
  | 'due'
  | 'bank'
  | 'title';
export type DocLabels = Record<LabelKey, string>;

/** 供应商行项目：原文、中文、英文、单价 */
export interface SupplierItem {
  orig: string;
  zh: string;
  en: string;
  price: number;
}

export interface Supplier {
  name: string;
  code: string;
  industry: string;
  addr: string;
  taxId: string;
  rate: number;
  review: 'AP' | 'EXP';
  noPrefix: string;
  items: SupplierItem[];
}

/** 国家 / 税制配置（字符串为简体中文原文或票面原文，显示时按需 t()） */
export interface CountryConfig {
  code: CountryCode;
  name: string;
  lang: DocLang;
  cur: string;
  sym: string;
  dp: number;
  /** 折算 CNY 汇率 */
  cny: number;
  dc: string;
  ruleVer: string;
  regime: string;
  kinds: string[];
  /** 票面标题（原文） */
  title: string[];
  /** 票面标题译文 [中文, English] */
  titleT: [string, string][];
  taxName: string;
  truth: string;
  ded: string;
  filing: string;
  archive: string;
  treat: string;
  treatPaid: string;
  revMech: string;
  revHow: string;
  rules: [string, string][];
  /** 付款条件 [原文, 中文, English] */
  pay: [string, string, string];
  payDays: number;
  bank: string;
  ch: string[];
  sups: Supplier[];
}

/** 列表与切换器用的国家摘要 */
export type CountryInfo = Omit<CountryConfig, 'sups' | 'ch'>;

export interface Entity {
  code: string;
  name: string;
  country: CountryCode;
  weight: number;
  /** 票面上的法定名称 */
  legalName: string;
  buyerTaxId: string;
}

export interface OrgCatalog {
  countries: CountryInfo[];
  entities: Entity[];
}

export interface LineItem {
  item: SupplierItem;
  qty: number;
}

export interface Reversal {
  kind: string;
  no: string;
  amt: number;
  tax: number;
  date: string;
  effect: string;
}

export interface InvoiceRow {
  id: string;
  c: CountryCode;
  entity: string;
  month: string;
  sup: string;
  supCode: string;
  ind: string;
  supAddr: string;
  supId: string;
  rate: number;
  kind: string;
  kindIdx: number;
  no: string;
  date: string;
  items: LineItem[];
  net: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  review: ReviewDoc;
  doc: string;
  channel: string;
  po: string;
  due: string;
  flag: string;
  flagKey: FlagKey;
  revs: Reversal[];
  pages: number;
  /** 识别更正处数 */
  err: number;
}

export interface OrgQuery {
  country: CountryCode;
  /** 企业代码，'ALL' 为该国全部企业 */
  entity: string;
  period: Period;
}

export interface PoolFilters {
  status: StatusKey;
  q: string;
  kind: string;
  review: string;
  channel: string;
  ind: string;
  amtMin: string;
  amtMax: string;
  dFrom: string;
  dTo: string;
  flag: string;
}

/** 生命周期节点 */
export interface LifeStep {
  label: string;
  at: string;
  who: string;
  state: 'done' | 'now' | 'todo';
}

export interface ImageItem {
  name: string;
  qty: string;
  price: string;
  amt: string;
}

/** 影像页（票面原文，不翻译） */
export interface ImagePageBase {
  title: string;
  pageLabel: string;
  noL: string;
  no: string;
  dateL: string;
  date: string;
  poL: string;
  po: string;
}
export interface ImageMainPage extends ImagePageBase {
  isMain: true;
  sellerL: string;
  seller: string;
  addrL: string;
  sellerAddr: string;
  taxIdL: string;
  sellerId: string;
  buyerL: string;
  buyer: string;
  buyerId: string;
  itemL: string;
  qtyL: string;
  priceL: string;
  amountL: string;
  items: ImageItem[];
  netL: string;
  net: string;
  taxL: string;
  tax: string;
  totalL: string;
  total: string;
  payL: string;
  pay: string;
  bankL: string;
  bank: string;
}
export interface ImageTextPage extends ImagePageBase {
  isMain: false;
  textTitle: string;
  lines: string[];
}
export type ImagePage = ImageMainPage | ImageTextPage;

export interface InvoiceDetail {
  row: InvoiceRow;
  country: CountryInfo;
  entity: Entity;
  steps: LifeStep[];
  pages: ImagePage[];
  hash: string;
  fileName: string;
}

/**
 * 识别数据行。
 * - field：票面字段，k/v 为原文（不翻译），tk/tv 为智能翻译结果
 * - item：行项目，k 为原文品名，tv 为译名
 * - system：中台系统字段，k/v 为简体中文界面文字（经 t() 显示）
 */
export interface DataRow {
  kind: 'field' | 'item' | 'system';
  k: string;
  tk: string;
  v: string;
  tv: string;
  cls: '' | 'mono' | 'num';
}
export interface DataSection {
  title: string;
  rows: DataRow[];
}
export interface RecognizedData {
  srcLang: DocLang;
  target: TranslateTarget;
  sections: DataSection[];
}
