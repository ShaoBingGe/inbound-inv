/** 采集渠道与校验策略：示例数据（与设计稿 Channels.dc.html 一致） */
import type {
  Channel,
  ChannelKey,
  ChannelsConfig,
  CheckRule,
  EmbedEvent,
  EmbedParam,
  EmbedTabKey,
  FamKey,
  Family,
  OrderStep,
  PolicyKey,
  PolicyMatrix,
  PolicyStyle,
  Preset,
  PresetKey,
  RuleAction,
  SampleTicket,
  SubOverrides,
  SwitchRule,
  TaxonomyRow,
  LaneItem,
} from './types';
import type { Tone } from '@/components/ui';

const steps = (xs: Array<[FamKey, string, string]>): OrderStep[] => xs.map(([fam, label, sub]) => ({ fam, label, sub }));
const sw = (xs: Array<[string, string]>): SwitchRule[] => xs.map(([when, then]) => ({ when, then }));

export const CHANNELS: Channel[] = [
  {
    k: 'tax', name: '税局同步', short: '税局同步', sub: '数电票池 · SdI · SAT · SEFAZ · ZATCA · IRP · KSeF · NTS', form: '结构化', formTone: 'green',
    who: '系统定时', share: '38%', stp: '93%', err: '0.4%', preset: 'quick',
    logic: '票面来自税局，不做 OCR；真值即税局数据，重点放在供应商归属、重复与业务合规。',
    order: steps([
      ['gov', '税局状态与字段', '拉取即带状态；作废/红冲票直接拦截'],
      ['dup', '重复采集', '同号同码 + 跨渠道：邮箱或门户已上传过同一张'],
      ['sup', '供应商编码', '按销方税号精确匹配主数据'],
      ['biz', '业务合规', 'PO/合同关联、购方抬头、期间'],
    ]),
    rules: sw([
      ['销方税号在黑名单', '切换「严格入账」，全部转人工'],
      ['金额 ≥ 等值 50 万 CNY', '业务合规改为人工复核'],
      ['供应商信任分 ≥ 85', '沿用「快速采集」'],
    ]),
  },
  {
    k: 'portal', name: '供应商门户 H5', short: '门户 H5', sub: '供应商在门户内上传发票，或门户嵌入的 H5', form: 'PDF/图片/XML', formTone: 'blue',
    who: '供应商', share: '21%', stp: '71%', err: '3.9%', preset: 'supplier',
    logic: '供应商身份已登录可知，供应商归属无需猜测；重点在 OCR 与供应商自报字段的一致性、银行账户变更与重复提交。',
    order: steps([
      ['sup', '登录身份即供应商', '账户/法人/交易关系校验，银行账户变更冻结'],
      ['ocr', 'OCR 与自报字段比对', '供应商填的 PO、金额与票面不一致时提示供应商'],
      ['gov', '税局/平台校验', '有在线查验的国家必查'],
      ['dup', '重复提交', '同供应商近似票 + 影像哈希'],
      ['biz', '业务合规', 'PO 行匹配、收货状态'],
    ]),
    rules: sw([
      ['供应商首次提交', '切换「严格入账」，人工复核全部字段'],
      ['结构化 XML 主件', '跳过 OCR 校验，改为 XML 模式校验'],
      ['连续 20 张无错', '放宽为「供应商自助」'],
    ]),
  },
  {
    k: 'erp', name: 'ERP 嵌入 H5', short: 'ERP H5', sub: '员工在 ERP / 费控 / AP 内拍票或上传', form: '图片/PDF', formTone: 'blue',
    who: '员工', share: '17%', stp: '64%', err: '5.2%', preset: 'standard',
    logic: '上下文已知（法人、单据、PO），可以把业务合规前置；OCR 质量最不稳定，可纠正项尽量在页面上当场处理。',
    order: steps([
      ['ocr', '影像与识别', '质量不合格当场重拍；可纠正项当场采纳'],
      ['gov', '税局/平台校验', '中国票以税局覆盖'],
      ['dup', '重复采集', '本人历史 + 全公司'],
      ['sup', '供应商编码', '无 PO 票按名称归一化，置信度低则待归属'],
      ['biz', '业务合规', '费用标准、预算、期间，直接在单据内提示'],
    ]),
    rules: sw([
      ['差旅类小额 < 等值 500 CNY', '切换「快速采集」，供应商校验跳过'],
      ['有 PO', '业务合规升级为三单匹配'],
      ['员工 30 天误差率 > 10%', '可纠正项改为人工复核'],
    ]),
  },
  {
    k: 'mail', name: '邮箱采集', short: '邮箱', sub: '员工 / 共享邮箱授权后拉取附件', form: 'PDF/XML/压缩包', formTone: 'blue',
    who: '系统 + 来源规则', share: '19%', stp: '58%', err: '4.4%', preset: 'standard',
    logic: '来源不可信，先做发件人认证与钓鱼检测；附件分类后再走识别；重复率最高，去重放前面。',
    order: steps([
      ['biz', '来源认证与风险', 'SPF/DKIM、变更账户话术、白名单域名'],
      ['dup', '附件去重', '哈希 + 转发链去重，先于识别'],
      ['ocr', '识别或 XML 解析', '按来源规则套用语言/国家'],
      ['gov', '税局/平台校验', '可查验国家必查'],
      ['sup', '供应商编码', '来源规则命中则直接归属，否则名称匹配'],
    ]),
    rules: sw([
      ['来源规则命中且认证通过', '沿用「标准」'],
      ['未命中来源规则', '切换「严格入账」，供应商归属转人工'],
      ['邮件要求变更收款账户', '冻结并通知风控，不进入任何组合'],
    ]),
  },
  {
    k: 'peppol', name: 'Peppol 采集', short: 'Peppol', sub: 'Access Point 接收 UBL / PINT 电子发票', form: '结构化 UBL', formTone: 'green',
    who: '系统', share: '5%', stp: '96%', err: '0.2%', preset: 'quick',
    logic: '结构化、已签名、发送方身份由 Peppol ID 保证；做 Schema/Schematron 校验、供应商 ID 映射与业务合规即可。',
    order: steps([
      ['gov', 'Schema / Schematron', 'UBL 结构与各国 CIUS 规则'],
      ['sup', 'Peppol ID → 供应商', '参与者标识映射主数据'],
      ['dup', '重复', '同一 UUID 重发'],
      ['biz', '业务合规', 'PO 引用、购方 Endpoint'],
    ]),
    rules: sw([
      ['Schematron 警告', '标记提示，不阻断'],
      ['Peppol ID 未映射', '切换「严格入账」，转人工建档'],
    ]),
  },
];

