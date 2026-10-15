import type { Tone } from '@/components/ui';

/** 发票所处环节：0 采集中 · 1 已查验 / 税局同步 · 2 审核中 · 3 已入账 · 4 已付款 */
export type StageIdx = 0 | 1 | 2 | 3 | 4;

/** 字段类别（决定更正等级） */
export type FieldGroup = 'id' | 'date' | 'tax' | 'amount' | 'attr' | 'bank';

/** 字段值来源 */
export type FieldSource = 'OCR' | '主数据匹配' | '税局' | '规则' | 'XML';

export interface InvoiceField {
  key: string;
  /** 字段名；uiLabel=false 时为票面原文标签（如 登録番号、Invoice no.），不翻译 */
  label: string;
  uiLabel: boolean;
  /** OCR 原值（v1 快照） */
  ocr: string;
  /** 系统校验后的当前值（未叠加人工更正） */
  cur: string;
  /** 置信度 0–1；0 表示漏识 */
  conf: number;
  group: FieldGroup;
  src: FieldSource;
  /** 影像上的框选位置（百分比）：x, y, w, h */
  box: [number, number, number, number];
}

export interface CorrectionInvoice {
  id: string;
  /** 供应商名称（主数据，不翻译） */
  sup: string;
  country: string;
  /** 国家代码，用于数据隔离（canSeeCountry） */
  countryCode: string;
  kind: string;
  stageIdx: StageIdx;
  /** 标注来源页面 */
  from: string;
  /** 下游单据号（AP 单 / 付款单），采集中为 — */
  doc: string;
  /** 数据权威来源 */
  authority: string;
  hash: string;
  /** 该供应商模板 90 天误差率 */
  tplRate: string;
  fields: InvoiceField[];
  /** 已标注识别有误的字段 key */
  errs: string[];
  /** 复核人找到的真值（预填建议），按字段 key */
  suggest: Record<string, string>;
}

export type ChangeStatus = 'applied' | 'pending';

/** invoice_field_change：只追加，不更新，不删除 */
export interface FieldChange {
  cid: string;
  ver: string;
  field: string;
  before: string;
  after: string;
  source: string;
  etype: string;
  op: string;
  rev: string;
  status: ChangeStatus;
  at: string;
}

export type CompensationStatus = 'running' | 'initiated';

/** compensation_event：下游补偿事件，按 Saga 执行 */
export interface CompensationEvent {
  eid: string;
  type: string;
  steps: string;
  obj: string;
  status: CompensationStatus;
}

export type RuleClass = 'free' | 'review' | 'lock';

export interface CompensationOption {
  title: string;
  desc: string;
  btn: string;
}

export interface FieldRule {
  cls: RuleClass;
  why: string;
  comps: CompensationOption[];
}

export interface CorrectionWorkspace {
  invoices: CorrectionInvoice[];
  /** 按发票 id 的变更日志 */
  logs: Record<string, FieldChange[]>;
  /** 按发票 id 的补偿事件 */
  comps: Record<string, CompensationEvent[]>;
}

export interface FlowStep {
  label: string;
  sub: string;
}

export interface MatrixCell {
  tone: Tone;
  label: string;
  note: string;
}

export interface MatrixRow {
  label: string;
  eg: string;
  cells: MatrixCell[];
}

export interface CompensationType {
  title: string;
  when: string;
  how: string;
}

export interface CorrectionReference {
  stageNames: string[];
  flow: FlowStep[];
  matrixStages: string[];
  matrix: MatrixRow[];
  compTypes: CompensationType[];
  errorTypes: string[];
}

export interface SubmitCorrectionInput {
  invoiceId: string;
  field: string;
  before: string;
  after: string;
  errorType: string;
}

/** 写操作结果：新写入的变更记录，以及（如有）自动生成的补偿事件 */
export interface CorrectionResult {
  change: FieldChange;
  compensation?: CompensationEvent;
}

export interface StartCompensationInput {
  invoiceId: string;
  type: string;
  steps: string;
}
