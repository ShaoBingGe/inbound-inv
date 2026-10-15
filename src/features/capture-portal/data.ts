import type {
  CorrectionRule,
  FieldRight,
  RecognizedField,
  SupplierKey,
  SupplierOption,
  SupplierPortal,
  PortalView,
} from './types';

/** 发票处理环节（进度条） */
export const STEPS = ['已接收', '识别', '校验', '三单匹配', '已入账', '已付款'] as const;

/** 近 6 个月 */
export const MONTHS = ['5月', '6月', '7月', '8月', '9月', '10月'] as const;

export const SUPPLIER_OPTIONS: SupplierOption[] = [
  { value: 'DE', label: 'Werner Antriebstechnik GmbH · 德国' },
  { value: 'JP', label: '株式会社宝田機械 · 日本' },
  { value: 'US', label: 'Blue Ridge Supply LLC · 美国' },
];

/** 原型初始选中的发票 */
export const INITIAL_SUPPLIER: SupplierKey = 'DE';
export const INITIAL_INVOICE = 'RE-2026-45399';

type FieldTuple = [string, string, string, number, FieldRight, string];
const fields = (xs: FieldTuple[]): RecognizedField[] =>
  xs.map(([key, label, value, conf, right, why]) => ({ key, label, value, conf, right, why }));

