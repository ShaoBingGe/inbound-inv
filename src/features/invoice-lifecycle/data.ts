/* 发票全生命周期 · 示例数据（自设计稿 Lifecycle.dc.html 迁移，数值与文案保持一致） */
import type { Tone } from '@/components/ui';
import type {
  DocLang,
  DocPage,
  DocRow,
  DocSection,
  InvoiceDocument,
  InvoiceLifecycle,
  KeyValue,
  LifecycleDetail,
  LifecycleFact,
  LifecycleStep,
  MatrixRow,
  ReverseDoc,
  RouteStep,
  SampleKey,
  SampleOption,
  StepState,
  TaxLine,
  TransPair,
} from './types';

export const STEPS = ['采集', '校验', '税局/平台', '供应商归属', '匹配/审核', '入账', '进项处理', '申报', '付款', '归档'];

export const DEFAULT_SAMPLE: SampleKey = 'cn';

/* ---------- 紧凑写法 → 类型化（与原型数组结构一一对应） ---------- */
type RawFact = [string, string, string];
type RawStep = [StepState, string, string];
type RawTax = [string, string, string, string, string, string];
type RawRule = [string, string];

const toneOf = (c: string): Tone => c.replace(/^c-/, '') as Tone;
const facts = (xs: RawFact[]): LifecycleFact[] => xs.map(([k, v, c]) => ({ k, v, good: c === '#1D6B43' }));
const steps = (xs: RawStep[]): LifecycleStep[] => xs.map(([state, at, who]) => ({ state, at, who }));
const taxes = (xs: RawTax[]): TaxLine[] =>
  xs.map(([name, rate, amt, treat, st, tone]) => ({ name, rate, amt, treat, st, tone: toneOf(tone) }));
const rules = (xs: RawRule[]): KeyValue[] => xs.map(([k, v]) => ({ k, v }));
const revDoc = (d: Omit<ReverseDoc, 'tone'> & { stTone: string }): ReverseDoc => {
  const { stTone, ...rest } = d;
  return { ...rest, tone: toneOf(stTone) };
};