const subs = (xs: Array<[string, string, string]>) => xs.map(([k, name, note]) => ({ k, name, note }));

export const FAMILIES: Family[] = [
  { k: 'ocr', name: 'OCR 识别结果', subs: subs([['img', '影像质量', '模糊/倾斜/遮挡'], ['layout', '版面与多页', '拆分/合并/缺页'], ['conf', '字段置信度', '< 70% 需确认'], ['sum', '金额勾稽', '净额+税额=合计'], ['cur', '币种与小数位', 'JPY/KRW/VND 取整']]) },
  { k: 'gov', name: '税局 / 平台校验', subs: subs([['status', '票据状态', '正常/作废/红冲/取消'], ['truth', '字段与平台一致', '以平台为准覆盖'], ['tid', '税号在线校验', 'VIES/公表/GSTIN/ABN'], ['sig', '签名 / 二维码', 'ZATCA QR、CFDI 数字印章']]) },
  { k: 'sup', name: '供应商编码规则', subs: subs([['code', '编码存在且有效', '主数据状态'], ['name', '名称归一化匹配', '去后缀/全半角/声调'], ['bank', '银行账户一致', '与主数据比对'], ['rel', '与购方法人有交易关系', '法人级供应商清单'], ['risk', '冻结 / 黑名单', '风控名单']]) },
  { k: 'dup', name: '重复采集', subs: subs([['exact', '同号同码', '精确重复'], ['hash', '影像感知哈希', '同一张图不同文件'], ['near', '近似重复', '销方+金额+日期±3 天'], ['cross', '跨渠道重复', '邮箱/门户/H5 之间']]) },
  { k: 'biz', name: '业务合规', subs: subs([['po', 'PO / 合同关联', '有无 PO、行匹配'], ['buyer', '购方抬头与税号', '本集团法人'], ['period', '日期与期间', '超期/跨期/未来'], ['policy', '费用标准 / 预算', '差旅标准、预算余额'], ['sanction', '风险 / 制裁名单', '走逃失联、制裁']]) },
];