const SUP: Record<SupplierKey, SupplierPortal> = {
  DE: {
    key: 'DE',
    name: 'Werner Antriebstechnik GmbH',
    code: 'SUP-0021004',
    country: '德国',
    buyer: 'DE-MUC-01',
    submitted: '38 张',
    amount: '€ 412,600.00',
    err: '2.2%',
    avg: '4.1%',
    unpaid: '€ 86,240.00',
    payDay: '2026-10-20',
    einv: 'ZUGFeRD / XRechnung',
    tips: [
      '优先上传 ZUGFeRD 或 XRechnung：结构化字段直接读取，无需 OCR',
      '在票面打印买方 PO 号（如 PO-45001…）',
      'Leistungsdatum 与 Rechnungsdatum 分行标注',
    ],
    trend: [4.8, 4.1, 3.6, 3.0, 2.6, 2.2],
    trendNote: '自 6 月起改用 ZUGFeRD 后错误率下降 54%；剩余错误集中在 PDF 呈现件的 Leistungsdatum。',
    invs: [
      {
        no: 'RE-2026-44713',
        date: '2026-08-29',
        amt: '€12,480.00',
        po: 'PO-4500126610',
        stage: 5,
        err: [1, 13],
        fields: fields([
          ['vat', 'USt-IdNr.', 'DE811907980', 0.99, 'lock', '来自 XML 主件'],
          ['ldate', 'Leistungsdatum', '2026-08-28', 0.74, 'review', '与 XML 不一致时以 XML 为准'],
          ['total', 'Gesamtbetrag', '€12.480,00', 0.99, 'lock', '已付款，金额冻结'],
          ['po', 'Bestellnummer', 'PO-4500126610', 0.97, 'own', '归属类字段'],
        ]),
      },
      {
        no: 'RE-2026-45102',
        date: '2026-09-18',
        amt: '€24,960.00',
        po: 'PO-4500128034',
        stage: 3,
        err: [0, 13],
        fields: fields([
          ['vat', 'USt-IdNr.', 'DE811907980', 0.99, 'lock', '来自 XML 主件'],
          ['total', 'Gesamtbetrag', '€24.960,00', 0.99, 'lock', '来自 XML 主件'],
          ['po', 'Bestellnummer', 'PO-4500128034', 0.98, 'own', '归属类字段'],
        ]),
      },
      {
        no: 'RE-2026-45399',
        date: '2026-10-02',
        amt: '€61,280.00',
        po: '—',
        stage: 2,
        err: [2, 12],
        fields: fields([
          ['iban', 'IBAN', 'DE89 3704 0044 0532 0130 00', 0.96, 'lock', '收款账户须走主数据变更'],
          ['ldate', 'Leistungsdatum', '2026-09-3O', 0.58, 'review', '日期格式异常'],
          ['po', 'Bestellnummer', '—', 0, 'own', '未识别到 PO'],
        ]),
      },
    ],
    reqs: [
      {
        id: 'r1',
        title: '请开具更正发票（Rechnungskorrektur）',
        inv: 'RE-2026-45102',
        body: '第 3 行单价与 PO 不符（€ 2,080.00 vs € 1,980.00），差额 € 1,200.00。该发票已入账，金额不得在系统中直接更正。',
        comp: '开具 Gutschrift 冲抵差额，原发票保留',
        due: '2026-10-27',
        cta: '上传 Gutschrift',
      },
    ],
  },
  JP: {
    key: 'JP',
    name: '株式会社宝田機械',
    code: 'SUP-0013397',
    country: '日本',
    buyer: 'JP-TYO-01',
    submitted: '26 张',
    amount: '¥ 18,420,000',
    err: '12.4%',
    avg: '3.6%',
    unpaid: '¥ 3,904,000',
    payDay: '2026-10-31',
    einv: 'Peppol JP PINT',
    tips: ['登録番号请使用打印字体，避免手写追记', '标准税率与軽減税率分栏列示', '多页请求书请在首页注明总页数'],
    trend: [14.9, 15.2, 13.8, 13.1, 12.9, 12.4],
    trendNote: '错误主要来自手写追记与税率区分；近 3 个月您的票已作为高频修正样本进入训练集。',
    invs: [
      {
        no: 'TK-2609-0031',
        date: '2026-09-03',
        amt: '¥992,200',
        po: '—',
        stage: 1,
        err: [4, 14],
        fields: fields([
          ['reg', '登録番号', 'T7010001O81486', 0.62, 'review', '需公表サイト校验'],
          ['rate', '税率区分', '8%（軽減）', 0.55, 'review', '税率需买方复核'],
          ['tax', '消費税額', '¥72,160', 0.58, 'review', '金额类需复核'],
          ['po', 'PO 番号', '—', 0, 'own', '归属类字段'],
        ]),
      },
      {
        no: 'TK-2608-0117',
        date: '2026-08-21',
        amt: '¥1,408,000',
        po: 'PO-4500125519',
        stage: 4,
        err: [1, 14],
        fields: fields([
          ['reg', '登録番号', 'T7010001081486', 0.99, 'review', '已校验'],
          ['tax', '消費税額', '¥128,000', 0.97, 'lock', '已入账，金额冻结'],
        ]),
      },
    ],
    reqs: [
      {
        id: 'r2',
        title: '税率区分有误，请重新开具適格請求書',
        inv: 'TK-2607-0090',
        body: '机械设备适用 10% 标准税率，票面按 8% 計算。该票已付款，差额 ¥18,040 需补开。',
        comp: '开具修正適格請求書（返還インボイス）+ 差额补付',
        due: '2026-10-25',
        cta: '上传修正請求書',
      },
    ],
  },
  US: {
    key: 'US',
    name: 'Blue Ridge Supply LLC',
    code: 'SUP-0030882',
    country: '美国',
    buyer: 'US-ATL-01',
    submitted: '61 张',
    amount: '$ 702,480.00',
    err: '18.9%',
    avg: '7.2%',
    unpaid: '$ 120,410.00',
    payDay: '2026-10-15',
    einv: 'EDI 810 / cXML',
    tips: ['Sales tax 单独一行列示，不要并入 Subtotal', 'PO number 放在页眉而非页脚', '可改用 EDI 810 / cXML 直连，跳过 OCR'],
    trend: [21.0, 20.4, 22.1, 19.6, 19.2, 18.9],
    trendNote: '税额并入小计导致金额勾稽失败，是您错误率高于同国平均的主要原因。',
    invs: [
      {
        no: 'BR-77120',
        date: '2026-09-15',
        amt: '$12,022.90',
        po: '—',
        stage: 3,
        err: [3, 11],
        fields: fields([
          ['sub', 'Subtotal', '$12,022.90', 0.52, 'review', '金额类需复核'],
          ['tax', 'Sales tax', '$0.00', 0.41, 'review', '金额类需复核'],
          ['po', 'PO number', '—', 0, 'own', '归属类字段'],
          ['bank', 'Remit-to', '****4392', 0.93, 'lock', '收款账户须走主数据变更'],
        ]),
      },
      {
        no: 'BR-77098',
        date: '2026-09-02',
        amt: '$12,022.90',
        po: 'PO-4500128871',
        stage: 2,
        err: [0, 11],
        fields: fields([
          ['sub', 'Subtotal', '$11,280.00', 0.95, 'review', '已识别'],
          ['po', 'PO number', 'PO-4500128871', 0.96, 'own', '归属类字段'],
        ]),
      },
    ],
    reqs: [
      {
        id: 'r3',
        title: '疑似重复开票，请确认',
        inv: 'BR-77120',
        body: '与 BR-77098 同金额、同 PO 行，且未见新收货记录。若为重复，请作废；若为新发货，请补充 BOL。',
        comp: '作废（Void）或开具 Credit memo；如已付款则抵扣下次付款',
        due: '2026-10-20',
        cta: '补充说明 / 上传 Credit memo',
      },
    ],
  },
};

/** 更正规则（供应商可见） */
export const RULES: CorrectionRule[] = [
  { label: '可直接更正', tone: 'green', what: 'PO 号、送货单号、备注等归属类信息', how: '提交即生效，买方系统重新匹配' },
  {
    label: '可标注，买方复核',
    tone: 'orange',
    what: 'OCR 识别的票面金额、税额、日期、税号',
    how: '与票面影像一致方可通过；金额差超过 1% 需买方第二人复核',
  },
  {
    label: '不得更正',
    tone: 'red',
    what: '结构化电子发票主件字段、已入账或已付款的金额、收款账户',
    how: '票面有误时开具更正票据（红字发票、Gutschrift、Credit memo、修正請求書）；账户变更走主数据流程',
  },
  { label: '补偿', tone: 'blue', what: '已付款后发现差额', how: '少付：买方生成差额付款；多付：开具 Credit memo，在下次付款中抵扣' },
];

export function buildPortalView(key: SupplierKey): PortalView {
  return {
    supplier: SUP[key],
    suppliers: SUPPLIER_OPTIONS,
    steps: [...STEPS],
    months: [...MONTHS],
    rules: RULES,
  };
}