export const INV: Record<SampleKey, InvoiceLifecycle> = {
  cn: {
    key: 'cn',
    id: '26372000000018842',
    countryCode: 'CN',
    label: '中国大陆 · 数电专票 · 恒立液压（已红冲部分）',
    country: '中国大陆',
    regime: '增值税（VAT）',
    kind: '数电专票',
    sup: '江苏恒立液压股份有限公司',
    no: '26372000000018842',
    ch: '税局同步',
    entity: 'CN-SH-01 上海分公司',
    dc: 'CN-QD',
    ruleVer: 'CN-VAT-2026.2',
    status: '已入账 · 部分红冲',
    statusTone: 'orange',
    facts: facts([
      ['价税合计', '¥118,000.00', '#1F2329'],
      ['税额', '¥13,575.22', '#1F2329'],
      ['可抵扣', '¥12,398.23（红冲后）', '#1D6B43'],
      ['申报期', '2026-10（按月）', '#1F2329'],
      ['用途', '原材料 · 一般计税', '#1F2329'],
    ]),
    steps: steps([
      ['done', '09-08 10:21', '系统 · 税局票池'],
      ['done', '09-08 10:21', '税局覆盖 2 字段'],
      ['done', '09-08 10:21', '查验正常 · 验重通过'],
      ['done', '09-08 10:22', '税号精确匹配'],
      ['done', '09-09 14:30', '三单匹配 · AP-2609-00412'],
      ['done', '09-10 09:00', '凭证 JV-2609-1182'],
      ['done', '09-10 09:00', '勾选认证（数电票池用途确认）'],
      ['done', '10-12 16:00', '2026-09 期申报已含'],
      ['cur', '10-20 预计', '付款批 PAY-2610-W3'],
      ['todo', '—', '保存 10 年'],
    ]),
    rev: {
      mech: '中国大陆：红字发票（红字确认单 → 红字数电票），不作废原票',
      origLine: '价税合计 ¥118,000.00 · 税额 ¥13,575.22 · 2026-09-08',
      docs: [
        revDoc({
          kind: '红字数电专票（部分）',
          no: '26372000000021107',
          line: '−¥10,230.00 · 税额 −¥1,176.99 · 2026-10-05',
          effect: '2 件退货；购方发起红字确认单 HZ-2610-0033，供应商开具后自动关联原票；进项税转出 ¥1,176.99 在 2026-10 期申报',
          st: '已关联 · 已转出',
          stTone: 'c-green',
          link: '关联方式：红字确认单号 + 原票号',
        }),
      ],
      gross: '¥118,000.00',
      reduced: '−¥10,230.00',
      net: '¥107,770.00',
      netTax: '¥12,398.23',
      linkRule: '关联规则：逆向票必须引用原票号；部分冲减按行项目匹配；净额与进项税净额用于付款与申报。',
    },
    taxes: taxes([
      ['增值税 VAT', '13%', '¥13,575.22', '一般计税 · 进项抵扣', '已认证', 'c-green'],
      ['增值税 · 红冲转出', '13%', '−¥1,176.99', '进项税额转出', '已申报', 'c-blue'],
    ]),
    rules: rules([
      ['抵扣条件', '数电专票 · 购方税号一致 · 用途为应税项目 · 在票池完成用途确认'],
      ['申报', '按月，次月 15 日前；本票计入 2026-09 期'],
      ['逆向机制', '红字发票；不允许作废已交付票'],
      ['存档', '电子原件 10 年；红字确认单一并保存'],
      ['不得更正', '票面任何字段（以税局为准）'],
    ]),
  },
  jp: {
    key: 'jp',
    id: 'TK-2609-0031',
    countryCode: 'JP',
    label: '日本 · 適格請求書 · 宝田機械（税率更正后）',
    country: '日本',
    regime: '消費税（JCT）',
    kind: '適格請求書',
    sup: '株式会社宝田機械',
    no: 'TK-2609-0031',
    ch: 'ERP H5',
    entity: 'JP-TYO-01 日本法人',
    dc: 'JP-TYO',
    ruleVer: 'JP-JCT-2026.1',
    status: 'AP 单审核中',
    statusTone: 'blue',
    facts: facts([
      ['合計金額', '¥992,200', '#1F2329'],
      ['消費税額', '¥90,200（更正后）', '#1F2329'],
      ['仕入税額控除', '全额可控除', '#1D6B43'],
      ['申报期', '2026 年度 · 中間申告 Q3', '#1F2329'],
      ['登録番号', 'T7010001081486 · 有效', '#1F2329'],
    ]),
    steps: steps([
      ['done', '09-03 11:02', '李 敏 · ERP H5'],
      ['done', '09-03 11:03', '3 处问题 · 2 处已更正'],
      ['done', '09-03 11:03', '公表サイト校验有效'],
      ['done', '09-03 11:03', '名称归一化 0.92'],
      ['cur', '10-13', 'AP-2610-00087 审批中'],
      ['todo', '—', '—'],
      ['todo', '—', '仕入税額控除（帳簿 + 請求書保存）'],
      ['todo', '—', '中間申告'],
      ['todo', '—', '月末締 翌月末払'],
      ['todo', '—', '電子帳簿保存法 7 年'],
    ]),
    rev: {
      mech: '日本：返還インボイス（适格返还请求书）或修正適格請求書',
      origLine: '合計 ¥992,200 · 消費税 ¥90,200 · 2026-09-03',
      docs: [],
      how: '供应商开具 返還インボイス 并引用原票号与対象期間；原票保留，净额按返還后计算。',
      gross: '¥992,200',
      reduced: '¥0',
      net: '¥992,200',
      netTax: '¥90,200',
      linkRule: '关联规则：返還インボイス 需注明原請求書番号；跨年度返还按返還日所属课税期间处理。',
    },
    taxes: taxes([
      ['消費税 标准税率', '10%', '¥90,200', '仕入税額控除 · 需適格請求書 + 帳簿', '待入账', 'c-orange'],
      ['地方消費税（含于上）', '2.2/10', '¥19,844', '随国税一并申报', '待入账', 'c-orange'],
    ]),
    rules: rules([
      ['控除条件', '登録番号有效 · 税率区分明示 · 帳簿记载'],
      ['申报', '年度申告 + 中間申告（按前期税额决定频率）'],
      ['逆向机制', '返還インボイス / 修正適格請求書'],
      ['存档', '電子帳簿保存法：电子数据 7 年，含修正记录'],
      ['经過措置', '非適格发票仅 80% 控除（至 2026-09-30）'],
    ]),
  },
  de: {
    key: 'de',
    id: 'RE-2026-45102',
    countryCode: 'DE',
    label: '德国 · ZUGFeRD · Werner（已有 Gutschrift）',
    country: '德国',
    regime: 'Umsatzsteuer（MwSt.）',
    kind: 'Rechnung · ZUGFeRD',
    sup: 'Werner Antriebstechnik GmbH',
    no: 'RE-2026-45102',
    ch: '邮箱采集',
    entity: 'DE-MUC-01 德国法人',
    dc: 'EU-FRA',
    ruleVer: 'DE-USt-2026.1',
    status: '已付款 · 已冲减',
    statusTone: 'green',
    facts: facts([
      ['Gesamtbetrag', '€24,960.00', '#1F2329'],
      ['MwSt. 19%', '€3,985.21', '#1F2329'],
      ['Vorsteuer 净额', '€3,793.61', '#1D6B43'],
      ['申报期', '2026-09 USt-VA（月报）', '#1F2329'],
      ['USt-IdNr.', 'DE811907980 · VIES 有效', '#1F2329'],
    ]),
    steps: steps([
      ['done', '09-18 08:10', 'rechnungen@ 共享邮箱'],
      ['done', '09-18 08:10', 'XML 为准 · 去重 3→1'],
      ['done', '09-18 08:11', 'VIES 有效'],
      ['done', '09-18 08:11', '来源规则命中'],
      ['done', '09-19 10:00', '三单匹配 · 单价差异后接受'],
      ['done', '09-20 09:00', 'JV-2609-DE-0410'],
      ['done', '09-20 09:00', 'Vorsteuerabzug §15 UStG'],
      ['done', '10-10 12:00', 'USt-VA 2026-09 已报'],
      ['done', '10-08 09:30', 'PAY-2610-0331'],
      ['todo', '—', 'GoBD 10 年'],
    ]),
    rev: {
      mech: '德国：Gutschrift（贷项通知）或 Rechnungskorrektur，引用原票',
      origLine: '€24,960.00 · MwSt. €3,985.21 · 2026-09-18',
      docs: [
        revDoc({
          kind: 'Gutschrift',
          no: 'GS-2026-0117',
          line: '−€1,200.00 · MwSt. −€191.60 · 2026-10-11',
          effect: '第 3 行单价差额；已付款，差额在下次付款中抵扣；Vorsteuer 在 2026-10 期更正',
          st: '已关联 · 待抵扣',
          stTone: 'c-orange',
          link: '关联方式：Gutschrift 引用 RE-2026-45102 行 3',
        }),
      ],
      gross: '€24,960.00',
      reduced: '−€1,200.00',
      net: '€23,760.00',
      netTax: '€3,793.61',
      linkRule: '关联规则：Gutschrift 必须引用原票号；已付款后的冲减生成 Debit memo 抵扣，不退款。',
    },
    taxes: taxes([
      ['Umsatzsteuer', '19%', '€3,985.21', 'Vorsteuerabzug · 需 USt-IdNr. 与 §14 要素', '已抵扣', 'c-green'],
      ['Gutschrift 更正', '19%', '−€191.60', 'Vorsteuer 更正 §17 UStG', '2026-10 期', 'c-blue'],
    ]),
    rules: rules([
      ['抵扣条件', '§14 UStG 发票要素齐全 · 供应商 USt-IdNr. 有效 · 用于应税业务'],
      ['申报', 'USt-Voranmeldung 月报，次月 10 日；年度 USt-Erklärung'],
      ['逆向机制', 'Gutschrift / Rechnungskorrektur（§14c 风险）'],
      ['存档', 'GoBD 10 年，XML 原件不可改'],
      ['E-Rechnung', '2025 起 B2B 必须能接收结构化发票'],
    ]),
  },
  us: {
    key: 'us',
    id: 'BR-77098',
    countryCode: 'US',
    label: '美国 · Invoice · Blue Ridge（Sales + Use tax）',
    country: '美国',
    regime: 'Sales & Use Tax（州 · 乔治亚）',
    kind: 'Invoice',
    sup: 'Blue Ridge Supply LLC',
    no: 'BR-77098',
    ch: '供应商门户 H5',
    entity: 'US-ATL-01 美国法人',
    dc: 'NA-IAD',
    ruleVer: 'US-GA-2026.1',
    status: '已付款',
    statusTone: 'green',
    facts: facts([
      ['Total', '$12,022.90', '#1F2329'],
      ['Sales tax', '$742.90（7% GA + 县）', '#1F2329'],
      ['Use tax 自评', '$0（已由供应商代收）', '#1F2329'],
      ['申报', '供应商申报；买方无需', '#1F2329'],
      ['1099', '不适用（货物）', '#1F2329'],
    ]),
    steps: steps([
      ['done', '09-02 09:40', '供应商门户'],
      ['done', '09-02 09:41', 'Sales tax 拆分纠正'],
      ['done', '09-02 09:41', '无统一查验（跳过）'],
      ['done', '09-02 09:41', '登录身份'],
      ['done', '09-04 10:00', '三单匹配通过'],
      ['done', '09-05 09:00', 'JV-2609-US-0211'],
      ['done', '09-05 09:00', 'Sales tax 计入成本（不可抵扣）'],
      ['done', '—', '买方无申报义务'],
      ['done', '10-02 12:00', 'PAY-2610-0102 · ACH'],
      ['todo', '—', '7 年'],
    ]),
    rev: {
      mech: '美国：Credit memo，无法定格式；引用原发票号',
      origLine: '$12,022.90 · Sales tax $742.90 · 2026-09-02',
      docs: [],
      how: '供应商开具 Credit memo 引用 BR-77098；若已付款，在下次付款中抵扣。',
      gross: '$12,022.90',
      reduced: '$0.00',
      net: '$12,022.90',
      netTax: '—',
      linkRule: '关联规则：Credit memo 引用原票号；若供应商未代收税，买方按州自评 Use tax。',
    },
    taxes: taxes([
      ['State sales tax（GA）', '4%', '$451.20', '供应商代收，计入采购成本', '不可抵扣', 'c-gray'],
      ['Local sales tax（Fulton）', '3%', '$291.70', '同上', '不可抵扣', 'c-gray'],
      ['Use tax', '7%', '$0', '供应商未代收时由买方自评', '不适用', 'c-gray'],
    ]),
    rules: rules([
      ['抵扣', '无进项抵扣概念；税额计入成本或资本化'],
      ['申报', '买方仅对未代收的采购自评 Use tax，按州季度申报'],
      ['逆向机制', 'Credit memo（无法定格式）'],
      ['存档', '联邦 7 年；各州 3–4 年'],
      ['免税证书', '转售/制造用途需向供应商提供 Resale/Exemption certificate'],
    ]),
  },
  br: {
    key: 'br',
    id: 'NF-e 000.951',
    countryCode: 'BR',
    label: '巴西 · NF-e · Metalúrgica（多税种）',
    country: '巴西',
    regime: 'ICMS / IPI / PIS / COFINS',
    kind: 'NF-e（DANFE）',
    sup: 'Metalúrgica São Bento Ltda.',
    no: 'NF-e 000.951 · chave 3526…',
    ch: '邮箱采集',
    entity: 'BR-SP-01 巴西法人',
    dc: 'LATAM-GRU',
    ruleVer: 'BR-SP-2026.2',
    status: '税局票池同步中',
    statusTone: 'orange',
    facts: facts([
      ['Valor total', 'R$ 84,300.00', '#1F2329'],
      ['ICMS 18%', 'R$ 13,266.00', '#1F2329'],
      ['IPI 5%', 'R$ 3,510.00', '#1F2329'],
      ['PIS 1.65% + COFINS 7.6%', 'R$ 6,497.78', '#1F2329'],
      ['可抵扣合计', 'R$ 23,273.78', '#1D6B43'],
    ]),
    steps: steps([
      ['done', '10-09 15:20', '邮箱 · XML + DANFE'],
      ['done', '10-09 15:21', 'XML 为准 · 签名有效'],
      ['cur', '10-09 15:21', 'SEFAZ 授权查询排队'],
      ['done', '10-09 15:22', 'CNPJ 精确匹配'],
      ['todo', '—', '—'],
      ['todo', '—', '—'],
      ['todo', '—', 'ICMS/IPI/PIS/COFINS 分别抵扣'],
      ['todo', '—', 'SPED Fiscal · EFD-Contribuições'],
      ['todo', '—', '—'],
      ['todo', '—', '5 年'],
    ]),
    rev: {
      mech: '巴西：NF-e de devolução（退货）或 Carta de Correção（仅非金额字段）',
      origLine: 'R$ 84,300.00 · 2026-10-09',
      docs: [],
      how: '退货须由买方开具 NF-e de devolução 引用原 chave；金额错误只能取消重开（24 小时内）。',
      gross: 'R$ 84,300.00',
      reduced: 'R$ 0',
      net: 'R$ 84,300.00',
      netTax: 'R$ 23,273.78',
      linkRule: '关联规则：以 chave de acesso 关联；Carta de Correção 不可改金额、税额、CNPJ。',
    },
    taxes: taxes([
      ['ICMS（州）', '18%', 'R$ 13,266.00', '进项抵扣 · 按州规则', '待授权', 'c-orange'],
      ['IPI（联邦）', '5%', 'R$ 3,510.00', '工业企业可抵扣', '待授权', 'c-orange'],
      ['PIS', '1.65%', 'R$ 1,390.95', '非累积制抵扣', '待授权', 'c-orange'],
      ['COFINS', '7.6%', 'R$ 6,406.80', '非累积制抵扣', '待授权', 'c-orange'],
    ]),
    rules: rules([
      ['抵扣条件', 'NF-e 经 SEFAZ 授权 · CFOP 与用途一致 · 各税种分别判定'],
      ['申报', 'SPED Fiscal（ICMS/IPI）月报；EFD-Contribuições（PIS/COFINS）月报'],
      ['逆向机制', 'NF-e de devolução；取消仅限授权后 24 小时'],
      ['存档', 'XML 5 年'],
      ['多税种', '一张票拆 4 个税种，分别进不同申报表'],
    ]),
  },
};

