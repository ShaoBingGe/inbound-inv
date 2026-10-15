import type { Tone } from '@/components/ui';

/** 示例发票键（与设计稿一致：中国大陆 / 日本 / 德国 / 美国 / 巴西） */
export type SampleKey = 'cn' | 'jp' | 'de' | 'us' | 'br';

/** 生命周期节点状态：已完成 / 当前 / 未发生 / 逆向事件 */
export type StepState = 'done' | 'cur' | 'todo' | 'rev';

export interface LifecycleFact {
  /** 指标名（界面文案，经 t()） */
  k: string;
  v: string;
  /** 正向指标（绿色显示，如可抵扣金额） */
  good?: boolean;
}

export interface LifecycleStep {
  state: StepState;
  at: string;
  who: string;
}

export interface ReverseDoc {
  kind: string;
  no: string;
  line: string;
  effect: string;
  st: string;
  tone: Tone;
  link: string;
}

export interface ReverseInfo {
  /** 本国逆向机制说明 */
  mech: string;
  origLine: string;
  docs: ReverseDoc[];
  /** 无逆向单据时的冲减方式说明 */
  how?: string;
  gross: string;
  reduced: string;
  net: string;
  netTax: string;
  linkRule: string;
}

export interface TaxLine {
  name: string;
  rate: string;
  amt: string;
  treat: string;
  st: string;
  tone: Tone;
}

export interface KeyValue {
  k: string;
  v: string;
}

export interface InvoiceLifecycle {
  key: SampleKey;
  /** 路由中的发票 id */
  id: string;
  /** 国家 / 数据范围代码（用于 canSeeCountry） */
  countryCode: string;
  label: string;
  country: string;
  regime: string;
  kind: string;
  sup: string;
  no: string;
  ch: string;
  entity: string;
  dc: string;
  ruleVer: string;
  status: string;
  statusTone: Tone;
  facts: LifecycleFact[];
  steps: LifecycleStep[];
  rev: ReverseInfo;
  taxes: TaxLine[];
  rules: KeyValue[];
}

export interface RouteStep {
  k: string;
  v: string;
  why: string;
}

export interface MatrixRow {
  k: string;
  /** 依次为 中国大陆 / 日本 / 德国 / 美国 / 巴西 */
  cells: string[];
}

/* ---------- 影像与识别数据 ---------- */

/** 票面原文语言 */
export type DocLang = 'zh' | 'ja' | 'en' | 'de' | 'pt';
/** 智能翻译目标语言 */
export type TargetLang = 'zh' | 'en';
/** 翻译对：[中文, English] */
export type TransPair = [string, string];

export interface DocLineItem {
  name: string;
  qty: string;
  price: string;
  amt: string;
}

interface DocPageBase {
  title: string;
  pageLabel: string;
  noL: string;
  no: string;
  dateL: string;
  date: string;
  poL: string;
  po: string;
}

export interface DocMainPage extends DocPageBase {
  kind: 'main';
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
  items: DocLineItem[];
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

export interface DocTextPage extends DocPageBase {
  kind: 'text';
  textTitle: string;
  lines: string[];
}

export type DocPage = DocMainPage | DocTextPage;

export interface DocRow {
  /** 票面原文字段名（不翻译） */
  k: string;
  /** 为 true 时 k 是界面文案（如「折算 CNY」），需要 t() */
  uiKey?: boolean;
  /** 字段名译文 */
  tk?: TransPair;
  /** 票面原文值（不翻译） */
  v: string;
  /** 值的译文 */
  tv?: TransPair;
  cls?: 'mono' | 'num';
}

export interface DocSection {
  /** 分组标题（界面文案） */
  title: string;
  rows: DocRow[];
}

export interface InvoiceDocument {
  lang: DocLang;
  /** 原文语言名（中文 / 日本語 / English / Deutsch / Português） */
  langName: string;
  pages: DocPage[];
  sections: DocSection[];
}

/* ---------- 接口返回 ---------- */

export interface SampleOption {
  key: SampleKey;
  id: string;
  label: string;
  countryCode: string;
}

export interface LifecycleDetail {
  /** 路由传入的 id（原样显示在面包屑） */
  requestedId: string;
  /** id 是否命中；未命中时回落到默认示例 */
  matched: boolean;
  invoice: InvoiceLifecycle;
  document: InvoiceDocument;
  /** 生命周期节点名 */
  stepLabels: string[];
  route: RouteStep[];
  matrix: MatrixRow[];
}