export const POLICIES: PolicyStyle[] = [
  { k: 'na', label: '—', desc: '不适用' },
  { k: 'auto', label: '自动', desc: '自动处理' },
  { k: 'hint', label: '提示', desc: '提示不拦' },
  { k: 'review', label: '复核', desc: '人工复核' },
  { k: 'block', label: '阻断', desc: '不通过即拦截' },
];
export const CYCLE: PolicyKey[] = ['na', 'auto', 'hint', 'review', 'block'];

export const PRESETS: Preset[] = [
  { k: 'standard', label: '标准', v: { ocr: 'auto', gov: 'block', sup: 'review', dup: 'block', biz: 'review' } },
  { k: 'strict', label: '严格入账', v: { ocr: 'review', gov: 'block', sup: 'review', dup: 'block', biz: 'block' } },
  { k: 'quick', label: '快速采集', v: { ocr: 'auto', gov: 'block', sup: 'auto', dup: 'block', biz: 'hint' } },
  { k: 'supplier', label: '供应商自助', v: { ocr: 'hint', gov: 'block', sup: 'auto', dup: 'block', biz: 'hint' } },
];
const presetOf = (k: PresetKey) => PRESETS.find((p) => p.k === k) as Preset;

export function buildDefaults(): { pol: PolicyMatrix; sub: SubOverrides } {
  const pol = {} as PolicyMatrix;
  CHANNELS.forEach((c) => {
    pol[c.k] = { ...presetOf(c.preset).v };
  });
  pol.tax.ocr = 'na';
  pol.peppol.ocr = 'na';
  pol.tax.gov = 'block';
  pol.mail.biz = 'review';
  pol.erp.ocr = 'auto';
  const sub: SubOverrides = {
    'portal:sup:bank': 'block',
    'mail:biz:sanction': 'block',
    'erp:biz:policy': 'hint',
    'tax:dup:cross': 'review',
    'peppol:gov:sig': 'block',
    'mail:sup:bank': 'block',
  };
  return { pol, sub };
}

const lane = (xs: Array<[string, string, string]>): LaneItem[] => xs.map(([code, msg, act]) => ({ code, msg, act }));

export const SAMPLES: Record<ChannelKey, SampleTicket> = {
  tax: {
    sup: '江苏恒立液压股份有限公司', no: '26372000000018842', meta: '数电专票 · 中国大陆 · 税局票池拉取 · ¥118,000.00',
    lanes: {
      ocr: [],
      gov: lane([['GOV-STATUS-OK', '税局状态正常', '通过'], ['GOV-TRUTH', 'OCR 旁路：无 OCR，字段直接取税局', '—']]),
      sup: lane([['SUP-CODE-OK', '销方税号精确匹配 SUP-0007712', '自动归属']]),
      dup: lane([['DUP-CROSS', '邮箱渠道 09-08 已收到同号 PDF', '合并为同一张，保留两个来源']]),
      biz: lane([['BIZ-PO', 'PO-4500127102 行匹配', '进入三单匹配']]),
    },
    verdict: '可入账：合并跨渠道重复后直接进入三单匹配。', ok: true,
  },
  portal: {
    sup: 'Blue Ridge Supply LLC', no: 'BR-77120', meta: 'Invoice PDF · 美国 · 供应商门户上传 · $12,022.90',
    lanes: {
      ocr: lane([['OCR-SUM', 'Sales tax 并入 Subtotal，勾稽不平', '提示供应商确认拆分'], ['OCR-CONF', 'PO number 置信度 46%', '供应商自报 PO-4500128871 优先']]),
      gov: lane([['GOV-NA', '美国无统一查验平台', '—']]),
      sup: lane([['SUP-BANK', 'Remit-to 账户与主数据不一致（****4392 vs ****0938）', '冻结，走主数据变更']]),
      dup: lane([['DUP-NEAR', '与 BR-77098 同金额同 PO，13 天内', '请供应商说明']]),
      biz: lane([['BIZ-PO', 'PO 行 400 件未收货', '等待收货']]),
    },
    verdict: '已拦截：银行账户变更须经主数据流程，供应商门户显示需补充的说明，不显示风险评分。', ok: false,
  },
  erp: {
    sup: '株式会社宝田機械', no: 'TK-2609-0031', meta: '適格請求書 · 日本 · 员工在 AP 模块内上传 · ¥992,200',
    lanes: {
      ocr: lane([['OCR-TID', '登録番号 O→0', '可自动纠正'], ['OCR-RATE', '税率区分 8% 与品类不符', '需人工确认'], ['OCR-CUR', '日元小数位', '自动取整']]),
      gov: lane([['GOV-TID', '登録番号公表サイト有效', '通过']]),
      sup: lane([['SUP-NAME', '名称归一化匹配 SUP-0013397 · 置信 0.92', '自动归属']]),
      dup: [],
      biz: lane([['BIZ-PO', 'PO-4500127730 关联', '通过'], ['BIZ-PERIOD', '开票日在期内', '通过']]),
    },
    verdict: '需处理：1 项人工确认后可入账；可纠正项当场采纳。', ok: false,
  },
  mail: {
    sup: 'Werner Antriebstechnik GmbH', no: 'RE-2026-45399', meta: 'ZUGFeRD · 德国 · rechnungen@ 共享邮箱 · €61,280.00',
    lanes: {
      ocr: lane([['OCR-BYPASS', 'XML 主件，PDF 仅参照；Leistungsdatum PDF 与 XML 不一致', '以 XML 为准']]),
      gov: lane([['GOV-TID', 'VIES 有效', '通过']]),
      sup: lane([['SUP-CODE-OK', '来源规则命中 → SUP-0021004', '自动归属']]),
      dup: lane([['DUP-HASH', '转发链 3 封，同附件哈希', '去重为 1 张']]),
      biz: lane([['BIZ-AUTH', 'SPF/DKIM 通过', '通过'], ['BIZ-PO', '未识别到 PO', '提示员工补 PO']]),
    },
    verdict: '可入账：XML 为准、去重后进入票夹，PO 待补。', ok: true,
  },
  peppol: {
    sup: 'Nordic Components AB', no: 'urn:uuid:7c1e…a92f', meta: 'Peppol BIS Billing 3.0 · 瑞典 · Access Point 接收 · SEK 184,500',
    lanes: {
      ocr: [],
      gov: lane([['GOV-SCHEMA', 'UBL 结构通过', '通过'], ['GOV-CIUS', 'Schematron 警告：BT-10 买方参考为空', '提示']]),
      sup: lane([['SUP-PEPPOL', 'Peppol ID 0007:5560… 未映射', '转人工建档']]),
      dup: [],
      biz: lane([['BIZ-PO', 'PO 引用 PO-4500129012', '通过']]),
    },
    verdict: '待归属：Peppol ID 未映射到供应商主数据，切换严格入账，转人工建档。', ok: false,
  },
};