export const SAMPLE_KEYS = Object.keys(INV) as SampleKey[];

export const MATRIX: MatrixRow[] = (
  [
    ['真值来源', ['税局票池（数电）', '票面 + 公表サイト', 'XML（ZUGFeRD/XRechnung）', '票面 OCR', 'SEFAZ 授权的 XML']],
    ['抵扣/进项', ['VAT 进项认证后抵扣', '仕入税額控除（適格 + 帳簿）', 'Vorsteuerabzug §15', '无抵扣；计入成本', 'ICMS/IPI/PIS/COFINS 分别抵扣']],
    ['逆向机制', ['红字发票（红字确认单）', '返還インボイス / 修正', 'Gutschrift / Rechnungskorrektur', 'Credit memo', 'NF-e de devolução / Carta de Correção']],
    ['预提/代扣', ['境外服务：代扣代缴增值税与企业所得税', '非居民：源泉徴収', '建筑劳务：Bauabzugsteuer 15%', '服务：1099-NEC 申报（非代扣）', '服务：IRRF / INSS / CSRF 代扣']],
    ['申报周期', ['月 / 季', '年度 + 中間申告', '月报 USt-VA + 年报', '买方 Use tax 季度', '月报 SPED']],
    ['存档', ['10 年', '7 年（電子帳簿保存法）', '10 年（GoBD）', '7 年', '5 年']],
  ] as Array<[string, string[]]>
).map(([k, cells]) => ({ k, cells }));

