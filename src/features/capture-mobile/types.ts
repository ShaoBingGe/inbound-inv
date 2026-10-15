import type { Tone } from '@/components/ui';

/** 手机端流程的屏幕：首页 → 拍票 → 识别中 → 确认识别结果 → 完成 */
export type Screen = 'home' | 'cam' | 'run' | 'res' | 'done';

export type IssueKey = 'regno' | 'rate' | 'po';

/** 本单已采集的票据 */
export interface RecentCapture {
  /** 主数据（不翻译） */
  seller: string;
  meta: string;
  amt: string;
  st: string;
  tone: Tone;
}

/** 识别与校验步骤 */
export interface RecognitionStep {
  label: string;
  sub: string;
  ok: boolean;
}

/** 校验发现的问题与纠正建议 */
export interface CaptureIssue {
  k: IssueKey;
  tag: string;
  tone: Tone;
  /** 票面字段名 */
  label: string;
  msg: string;
  /** 票面原值 → 建议值（票面原文，不翻译） */
  from?: string;
  to?: string;
  btn: string;
  /** 需要员工对照票面手工确认 */
  editable?: boolean;
  def?: string;
}

/** 识别字段；fixKey 对应的问题处理后显示 fixedValue（未提供时使用员工确认的 PO 值） */
export interface RecognizedField {
  label: string;
  value: string;
  conf: number;
  fixKey?: IssueKey;
  fixedValue?: string;
}

/** 识别出的发票概要 */
export interface RecognizedInvoice {
  id: string;
  /** 发生地判定、票种 */
  country: string;
  docType: string;
  seller: string;
  amount: string;
  converted: string;
  fxNote: string;
}

export interface CaptureSession {
  claimLabel: string;
  camHint: string;
  recent: RecentCapture[];
  steps: RecognitionStep[];
  invoice: RecognizedInvoice;
  issues: CaptureIssue[];
  fields: RecognizedField[];
  /** PO 输入框初始值（识别结果） */
  poInitial: string;
}

export interface SubmitCapturePayload {
  invoiceId: string;
  corrections: IssueKey[];
  po?: string;
}

export interface SubmitCaptureResult {
  /** 回传给宿主页面的事件名 */
  event: 'invoice.submitted';
  fixCount: number;
}