const sev = (xs: Array<[string, Tone]>) => xs.map(([l, tone]) => ({ l, tone }));

export const TAXONOMY: TaxonomyRow[] = [
  { name: 'OCR 识别结果', prefix: 'OCR-*', eg: 'OCR-SUM 金额勾稽不平 · OCR-CONF 置信度低', sev: sev([['可纠正', 'blue'], ['需确认', 'orange']]), where: '采集页、H5、门户（对供应商）、票夹票面页', how: '字段旁「修正前 → 修正后」+ 采纳按钮；低置信字段标色', act: '采纳纠正 / 人工更正 / 重拍', truth: '影像复读、税局或 XML 覆盖、人工复核' },
  { name: '税局 / 平台校验', prefix: 'GOV-*', eg: 'GOV-STATUS 作废/红冲 · GOV-TRUTH 字段被平台覆盖', sev: sev([['阻断', 'red'], ['覆盖', 'blue']]), where: '采集页、票夹、看板（计入误差）、门户（仅状态）', how: '顶部横幅 + 字段锁定标记（不得更正）', act: '红字发票 / 请供应商重开 / 仅回流样本', truth: '税局或清关平台即真值' },
  { name: '供应商编码规则', prefix: 'SUP-*', eg: 'SUP-NAME 归一化低置信 · SUP-BANK 账户不一致', sev: sev([['阻断', 'red'], ['复核', 'orange'], ['自动', 'green']]), where: '票夹待归属、供应商绑定工作台、门户（不展示风险）', how: '候选供应商列表 + 证据（税号/域名/历史绑定次数）', act: '确认绑定 / 挂起建档 / 主数据变更', truth: '供应商主数据；银行变更需回拨确认' },
  { name: '重复采集', prefix: 'DUP-*', eg: 'DUP-CROSS 跨渠道 · DUP-NEAR 近似重复', sev: sev([['阻断', 'red'], ['合并', 'blue']]), where: '采集页、票夹、门户（提示供应商）', how: '并排显示两张票的关键字段与来源渠道', act: '合并来源 / 判为重复作废 / 判为不同票', truth: '精确重复以票号为准；近似重复需人工' },
  { name: '业务合规', prefix: 'BIZ-*', eg: 'BIZ-PO 无 PO · BIZ-POLICY 超标准 · BIZ-SANCTION 名单', sev: sev([['阻断', 'red'], ['复核', 'orange'], ['提示', 'blue']]), where: '采集页、费控/AP 单据内、看板', how: '单据内行级提示；名单类直接冻结并通知风控', act: '补 PO / 申请例外 / 改判费用 / 冻结', truth: '采购、预算、风控系统' },
];

