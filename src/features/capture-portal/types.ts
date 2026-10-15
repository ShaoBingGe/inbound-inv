import type { Tone } from '@/components/ui';

/** 演示供应商（门户为供应商登录后的视角，演示时可切换） */
export type SupplierKey = 'DE' | 'JP' | 'US';

/** 供应商对字段的更正权限：可直接更正 / 可标注买方复核 / 不得更正 */
export type FieldRight = 'own' | 'review' | 'lock';

export interface RecognizedField {
  key: string;
  /** 票面字段名（简体中文或原文） */
  label: string;
  /** 系统识别值 */
  value: string;
  /** 置信度 0–1；0 表示未识别 */
  conf: number;
  right: FieldRight;
  why: string;
}

export interface PortalInvoice {
  no: string;
  date: string;
  amt: string;
  po: string;
  /** 当前环节在 STEPS 中的下标 */
  stage: number;
  /** [识别错误字段数, 字段总数] */
  err: [number, number];
  fields: RecognizedField[];
}

export interface CorrectionRequest {
  id: string;
  title: string;
  inv: string;
  body: string;
  /** 补偿方式 */
  comp: string;
  due: string;
  /** 主操作按钮文案 */
  cta: string;
}

export interface SupplierPortal {
  key: SupplierKey;
  name: string;
  code: string;
  country: string;
  buyer: string;
  submitted: string;
  amount: string;
  err: string;
  avg: string;
  unpaid: string;
  payDay: string;
  einv: string;
  tips: string[];
  /** 近 6 个月识别错误率（%） */
  trend: number[];
  trendNote: string;
  invs: PortalInvoice[];
  reqs: CorrectionRequest[];
}

export interface CorrectionRule {
  label: string;
  tone: Tone;
  what: string;
  how: string;
}

export interface SupplierOption {
  value: SupplierKey;
  label: string;
}

/** 供应商对更正请求的处理结果 */
export type RequestAction = 'ok' | 'dispute';

export interface FieldMark {
  field: string;
  suggested: string;
}

/** 门户页面一次取回的数据 */
export interface PortalView {
  supplier: SupplierPortal;
  /** 演示供应商切换器 */
  suppliers: SupplierOption[];
  /** 处理环节（进度条） */
  steps: string[];
  /** 趋势图月份标签 */
  months: string[];
  rules: CorrectionRule[];
}