export const ROUTE: RouteStep[] = (
  [
    ['发生地', '票面税号 / 语言 / 币种', '决定税制与真值来源'],
    ['购方法人', '抬头与税号匹配本集团法人', '决定申报主体与数据中心'],
    ['票种', '专票 / 普票 / 適格 / Rechnung / NF-e', '决定抵扣资格'],
    ['交易类型', '货物 / 服务 / 跨境 / 固定资产', '决定税种、预提与资本化'],
    ['用途', '应税 / 免税 / 集体福利 / 混用', '决定可抵扣比例'],
    ['规则版本', '按开票日匹配生效版本', '冻结在票上，不随规则变更漂移'],
  ] as Array<[string, string, string]>
).map(([k, v, why]) => ({ k, v, why }));

/* ======== 影像与识别数据（与企业票池弹窗一致） ======== */

type LabelKey =
  | 'no'
  | 'date'
  | 'seller'
  | 'buyer'
  | 'taxId'
  | 'addr'
  | 'po'
  | 'item'
  | 'qty'
  | 'price'
  | 'amount'
  | 'net'
  | 'tax'
  | 'total'
  | 'pay'
  | 'due'
  | 'bank'
  | 'title';
type TransLabelKey = Exclude<LabelKey, 'item' | 'qty' | 'price' | 'amount'>;