/* ======== 嵌入调用 ======== */
export const CODES: Record<EmbedTabKey, string> = {
  sdk: [
    '<script src="https://hub.example.com/sdk/v2/capture.js"></script>',
    '<div id="invoice-capture"></div>',
    '<script>',
    '  InvoiceCapture.mount("#invoice-capture", {',
    '    tenant: "GRP-001",',
    '    entity: "CN-SH-01",            // 采集法人',
    '    channel: "erp-h5",             // erp-h5 | portal-h5',
    '    scene: "expense",              // expense | ap | portal',
    '    country: "auto",               // 自动判定发生地，或锁定 ISO 代码',
    '    locale: "auto",                // 跟随系统，支持 18 种界面语言',
    '    policy: "policy-v7",           // 本页发布的校验策略版本',
    '    token: await getCaptureToken(), // 后端签发，10 分钟有效',
    '    onEvent: (e) => report(e.type, e.payload)',
    '  });',
    '</script>',
  ].join('\n'),
  iframe: [
    '<iframe',
    '  src="https://hub.example.com/h5/capture?tenant=GRP-001&entity=CN-SH-01',
    '       &channel=portal-h5&scene=ap&country=auto&policy=policy-v7&token=…"',
    '  allow="camera; clipboard-read"',
    '  style="width:100%;height:760px;border:0"></iframe>',
    '',
    '<script>',
    '  window.addEventListener("message", (e) => {',
    '    if (e.origin !== "https://hub.example.com") return;',
    '    // e.data.type: invoice.captured | invoice.validated |',
    '    //              invoice.corrected | invoice.submitted',
    '    handle(e.data);',
    '  });',
    '</script>',
  ].join('\n'),
  im: [
    '# 移动端 / 企业 IM 工作台应用（H5）',
    '主页地址  https://hub.example.com/h5/capture?tenant=GRP-001&channel=erp-h5&scene=expense',
    '免登      通过 IM 的 OAuth code 换取 capture token（服务端完成）',
    '相机      调用 IM 容器的 chooseImage / scanCode，失败时回退到文件选择',
    '策略      policy 参数缺省时使用该渠道当前生效版本',
    '回传      提交后由服务端回调 POST /hooks/invoice-captured，并推送 IM 消息卡片',
  ].join('\n'),
};

export const PARAMS: EmbedParam[] = (
  [
    ['tenant', '集团租户编码', 'GRP-001'],
    ['entity', '采集法人；决定本位币与购方抬头校验', 'CN-SH-01'],
    ['channel', '接入渠道，对应策略矩阵中的列', 'erp-h5 / portal-h5'],
    ['scene', '场景：报销 / 采购应付 / 供应商门户', 'expense'],
    ['country', '发生地；auto 时按票面税号、语言、币种判定', 'auto'],
    ['locale', '界面语言；auto 跟随系统', 'zh-CN'],
    ['policy', '校验策略版本；不填则用渠道当前生效版本', 'policy-v7'],
    ['dataCenter', '可选；不填时按 entity 路由到所属数据中心', 'EU-FRA'],
    ['token', '短期访问令牌，服务端签发', '—'],
  ] as Array<[string, string, string]>
).map(([k, d, e]) => ({ k, d, e }));

export const EVENTS: EmbedEvent[] = (
  [
    ['invoice.captured', '影像已上传，开始识别'],
    ['invoice.validated', '校验完成，返回五类问题的逐项结果'],
    ['invoice.corrected', '采纳纠正或人工更正，带修正前后对比'],
    ['invoice.submitted', '导入报销单 / AP 单'],
    ['capture.closed', '用户关闭采集页'],
  ] as Array<[string, string]>
).map(([k, d]) => ({ k, d }));

export const QR_BITS: boolean[] = '1110011110101001101011111001010111010101001011101100101101111001'
  .split('')
  .map((ch) => ch === '1');

