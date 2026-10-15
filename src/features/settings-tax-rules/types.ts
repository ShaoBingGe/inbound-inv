/** 税务规则设置：领域类型 */

export type CountryCode = 'CN' | 'JP' | 'DE' | 'US' | 'BR' | 'IN' | 'SA' | 'MX';

/** 进项处理方式 */
export type Treat = 'credit' | 'partial' | 'cost' | 'wht' | 'none';

/** 规则 / 版本状态 */
export type RuleStatus = 'active' | 'superseded' | 'draft';

export interface RegimeFact {
  k: string;
  v: string;
}

export interface TaxType {
  name: string;
  level: string;
  rate: string;
  treat: Treat;
  cond: string;
  form: string;
}

export interface ReverseCase {
  k: string;
  how: string;
  eff: string;
}

export interface WithholdingItem {
  k: string;
  v: string;
}

export interface TaxRule {
  code: string;
  cat: string;
  text: string;
  param: string;
  eff: string;
  basis: string;
  status: RuleStatus;
}

export interface RuleVersion {
  v: string;
  eff: string;
  change: string;
  impact: string;
  status: RuleStatus;
}

export interface TaxRegime {
  code: CountryCode;
  name: string;
  regime: string;
  ver: string;
  eff: string;
  owner: string;
  cur: string;
  facts: RegimeFact[];
  taxes: TaxType[];
  reverse: ReverseCase[];
  wht: WithholdingItem[];
  kinds: string[];
  rules: TaxRule[];
  versions: RuleVersion[];
}

export type SimTxnType = 'goods' | 'service' | 'xborder' | 'asset';
export type SimUse = 'taxable' | 'exempt' | 'welfare' | 'mixed';

/** 规则模拟输入（假想发票） */
export interface SimInput {
  kind: string;
  type: SimTxnType;
  use: SimUse;
  /** 不含税金额（本币），保留用户输入原文 */
  amt: string;
}

export interface SimLine {
  name: string;
  /** 已格式化的金额，如 "CNY 13,000.00" */
  amt: string;
  treat: Treat;
}

export interface SimNote {
  code: string;
  text: string;
}

export interface SimResult {
  lines: SimLine[];
  notes: SimNote[];
  total: string;
  credit: string;
  cost: string;
  wht: string;
}