/** 字段名译文 [中文, English] */
const LBL: Record<TransLabelKey, TransPair> = {
  no: ['发票号码', 'Invoice No.'],
  date: ['开票日期', 'Issue date'],
  seller: ['销售方', 'Seller'],
  buyer: ['购买方', 'Buyer'],
  taxId: ['税号', 'Tax ID'],
  addr: ['地址', 'Address'],
  po: ['订单号', 'PO No.'],
  net: ['不含税金额', 'Net amount'],
  tax: ['税额', 'Tax'],
  total: ['价税合计', 'Total'],
  pay: ['付款条件', 'Payment terms'],
  due: ['到期日', 'Due date'],
  bank: ['收款账户', 'Bank account'],
  title: ['票据类型', 'Document type'],
};

/** 票面原文字段名（按原件语言） */
const L: Record<DocLang, Record<LabelKey, string>> = {
  zh: { no: '发票号码', date: '开票日期', seller: '销售方', buyer: '购买方', taxId: '纳税人识别号', addr: '地址', po: '订单号', item: '项目名称', qty: '数量', price: '单价', amount: '金额', net: '合计', tax: '税额', total: '价税合计（小写）', pay: '付款条件', due: '到期日', bank: '开户行及账号', title: '票据类型' },
  ja: { no: '請求書番号', date: '発行日', seller: '発行者', buyer: '宛先', taxId: '登録番号', addr: '住所', po: '注文番号', item: '品名', qty: '数量', price: '単価', amount: '金額', net: '小計（税抜）', tax: '消費税額', total: '合計金額（税込）', pay: '支払条件', due: '支払期日', bank: '振込先', title: '書類区分' },
  en: { no: 'Invoice No.', date: 'Invoice Date', seller: 'From', buyer: 'Bill To', taxId: 'Tax ID', addr: 'Address', po: 'PO Number', item: 'Description', qty: 'Qty', price: 'Unit Price', amount: 'Amount', net: 'Subtotal', tax: 'Tax', total: 'Total', pay: 'Terms', due: 'Due Date', bank: 'Remit To', title: 'Document' },
  de: { no: 'Rechnungsnummer', date: 'Rechnungsdatum', seller: 'Rechnungssteller', buyer: 'Rechnungsempfänger', taxId: 'USt-IdNr.', addr: 'Anschrift', po: 'Bestellnummer', item: 'Bezeichnung', qty: 'Menge', price: 'Einzelpreis', amount: 'Betrag', net: 'Nettobetrag', tax: 'MwSt.', total: 'Gesamtbetrag', pay: 'Zahlungsbedingungen', due: 'Fällig am', bank: 'Bankverbindung', title: 'Belegart' },
  pt: { no: 'Número / Chave', date: 'Data de emissão', seller: 'Emitente', buyer: 'Destinatário', taxId: 'CNPJ', addr: 'Endereço', po: 'Pedido de compra', item: 'Descrição do produto', qty: 'Qtd.', price: 'Valor unitário', amount: 'Valor total', net: 'Valor dos produtos', tax: 'ICMS + IPI', total: 'Valor total da nota', pay: 'Condição de pagamento', due: 'Vencimento', bank: 'Dados bancários', title: 'Documento' },
};

