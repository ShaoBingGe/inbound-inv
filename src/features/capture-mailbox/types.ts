/** 邮箱采集与识别：领域类型 */

export type AuthState = 'ok' | 'exp' | 'bad' | 'none';

/** 员工邮箱（员工各自绑定、各自授权） */
export interface Mailbox {
  id: string;
  /** 员工姓名（主数据，不翻译） */
  name: string;
  /** 部门 · 主体 */
  dept: string;
  mail: string;
  /** 服务商名称（产品名，不翻译；未绑定为 —） */
  prov: string;
  auth: AuthState;
  authNote: string;
  scope: string;
  /** 最近同步（相对时间） */
  sync: string;
  /** 30 天采集附件数 */
  n: number;
}

export type DocKind = 'invoice' | 'contract' | 'statement' | 'other';

/** 附件分类定义 */
export interface DocType {
  key: DocKind;
  label: string;
  /** 判定特征 */
  feat: string;
  /** 处理方式 */
  act: string;
}

export type SenderAuth = 'spf+dkim' | 'dkim' | 'none';

/** 来源规则：来源邮箱 → 识别特征 → 对应供应商 */
export interface SourceRule {
  /** 来源地址或域名（支持 *） */
  from: string;
  /** 票面语言（取值为简体中文原文，显示时 t()） */
  lang: string;
  /** 发生地国家（取值为简体中文原文，显示时 t()） */
  country: string;
  sellerKw: string;
  poRe: string;
  subject: string;
  fileRe: string;
  supCode: string;
  supName: string;
  authReq: SenderAuth;
  docs: Record<DocKind, boolean>;
  hits: number;
}

export type RulesByBox = Record<string, SourceRule[]>;

/** 提升采集效率的功能开关 */
export interface EfficiencyFeature {
  key: string;
  label: string;
  desc: string;
  on: boolean;
}

export type ProviderId = 'ms' | 'g' | 'ex' | 'imap';

export interface MailProvider {
  id: ProviderId;
  name: string;
  how: string;
}

/** OAuth 申请的权限范围 */
export interface OAuthScope {
  k: string;
  d: string;
}

export interface MailboxStats {
  /** 30 天采集附件 */
  attachments30d: number;
  /** 规则命中后识别准确率（%） */
  accHit: number;
  /** 未命中规则时识别准确率（%） */
  accMiss: number;
}

export interface MailboxSettings {
  boxes: Mailbox[];
  rules: RulesByBox;
  docTypes: DocType[];
  feats: EfficiencyFeature[];
  providers: MailProvider[];
  /** 供应商主数据：编码 → 名称（用于核对） */
  knownSuppliers: Record<string, string>;
  stats: MailboxStats;
}

export type TestTone = 'green' | 'blue' | 'gray' | 'red';

/** 用最近邮件测试规则的结果行 */
export interface RuleTestRow {
  from: string;
  /** 邮件主题原文（不翻译） */
  subj: string;
  /** 主题后缀（界面文案，需翻译），如「2026年9月分」 */
  subjSuffix?: string;
  file: string;
  res: string;
  tone: TestTone;
  why: string;
}

export type Lookback = '最近 30 天' | '最近 90 天' | '仅新邮件';

/** 绑定邮箱向导第 2 步填写的内容 */
export interface BindRequest {
  provider: ProviderId;
  mail: string;
  folders: string;
  lookback: Lookback;
}

export interface BindResult {
  /** 绑定成功后对应的员工邮箱 id */
  boxId: string;
  mail: string;
}
