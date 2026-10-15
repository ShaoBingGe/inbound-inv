import type { Tone } from '@/components/ui';

/** 闭环流程中的一个阶段（捕获 → 核验 → 清洗 → 分层入集 → 评测 → 回馈） */
export interface LoopStage {
  label: string;
  value: number;
  /** 数值后的说明，如「条修正」 */
  sub: string;
  desc: string;
  rules: string[];
}

/** 修正来源及其采纳 / 驳回占比（百分比，待核验 = 100 - 采纳 - 驳回） */
export interface CorrectionSource {
  name: string;
  sub: string;
  count: number;
  acceptedPct: number;
  rejectedPct: number;
}

/** 真值优先级 */
export interface TruthRule {
  priority: number;
  source: string;
  condition: string;
  weight: string;
  tone: Tone;
}

/** 冲突裁决规则 */
export interface ConflictRule {
  when: string;
  then: string;
}

export type CorrectionStatus = 'accepted' | 'pending' | 'rejected' | 'dispute';

/** 一条修正记录（含血缘：发票、渠道、核验、清洗、去向） */
export interface CorrectionRecord {
  id: string;
  invoiceId: string;
  country: string;
  channel: string;
  field: string;
  /** 票面原文，不翻译 */
  before: string;
  /** 票面原文，不翻译 */
  after: string;
  who: string;
  trust: number;
  verify: string;
  clean: string;
  to: string;
  toTone: Tone;
  status: CorrectionStatus;
}

/** 入集策略 */
export interface RoutingRule {
  type: string;
  to: string;
  tone: Tone;
  why: string;
}

/** 定期评测记录 */
export interface EvalRun {
  id: string;
  date: string;
  scope: string;
  newSamples: number;
  /** 修正样本上准确率（%） */
  accuracy: number;
  /** 较上期（百分点） */
  delta: number;
  verdict: string;
}

/** 修正最集中的字段 */
export interface HotField {
  label: string;
  count: number;
}

export interface CorrectionDashboard {
  stages: LoopStage[];
  sources: CorrectionSource[];
  truth: TruthRule[];
  conflicts: ConflictRule[];
  records: CorrectionRecord[];
  routing: RoutingRule[];
  evals: EvalRun[];
  hotFields: HotField[];
  /** 近 30 天修正总数（热点字段占比的分母） */
  totalCorrections: number;
}

export interface VerifyResult {
  id: string;
  status: CorrectionStatus;
}

export interface BatchVerifyResult {
  /** 核验通过、转为已采纳的修正 ID */
  accepted: string[];
}