export const LANG_NAME: Record<DocLang, string> = { zh: '中文', ja: '日本語', en: 'English', de: 'Deutsch', pt: 'Português' };

/** 行项目：[[原文, 中文, English, 单价], 数量] */
type RawItem = [[string, string, string, number], number];

interface DocSample {
  lang: DocLang;
  sym: string;
  dp: number;
  cny: number;
  title: string;
  titleT: TransPair;
  /** [原文, 中文, English] */
  pay: [string, string, string];
  bank: string;
  buyer: string;
  buyerId: string;
  row: {
    sup: string;
    supAddr: string;
    supId: string;
    no: string;
    date: string;
    po: string;
    due: string;
    rate: number;
    net: number;
    tax: number;
    total: number;
    pages: number;
    items: RawItem[];
  };
}

const DK: Record<SampleKey, DocSample> = {
  cn: { lang: 'zh', sym: '¥', dp: 2, cny: 1, title: '电子发票（增值税专用发票）', titleT: ['增值税专用发票', 'VAT special invoice'], pay: ['月结 60 天', '月结 60 天', 'Net 60 days'], bank: '招商银行上海分行 ···· 4392', buyer: '集团上海分公司', buyerId: '91310000MA1FL0XX2X',
    row: { sup: '江苏恒立液压股份有限公司', supAddr: '江苏省常州市武进区', supId: '91320400MA1XXXX7Q', no: '26372000000018842', date: '2026-09-08', po: 'PO-4500127102', due: '2026-11-07', rate: 0.13, net: 104424.78, tax: 13575.22, total: 118000, pages: 1, items: [[['液压油缸 HC-80', '液压油缸 HC-80', 'Hydraulic cylinder HC-80', 5221.24], 20]] } },
  jp: { lang: 'ja', sym: '¥', dp: 0, cny: 0.0512, title: '適格請求書', titleT: ['合格发票（適格請求書）', 'Qualified invoice'], pay: ['月末締め翌月末払い', '月末结算，次月末付款', 'Month-end closing, paid end of next month'], bank: 'みずほ銀行 芝支店 普通 ····1774', buyer: 'グループジャパン株式会社', buyerId: 'T8010401XXXXXX',
    row: { sup: '株式会社宝田機械', supAddr: '東京都港区芝浦 3-1-1', supId: 'T7010001081486', no: 'TK-2609-0031', date: '2026-09-03', po: 'PO-4500127730', due: '2026-10-31', rate: 0.1, net: 902000, tax: 90200, total: 992200, pages: 3, items: [[['精密プレス金型 P-12', '精密冲压模具 P-12', 'Precision press die P-12', 820000], 1], [['据付・調整作業', '安装调试', 'Installation & adjustment', 82000], 1]] } },
  de: { lang: 'de', sym: '€', dp: 2, cny: 8.32, title: 'RECHNUNG', titleT: ['发票', 'Invoice'], pay: ['Zahlbar innerhalb 30 Tagen netto', '30 天内净额付款', 'Net 30 days'], bank: 'IBAN DE89 3704 ···· 3000', buyer: 'Group Deutschland GmbH', buyerId: 'DE31XXXXXXX',
    row: { sup: 'Werner Antriebstechnik GmbH', supAddr: 'Werner-von-Siemens-Str. 1, München', supId: 'DE811907980', no: 'RE-2026-45102', date: '2026-09-18', po: 'PO-4500128034', due: '2026-10-18', rate: 0.19, net: 20974.79, tax: 3985.21, total: 24960, pages: 2, items: [[['Getriebe G-220', '减速机 G-220', 'Gearbox G-220', 1747.9], 12]] } },
  us: { lang: 'en', sym: '$', dp: 2, cny: 7.11, title: 'INVOICE', titleT: ['发票', 'Invoice'], pay: ['Net 30', '30 天净额付款', 'Net 30'], bank: 'ACH ····4392', buyer: 'Group USA Corp.', buyerId: 'EIN 82-XXXXXXX',
    row: { sup: 'Blue Ridge Supply LLC', supAddr: '1420 Forsyth St, Atlanta, GA', supId: 'EIN 58-1234567', no: 'BR-77098', date: '2026-09-02', po: 'PO-4500128871', due: '2026-10-02', rate: 0.07, net: 11280, tax: 742.9, total: 12022.9, pages: 1, items: [[['Copper coil CC-6', '铜线圈 CC-6', 'Copper coil CC-6', 28.2], 400]] } },
  br: { lang: 'pt', sym: 'R$', dp: 2, cny: 1.28, title: 'DANFE · NF-e', titleT: ['电子货物发票辅助单据', 'Electronic invoice (NF-e)'], pay: ['Boleto 28 dias', '28 天银行票据', 'Bank slip, 28 days'], bank: 'Itaú ····3021', buyer: 'Group Brasil Ltda.', buyerId: '45.XXX.XXX/0001-XX',
    row: { sup: 'Metalúrgica São Bento Ltda.', supAddr: 'São Bernardo do Campo, SP', supId: '12.345.678/0001-90', no: 'NF-e 000.951', date: '2026-10-09', po: 'PO-4500129204', due: '2026-11-06', rate: 0, net: 73700, tax: 10600, total: 84300, pages: 2, items: [[['Chapa de aço galvanizado', '镀锌钢板', 'Galvanized steel sheet', 2948], 25]] } },
};

