/** 邮箱采集与识别：示例数据（mock）。页面不直接引用，经 api.ts 取数。 */
import type {
  AuthState,
  DocType,
  EfficiencyFeature,
  Mailbox,
  MailboxSettings,
  MailProvider,
  OAuthScope,
  ProviderId,
  RuleTestRow,
  RulesByBox,
  SourceRule,
} from './types';

/** 授权状态 → 文案（简体中文原文）与色调 */
export const AUTH: Record<AuthState, { label: string; tone: 'green' | 'orange' | 'red' | 'gray' }> = {
  ok: { label: '已授权', tone: 'green' },
  exp: { label: '即将过期', tone: 'orange' },
  bad: { label: '授权失效', tone: 'red' },
  none: { label: '待授权', tone: 'gray' },
};

/** 重新授权后显示的说明 */
export const REAUTH_NOTE = '已重新授权 · 2027-04-13 到期';

export const BOXES: Mailbox[] = [
  { id: 'b1', name: '李 敏', dept: '采购 · 华东 · CN-SH-01', mail: 'li.min@group.example.com', prov: 'Microsoft 365', auth: 'ok', authNote: 'OAuth · 2027-01-08 到期', scope: 'Mail.Read · 收件箱/Invoices', sync: '3 分钟前', n: 612 },
  { id: 'b2', name: '佐藤 健', dept: 'AP · JP-TYO-01', mail: 'k.sato@jp.group.example.com', prov: 'Microsoft 365', auth: 'exp', authNote: '6 天后到期', scope: 'Mail.Read · 全部收件箱', sync: '12 分钟前', n: 438 },
  { id: 'b3', name: 'Anna Keller', dept: 'Einkauf · DE-MUC-01', mail: 'a.keller@de.group.example.com', prov: 'Exchange Server', auth: 'ok', authNote: 'EWS · 服务账户委派', scope: '共享邮箱 rechnungen@', sync: '1 分钟前', n: 905 },
  { id: 'b4', name: 'Mark Ellis', dept: 'AP · US-ATL-01', mail: 'm.ellis@us.group.example.com', prov: 'Google Workspace', auth: 'bad', authNote: '用户已修改密码，令牌被吊销', scope: 'gmail.readonly · label:invoices', sync: '2 天前', n: 377 },
  { id: 'b5', name: '陈 涛', dept: '市场部 · CN-SH-01', mail: 'chen.tao@group.example.com', prov: '—', auth: 'none', authNote: '尚未绑定', scope: '—', sync: '—', n: 0 },
];

export const DOC_TYPES: DocType[] = [
  { key: 'invoice', label: '发票', feat: '含税号、发票号、税额字段；或 XML 主件', act: '识别 → 进入采集与校验' },
  { key: 'contract', label: '合同 / 订单确认', feat: '含 契約書 / Agreement / Vertrag、签署页、条款编号', act: '归档到供应商合同库，关联 PO' },
  { key: 'statement', label: '对账单', feat: '多张发票号列表、期初期末余额', act: '用于对账，不重复采集发票' },
  { key: 'other', label: '其他附件', feat: '送货单、装箱单、证书', act: '作为发票附件挂靠' },
];

