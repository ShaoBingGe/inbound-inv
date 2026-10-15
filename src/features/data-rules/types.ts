import type { Tone } from '@/components/ui';

/** 数据识别规则管理：按国家维护 OCR 数据集策略 */
export type CountryCode = 'JP' | 'CN' | 'DE' | 'US' | 'VN' | 'MX' | 'SA' | 'BR';

/** 票种覆盖：[票种, 当前 %, 目标 %] */
export interface CoverageRow {
  label: string;
  cur: number;
  tgt: number;
}

/** 标注字段模式 */
export interface SchemaField {
  key: string;
  /** 是 / 否 */
  required: string;
  format: string;
}

export interface CountryProfile {
  code: CountryCode;
  name: string;
  /** 数据中心 */
  dc: string;
  /** 默认目标样本量 */
  size: number;
  /** 当前样本量 */
  cur: number;
  /** 待回流（高频修正）样本数 */
  pend: number;
  /** 默认回流占比上限（%） */
  cap: number;
  /** 目标正态分布（log₁₀ 金额） */
  mu: number;
  sigma: number;
  /** 高频修正样本集中的金额中心（log₁₀） */
  floodCenter: number;
  /** 未设上限时回流样本占比（0–1） */
  flood: number;
  /** 线上模型字段准确率，如 "96.6%" */
  acc: string;
  model: string;
  /** 最近触发："MM-DD · 原因" */
  trig: string;
  batch: string;
  batchN: number;
  types: CoverageRow[];
  schema: SchemaField[];
}

export type TriggerKey = 'err' | 'tpl' | 'newsup' | 'release' | 'quarter';

export interface TriggerDef {
  key: TriggerKey;
  label: string;
  sub: string;
}

export interface CountryStrategy {
  size: number;
  cap: number;
  trig: Record<TriggerKey, boolean>;
}

export type AgentKey = 'collect' | 'clean' | 'prelabel' | 'qa' | 'balance' | 'eval' | 'gate';

export interface AgentDef {
  key: AgentKey;
  name: string;
  role: string;
  status: string;
  tone: Tone;
  /** 需要人工确认的关口按钮文案；无关口为 null */
  gate: string | null;
}

/** 格式检查项：[检查项, 问题数或指标, 处理] */
export interface CheckItem {
  label: string;
  value: number | string;
  action: string;
}

export type RunModel = 'v4.2-rc1' | 'v4.1' | 'v4.0';
export type RunSplit = 'test' | 'hard' | 'val';

export interface TestRun {
  id: string;
  /** 国家名（中文原文） */
  country: string;
  model: string;
  /** 数据集名（中文原文） */
  split: string;
  n: number;
  /** 字段准确率 % */
  acc: number;
  /** 票级全对率 % */
  full: number;
  /** 平均时长（秒） */
  dur: number;
  /** 较线上（pp） */
  delta: number;
  verdict: string;
}

export interface DatasetRules {
  countries: CountryProfile[];
  strategies: Record<CountryCode, CountryStrategy>;
  triggerDefs: TriggerDef[];
  strata: string[];
  agents: AgentDef[];
  checkItems: CheckItem[];
  runs: TestRun[];
  nextRunSeq: number;
}

export interface StartRunRequest {
  country: CountryCode;
  model: RunModel;
  split: RunSplit;
  seq: number;
}

/** 金额分布（14 个 log₁₀ 区间）与指标 */
export interface Distribution {
  actual: number[];
  expected: number[];
  psi: number;
  skew: number;
  kurt: number;
  ks: number;
}