/** 票面金额按原件格式（en-US 千分位，原币符号） */
function money(k: SampleKey, v: number): string {
  const d = DK[k];
  return d.sym + ' ' + Number(v).toLocaleString('en-US', { minimumFractionDigits: d.dp, maximumFractionDigits: d.dp });
}

/** 影像页（第 1 页为票面，第 2 页为明细与付款，第 3 页为附件） */
export function docPages(k: SampleKey): DocPage[] {
  const d = DK[k];
  const r = d.row;
  const lb = L[d.lang];
  const n = r.pages;
  const base = (i: number) => ({ title: d.title, pageLabel: 'Page ' + (i + 1) + ' / ' + n, noL: lb.no, no: r.no, dateL: lb.date, date: r.date, poL: lb.po, po: r.po });
  const out: DocPage[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      out.push({
        ...base(i),
        kind: 'main',
        sellerL: lb.seller,
        seller: r.sup,
        addrL: lb.addr,
        sellerAddr: r.supAddr,
        taxIdL: lb.taxId,
        sellerId: r.supId,
        buyerL: lb.buyer,
        buyer: d.buyer,
        buyerId: d.buyerId,
        itemL: lb.item,
        qtyL: lb.qty,
        priceL: lb.price,
        amountL: lb.amount,
        items: r.items.map(([it, q]) => ({ name: it[0], qty: q.toLocaleString('en-US'), price: money(k, it[3]), amt: money(k, q * it[3]) })),
        netL: lb.net,
        net: money(k, r.net),
        taxL: lb.tax + (r.rate ? ' ' + Math.round(r.rate * 100) + '%' : ''),
        tax: money(k, r.tax),
        totalL: lb.total,
        total: money(k, r.total),
        payL: lb.pay,
        pay: d.pay[0],
        bankL: lb.bank,
        bank: d.bank,
      });
    } else if (i === 1) {
      out.push({
        ...base(i),
        kind: 'text',
        textTitle: lb.item + ' · ' + lb.pay,
        lines: r.items
          .map(([it, q]) => it[0] + ' · ' + q.toLocaleString('en-US') + ' × ' + money(k, it[3]))
          .concat([lb.pay + ': ' + d.pay[0], lb.due + ': ' + r.due, lb.bank + ': ' + d.bank, lb.taxId + ': ' + r.supId]),
      });
    } else {
      out.push({
        ...base(i),
        kind: 'text',
        textTitle: d.lang === 'ja' ? '納品書（添付）' : 'Delivery note',
        lines: r.items
          .map(([it, q]) => it[0] + ' — ' + q)
          .concat([d.lang === 'ja' ? '検収日: 2026-09-01' : 'Received', d.lang === 'ja' ? '受領印: 済' : 'Signed', '—', '—']),
      });
    }
  }
  return out;
}