/* [family, label, what, fix, countries, action, channels] */
const RULE_ROWS: Array<[FamKey, string, string, string, string, RuleAction, ChannelKey[]]> = [
  ['ocr', '影像质量检测', '模糊、倾斜、遮挡、反光、多页缺页', '自动纠偏、去噪、裁边后重识别；仍不合格则提示重拍', '全部', '提示', ['portal', 'erp', 'mail']],
  ['ocr', '发生地与票种判定', '税号格式、语言、币种、地址、版式模板', '给出判定依据；冲突时进入「待归属」', '全部', '拦截', ['portal', 'erp', 'mail']],
  ['ocr', '金额勾稽', '不含税 + 税额 = 合计；行项目求和；折扣与运费', '定位不平的字段并给出候选值', '全部', '复核', ['portal', 'erp', 'mail']],
  ['ocr', '币种与小数位', '币种符号歧义、零小数位币种', 'JPY / KRW / VND / IDR 自动取整；$ 按地址判定币种', '全部', '自动', ['portal', 'erp', 'mail']],
  ['ocr', '必备字段', '按国家要求：登録番号、RFC/UUID、USt-IdNr.、GSTIN 等', '缺失项可在列表中直接补全', '按国家', '复核', ['portal', 'erp', 'mail']],
  ['gov', '税局 / 清关平台查验', '票据状态、作废、红冲、金额', '以平台数据覆盖 OCR 结果，差异计入识别错误', '中国、意大利 SdI、墨西哥 SAT、巴西 SEFAZ、沙特 ZATCA、印度 IRP、波兰 KSeF、韩国 NTS', '拦截', ['tax', 'portal', 'erp', 'mail']],
  ['gov', '税号格式与在线校验', '校验位、长度、前缀；VIES、登録番号公表サイト、GSTIN、ABN', '常见混淆纠正（O/0、I/1、空格、分隔符）', '有统一税号的国家', '复核', ['portal', 'erp', 'mail', 'peppol']],
  ['gov', 'Schema / Schematron', 'UBL 结构与各国 CIUS 规则', '警告不阻断，错误退回发送方', 'Peppol 国家', '拦截', ['peppol']],
  ['sup', '供应商编码与归属', '税号精确匹配、名称归一化、来源规则、Peppol ID 映射', '置信不足进入「待归属」，给出候选与证据', '全部', '复核', ['tax', 'portal', 'erp', 'mail', 'peppol']],
  ['sup', '收款银行账户', '与主数据比对；邮件要求变更账户', '不一致即冻结，走主数据变更 + 回拨确认', '全部', '拦截', ['portal', 'mail']],
  ['dup', '重复检测', '同号同代码、影像感知哈希、销方 + 金额 + 日期近似、跨渠道', '标记疑似重复并关联已存在单据；跨渠道同一张合并来源', '全部', '拦截', ['tax', 'portal', 'erp', 'mail', 'peppol']],
  ['biz', '税率合法性', '该国法定税率、减免税率与品类匹配', '提示应适用税率与差额（规则来自税务规则设置）', '全部', '复核', ['portal', 'erp', 'mail']],
  ['biz', '日期合理性', '未来日期、超期（默认 180 天）、跨会计期', '提示；超期按法人政策拦截', '全部', '提示', ['tax', 'portal', 'erp', 'mail', 'peppol']],
  ['biz', '购方抬头与税号', '购方名称、税号是否为本集团法人', '名称归一化后比对', '全部', '拦截', ['tax', 'portal', 'erp', 'mail', 'peppol']],
  ['biz', '销方风险', '异常凭证、走逃失联、制裁名单、黑名单', '冻结导入并通知风控', '全部', '拦截', ['tax', 'portal', 'erp', 'mail', 'peppol']],
];
export const RULES: CheckRule[] = RULE_ROWS.map(([fam, label, what, fix, where, act, chs]) => ({ fam, label, what, fix, where, act, chs }));

export function buildChannelsConfig(): ChannelsConfig {
  const defaults = buildDefaults();
  const current = buildDefaults();
  return {
    channels: CHANNELS,
    families: FAMILIES,
    policies: POLICIES,
    cycle: CYCLE,
    presets: PRESETS,
    defaults,
    current: { ...current, ver: 7, publishedAt: '2026-10-01' },
    samples: SAMPLES,
    taxonomy: TAXONOMY,
    codes: CODES,
    params: PARAMS,
    events: EVENTS,
    qr: QR_BITS,
    rules: RULES,
  };
}