export const RULES0: RulesByBox = {
  b1: [
    { from: 'billing@hengli-hydraulic.example.cn', lang: '中文', country: '中国大陆', sellerKw: '恒立液压', poRe: 'PO-45\\d{8}', subject: '发票|开票', fileRe: '*.pdf; *.ofd; *.xml', supCode: 'SUP-0007712', supName: '江苏恒立液压股份有限公司', authReq: 'spf+dkim', docs: { invoice: true, contract: true, statement: true, other: true }, hits: 214 },
  ],
  b2: [
    { from: 'seikyu@takarada-kk.example.jp', lang: '日语', country: '日本', sellerKw: '宝田機械', poRe: 'PO-45\\d{8}', subject: '請求書|ご請求', fileRe: '請求書_*.pdf', supCode: 'SUP-0013397', supName: '株式会社宝田機械', authReq: 'spf+dkim', docs: { invoice: true, contract: true, statement: false, other: true }, hits: 96 },
    { from: '*@nittsu.example.jp', lang: '日语', country: '日本', sellerKw: '日本通運', poRe: 'CT-2026-JP-\\d{3}', subject: '請求', fileRe: '*.pdf', supCode: 'SUP-0013455', supName: '日本通運株式会社', authReq: 'dkim', docs: { invoice: true, contract: false, statement: true, other: true }, hits: 171 },
  ],
  b3: [
    { from: 'rechnung@werner-antrieb.example.de', lang: '德语', country: '德国', sellerKw: 'Werner Antriebstechnik', poRe: 'PO-45\\d{8}', subject: 'Rechnung', fileRe: 'RE-*.pdf; *.xml', supCode: 'SUP-0021004', supName: 'Werner Antriebstechnik GmbH', authReq: 'spf+dkim', docs: { invoice: true, contract: true, statement: true, other: false }, hits: 312 },
  ],
  b4: [
    { from: '*@blueridgesupply.example.com', lang: '英语', country: '美国', sellerKw: 'Blue Ridge Supply', poRe: 'PO-45\\d{8}', subject: 'Invoice', fileRe: 'INV*.pdf', supCode: 'SUP-0030882', supName: 'Blue Ridge Supply LLC', authReq: 'spf+dkim', docs: { invoice: true, contract: false, statement: true, other: true }, hits: 140 },
  ],
  b5: [],
};

export const FEATS: EfficiencyFeature[] = [
  { key: 'xml', label: '结构化主件优先', desc: '邮件含 ZUGFeRD、XRechnung、CFDI XML、数电 XML 时直接解析，PDF 只作呈现件', on: true },
  { key: 'split', label: '多票 PDF 自动拆分', desc: '一封邮件一个 PDF 含多张发票时按版式拆分；跨页发票自动合并', on: true },
  { key: 'zip', label: '压缩包解压', desc: '支持 ZIP / 7z / RAR，递归两层，带密码的压缩包转人工', on: true },
  { key: 'link', label: '正文链接下载', desc: '供应商门户下载链接（白名单域名）自动抓取附件', on: false },
  { key: 'dedupe', label: '重复邮件去重', desc: '同一附件哈希只采集一次，转发链、抄送多人不会重复入账', on: true },
  { key: 'reply', label: '缺失信息自动回复', desc: '缺少 PO 号或税号时，按供应商语言自动回信索取', on: false },
  { key: 'phish', label: '钓鱼与变更账户防护', desc: '未通过 SPF/DKIM、或邮件要求变更收款账户时冻结并通知风控', on: true },
  { key: 'learn', label: '从更正中学习规则', desc: '同一来源被反复人工改判时，建议新增或调整来源规则', on: true },
];

export const PROVIDERS: MailProvider[] = [
  { id: 'ms', name: 'Microsoft 365', how: 'OAuth 2.0 · Graph API Mail.Read' },
  { id: 'g', name: 'Google Workspace', how: 'OAuth 2.0 · gmail.readonly' },
  { id: 'ex', name: 'Exchange Server', how: 'EWS · 服务账户委派或个人授权' },
  { id: 'imap', name: 'IMAP', how: '仅支持应用专用密码，令牌加密存储' },
];

/** 供应商主数据（编码 → 名称） */
export const KNOWN_SUPPLIERS: Record<string, string> = {
  'SUP-0013397': '株式会社宝田機械',
  'SUP-0013455': '日本通運株式会社',
  'SUP-0021004': 'Werner Antriebstechnik GmbH',
  'SUP-0030882': 'Blue Ridge Supply LLC',
  'SUP-0007712': '江苏恒立液压股份有限公司',
};

/** 票面语言选项：取值 → 显示文案（简体中文原文） */
export const LANG_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '日语', label: '日语' },
  { value: '英语', label: '英语' },
  { value: '德语', label: '德语' },
  { value: '中文', label: '中文' },
  { value: '西班牙语', label: '西班牙语' },
  { value: '越南语', label: '越南语' },
  { value: '自动', label: '自动识别' },
];

export const COUNTRY_OPTIONS = ['日本', '美国', '德国', '中国大陆', '墨西哥', '越南'];

export const SENDER_AUTH_OPTIONS: Array<{ value: SourceRule['authReq']; label: string }> = [
  { value: 'spf+dkim', label: '须通过 SPF 与 DKIM' },
  { value: 'dkim', label: '须通过 DKIM' },
  { value: 'none', label: '不校验（不推荐）' },
];