/** 识别数据分组（含字段名与值的中 / 英译文，由页面按开关与目标语言决定是否显示） */
export function docSections(k: SampleKey): DocSection[] {
  const d = DK[k];
  const r = d.row;
  const lb = L[d.lang];
  const R = (key: TransLabelKey, v: string, tv?: TransPair, cls?: DocRow['cls']): DocRow => ({ k: lb[key], tk: LBL[key], v, tv, cls });
  return [
    {
      title: '票面表头',
      rows: [R('title', d.title, d.titleT), R('no', r.no, undefined, 'mono'), R('date', r.date), R('seller', r.sup), R('taxId', r.supId, undefined, 'mono'), R('addr', r.supAddr), R('buyer', d.buyer), R('po', r.po, undefined, 'mono')],
    },
    {
      title: '行项目',
      rows: r.items.map(([it, q]) => ({
        k: it[0],
        v: q.toLocaleString('en-US') + ' × ' + money(k, it[3]) + ' = ' + money(k, q * it[3]),
        tv: [it[1], it[2]] as TransPair,
        cls: 'num' as const,
      })),
    },
    {
      title: '金额与税额',
      rows: [
        R('net', money(k, r.net), undefined, 'num'),
        R('tax', money(k, r.tax), undefined, 'num'),
        R('total', money(k, r.total), undefined, 'num'),
        { k: '折算 CNY', uiKey: true, v: 'CNY ' + (r.total * d.cny).toLocaleString('en-US', { maximumFractionDigits: 2 }), cls: 'num' },
      ],
    },
    { title: '付款信息', rows: [R('pay', d.pay[0], [d.pay[1], d.pay[2]]), R('due', r.due), R('bank', d.bank, undefined, 'mono')] },
  ];
}

export function buildDocument(k: SampleKey): InvoiceDocument {
  const lang = DK[k].lang;
  return { lang, langName: LANG_NAME[lang], pages: docPages(k), sections: docSections(k) };
}

/* ---------- 取数（mock） ---------- */

export function sampleOptions(): SampleOption[] {
  return SAMPLE_KEYS.map((k) => ({ key: k, id: INV[k].id, label: INV[k].label, countryCode: INV[k].countryCode }));
}

/** 按路由 id 查找示例；支持发票 id、票号或示例键，未命中回落到默认示例 */
export function resolveSample(id: string): { key: SampleKey; matched: boolean } {
  const norm = id.trim().toLowerCase();
  const hit = SAMPLE_KEYS.find(
    (k) => INV[k].id.toLowerCase() === norm || INV[k].no.toLowerCase() === norm || DK[k].row.no.toLowerCase() === norm || k === norm,
  );
  return hit ? { key: hit, matched: true } : { key: DEFAULT_SAMPLE, matched: false };
}

export function buildDetail(id: string): LifecycleDetail {
  const { key, matched } = resolveSample(id);
  return {
    requestedId: id,
    matched,
    invoice: INV[key],
    document: buildDocument(key),
    stepLabels: STEPS,
    route: ROUTE,
    matrix: MATRIX,
  };
}