export const LOOKBACK_OPTIONS = ['最近 30 天', '最近 90 天', '仅新邮件'] as const;

/** 绑定向导默认值（当前登录员工） */
export const BIND_DEFAULTS = {
  mail: 'li.min@group.example.com',
  folders: '收件箱 / Invoices；收件箱 / 供应商',
  boxId: 'b1',
};

export const STATS = { attachments30d: 2846, accHit: 97.1, accMiss: 91.4 };

/** 新建来源规则的空白模板 */
export function blankRule(): SourceRule {
  return {
    from: '',
    lang: '自动',
    country: '日本',
    sellerKw: '',
    poRe: '',
    subject: '',
    fileRe: '',
    supCode: '',
    supName: '',
    authReq: 'spf+dkim',
    docs: { invoice: true, contract: false, statement: false, other: false },
    hits: 0,
  };
}

/** OAuth 申请的权限范围（按服务商） */
export function scopesFor(p: ProviderId): OAuthScope[] {
  return p === 'g'
    ? [
        { k: 'gmail.readonly', d: '读取邮件与附件' },
        { k: 'gmail.labels', d: '读取标签以限定范围' },
      ]
    : [
        { k: 'Mail.Read', d: '读取邮件与附件（仅限所选文件夹）' },
        { k: 'offline_access', d: '保持同步，无需每次登录' },
        { k: 'User.Read', d: '读取你的姓名与邮箱地址' },
      ];
}

/** 供应商编码 / 名称与主数据核对结果（简体中文原文，显示时 t()） */
export function supplierCheck(code: string, name: string, known: Record<string, string>): string {
  if (!code) return '填写编码后将与供应商主数据核对';
  const k = known[code];
  if (!k) return '主数据中未找到该编码，保存后需主数据管理员确认';
  if (k === name) return '✓ 编码与名称和主数据一致；命中的邮件将直接归属该供应商，跳过名称相似度匹配';
  return '主数据名称为「' + k + '」，与填写不一致，保存后以主数据为准';
}

/** 用最近 5 封来信模拟测试规则（与设计稿一致，按当前编辑内容生成） */
export function buildTestRows(e: SourceRule): RuleTestRow[] {
  const sub = (s: string) => e.from.replace('*', s) || 'unknown@example.com';
  return [
    {
      from: sub('invoice'),
      subj: e.subject.split('|')[0],
      subjSuffix: '2026年9月分',
      file: (e.fileRe.split(';')[0] || 'file.pdf').replace('*', '0931'),
      res: '发票',
      tone: 'green',
      why: '命中来源与主题；票面含「' + (e.sellerKw || '—') + '」；PO 规则命中 1 处',
    },
    {
      from: sub('sales'),
      subj: '契約更新のご案内',
      file: 'Agreement_2027.pdf',
      res: e.docs.contract ? '合同' : '忽略',
      tone: e.docs.contract ? 'blue' : 'gray',
      why: e.docs.contract ? '含签署页与条款编号，归档到合同库' : '合同类型未启用',
    },
    {
      from: sub('billing'),
      subj: 'Statement Sep',
      file: 'statement_09.xlsx',
      res: e.docs.statement ? '对账单' : '忽略',
      tone: e.docs.statement ? 'blue' : 'gray',
      why: '列出 7 张发票号，均已采集，不重复入库',
    },
    {
      from: 'no-reply@lookalike-' + (e.from.split('@')[1] || 'example.com'),
      subj: '至急：振込先変更のお願い',
      file: 'bank_change.pdf',
      res: '已冻结',
      tone: 'red',
      why: 'SPF 未通过，且内容要求变更收款账户',
    },
    {
      from: sub('ar'),
      subj: 'Re: Fw: 請求書',
      file: '請求書_0931.pdf',
      res: '重复',
      tone: 'gray',
      why: '附件哈希与第 1 封相同，已去重',
    },
  ];
}

export function buildMailboxSettings(): MailboxSettings {
  return {
    boxes: BOXES.map((b) => ({ ...b })),
    rules: JSON.parse(JSON.stringify(RULES0)) as RulesByBox,
    docTypes: DOC_TYPES,
    feats: FEATS.map((f) => ({ ...f })),
    providers: PROVIDERS,
    knownSuppliers: KNOWN_SUPPLIERS,
    stats: STATS,
  };
}
