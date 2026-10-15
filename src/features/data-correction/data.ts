/** 发票数据修正：示例数据（与设计稿 Correction.dc.html 一致） */
import type {
  CompensationType,
  CorrectionInvoice,
  CorrectionReference,
  CorrectionWorkspace,
  FieldChange,
  FieldGroup,
  FieldSource,
  FlowStep,
  InvoiceField,
  MatrixCell,
  MatrixRow,
} from './types';
import type { Tone } from '@/components/ui';

export const STAGE_NAMES = ['采集中', '已查验 / 税局同步', '审核中', '已入账', '已付款'];

/** 变更记录中的示例操作人与复核人 */
export const MOCK_OPERATOR = '李 敏（AP）';
export const MOCK_REVIEWER = '王 琳（AP 主管）';

function fld(
  key: string,
  label: string,
  ocr: string,
  cur: string,
  conf: number,
  group: FieldGroup,
  src: FieldSource,
  box: [number, number, number, number],
  uiLabel = false,
): InvoiceField {
  return { key, label, uiLabel, ocr, cur, conf, group, src, box };
}

type SeedRow = [string, string, string, string, string, string, string, string, 'applied' | 'pending', string];

interface InvoiceSeed extends Omit<CorrectionInvoice, 'errs' | 'suggest'> {
  seedLog: SeedRow[];
}

const INVS: InvoiceSeed[] = [
  {
    id: 'INV-JP-2609-01872',
    sup: '株式会社宝田機械',
    country: '日本',
    countryCode: 'JP',
    kind: '適格請求書 · PDF',
    stageIdx: 0,
    from: '发票采集页',
    doc: '—',
    authority: '票面影像（OCR）',
    hash: '9f3a…c21e',
    tplRate: '12.4%',
    fields: [
      fld('regno', '登録番号', 'T7010001O81486', 'T7010001O81486', 0.62, 'id', 'OCR', [62, 6, 30, 4]),
      fld('date', '請求日', '2026-09-03', '2026-09-03', 0.98, 'date', 'OCR', [62, 11, 30, 3]),
      fld('rate', '税率区分', '8%（軽減）', '8%（軽減）', 0.55, 'tax', 'OCR', [60, 62, 32, 4]),
      fld('tax', '消費税額', '¥72,160', '¥72,160', 0.58, 'tax', 'OCR', [60, 68, 32, 4]),
      fld('total', '合計金額', '¥992,200', '¥992,200', 0.97, 'amount', 'OCR', [60, 74, 32, 5]),
      fld('po', 'PO 番号', '—', '—', 0, 'attr', 'OCR', [8, 30, 36, 4]),
      fld('supplier', '供应商归属', 'SUP-0013397', 'SUP-0013397', 0.9, 'attr', '主数据匹配', [8, 15, 46, 4], true),
    ],
    seedLog: [],
  },
  {
    id: 'INV-CN-2609-18842',
    sup: '江苏恒立液压股份有限公司',
    country: '中国大陆',
    countryCode: 'CN',
    kind: '数电专票 · 税局票池',
    stageIdx: 3,
    from: '看板下钻',
    doc: 'AP-2609-00412',
    authority: '国家税务总局 全国增值税发票查验平台',
    hash: '1b77…08aa',
    tplRate: '3.1%',
    fields: [
      fld('no', '发票号码', '26372000000018842', '26372000000018842', 1.0, 'id', '税局', [62, 6, 30, 4], true),
      fld('date', '开票日期', '2026-09-08', '2026-09-08', 0.99, 'date', '税局', [62, 11, 30, 3], true),
      fld('sellerTax', '销方税号', '91320400MA1XXXX7Q', '91320400MA1XXXX7Q', 0.97, 'id', '税局', [8, 15, 46, 4], true),
      fld('tax', '税额', '¥13,000.00', '¥13,575.22', 0.79, 'tax', '税局', [60, 68, 32, 4], true),
      fld('total', '价税合计', '¥113,000.00', '¥118,000.00', 0.81, 'amount', '税局', [60, 74, 32, 5], true),
      fld('cat', '费用科目', '原材料-液压件', '原材料-液压件', 0.88, 'attr', '规则', [8, 44, 50, 3], true),
    ],
    seedLog: [
      ['税局覆盖', 'tax', '¥13,000.00', '¥13,575.22', '税局比对', '字符误识', 'system', '—', 'applied', '2026-09-08 10:21'],
      ['税局覆盖', 'total', '¥113,000.00', '¥118,000.00', '税局比对', '字符误识', 'system', '—', 'applied', '2026-09-08 10:21'],
    ],
  },
  {
    id: 'INV-US-2609-02210',
    sup: 'Blue Ridge Supply LLC',
    country: '美国',
    countryCode: 'US',
    kind: 'Invoice · 邮件 PDF',
    stageIdx: 2,
    from: '供应商票夹',
    doc: 'AP-2609-01877',
    authority: '票面影像（OCR）',
    hash: '5cd0…7f19',
    tplRate: '18.9%',
    fields: [
      fld('no', 'Invoice no.', 'BR-77120', 'BR-77120', 0.96, 'id', 'OCR', [62, 6, 30, 4]),
      fld('subtotal', 'Subtotal', '$12,022.90', '$12,022.90', 0.52, 'amount', 'OCR', [60, 62, 32, 4]),
      fld('tax', 'Sales tax', '$0.00', '$0.00', 0.41, 'tax', 'OCR', [60, 68, 32, 4]),
      fld('total', 'Total', '$12,022.90', '$12,022.90', 0.95, 'amount', 'OCR', [60, 74, 32, 5]),
      fld('po', 'PO number', '—', '—', 0, 'attr', 'OCR', [8, 88, 40, 3]),
      fld('bank', 'Remit-to account', '****4392', '****4392', 0.93, 'bank', 'OCR', [8, 80, 44, 4]),
    ],
    seedLog: [],
  },
  {
    id: 'INV-DE-2609-01104',
    sup: 'Werner Antriebstechnik GmbH',
    country: '德国',
    countryCode: 'DE',
    kind: 'Rechnung · ZUGFeRD',
    stageIdx: 4,
    from: '供应商门户',
    doc: 'PAY-2609-0331',
    authority: 'ZUGFeRD XML（结构化）',
    hash: 'e402…9b3c',
    tplRate: '2.2%',
    fields: [
      fld('vat', 'USt-IdNr.', 'DE811907980', 'DE811907980', 0.99, 'id', 'XML', [62, 6, 30, 4]),
      fld('ldate', 'Leistungsdatum', '2026-08-28', '2026-08-28', 0.74, 'date', 'OCR', [62, 11, 30, 3]),
      fld('total', 'Gesamtbetrag', '€12.480,00', '€12.480,00', 0.99, 'amount', 'XML', [60, 74, 32, 5]),
      fld('bank', 'IBAN', 'DE89 3704 ···· 3000', 'DE89 3704 ···· 3000', 0.98, 'bank', 'XML', [8, 80, 44, 4]),
      fld('cc', '成本中心', 'CC-4410', 'CC-4410', 0.9, 'attr', '规则', [8, 44, 50, 3], true),
    ],
    seedLog: [],
  },
];

/** 复核人找到的真值（预填建议） */
const SUGGEST: Record<string, string> = {
  'INV-JP-2609-01872:regno': 'T7010001081486',
  'INV-JP-2609-01872:rate': '10%',
  'INV-JP-2609-01872:tax': '¥90,200',
  'INV-JP-2609-01872:po': 'PO-4500127730',
  'INV-US-2609-02210:subtotal': '$11,280.00',
  'INV-US-2609-02210:tax': '$742.90',
  'INV-US-2609-02210:po': 'PO-4500128871',
  'INV-DE-2609-01104:ldate': '2026-08-29',
  'INV-CN-2609-18842:cat': '原材料-液压件',
  'INV-DE-2609-01104:cc': 'CC-4410',
};

/** 已标注识别有误的字段 */
const ERRS: Record<string, string[]> = {
  'INV-JP-2609-01872': ['regno', 'rate', 'tax', 'po'],
  'INV-CN-2609-18842': ['tax', 'total'],
  'INV-US-2609-02210': ['subtotal', 'tax', 'po'],
  'INV-DE-2609-01104': ['ldate'],
};

/** 变更记录 / 补偿事件编号起点（FC-9000、CE-9000 …） */
export const MOCK_SEQ_START = 9000;

export function buildWorkspace(): CorrectionWorkspace {
  const invoices: CorrectionInvoice[] = [];
  const logs: Record<string, FieldChange[]> = {};
  INVS.forEach(({ seedLog, ...inv }) => {
    const suggest: Record<string, string> = {};
    inv.fields.forEach((f) => {
      const v = SUGGEST[inv.id + ':' + f.key];
      if (v !== undefined) suggest[f.key] = v;
    });
    invoices.push({
      ...inv,
      fields: inv.fields.map((f) => ({ ...f, box: [...f.box] as InvoiceField['box'] })),
      errs: [...(ERRS[inv.id] ?? [])],
      suggest,
    });
    logs[inv.id] = seedLog.map((r, i) => ({
      cid: 'FC-' + (8800 + i),
      ver: 'v' + (i + 2),
      field: r[1],
      before: r[2],
      after: r[3],
      source: r[4],
      etype: r[5],
      op: r[6],
      rev: r[7],
      status: r[8],
      at: r[9],
    }));
  });
  return { invoices, logs, comps: {} };
}

const FLOW: FlowStep[] = [
  ['标注', '在影像上框选错误字段'],
  ['更正', '填写正确值与错误类型'],
  ['规则重校验', '税号、勾稽、税率、查重'],
  ['复核', '金额/税号类四眼复核'],
  ['生效', '生成新版本快照'],
  ['下游补偿', '撤回、冲销、红冲、差额'],
  ['样本回流', '进入 OCR 回流样本池'],
].map(([label, sub]) => ({ label, sub }));

const C = (tone: Tone, label: string, note: string): MatrixCell => ({ tone, label, note });

const MATRIX: MatrixRow[] = [
  {
    label: '结构化法定字段',
    eg: '数电票 / SdI / CFDI / NF-e / ZATCA / IRN 的票号、日期、税号、金额',
    cells: [
      C('red', '不得更正', '以税局或清关平台数据为准'),
      C('red', '不得更正', '识别差异由税局值覆盖'),
      C('red', '不得更正', '业务有误：红字发票 / 作废重开'),
      C('red', '不得更正', '红冲 + 冲销凭证'),
      C('red', '不得更正', '红冲 + 差额补付或扣款'),
    ],
  },
  {
    label: '原件与影像',
    eg: 'PDF、图片、XML 原文件及其哈希',
    cells: [
      C('red', '不得更正', '只可追加附件'),
      C('red', '不得更正', '—'),
      C('red', '不得更正', '—'),
      C('red', '不得更正', '—'),
      C('red', '不得更正', '—'),
    ],
  },
  {
    label: '非结构化票面金额 / 税额',
    eg: 'OCR 识别的 Subtotal、消費税額、MwSt 等',
    cells: [
      C('orange', '复核后生效', '差 > 1% 或 > 500 CNY 需四眼'),
      C('orange', '复核后生效', '与在线校验结果一致'),
      C('orange', '复核后生效', '撤回 AP 单 / 费控单后重推'),
      C('red', '不得更正', '冲销凭证后重做'),
      C('red', '不得更正', '差额补付或 Debit memo'),
    ],
  },
  {
    label: '票面标识类',
    eg: '票号、税号、登録番号、USt-IdNr.',
    cells: [
      C('orange', '复核后生效', '需在线校验通过'),
      C('orange', '复核后生效', '—'),
      C('orange', '复核后生效', '重新三单匹配'),
      C('orange', '复核后生效', '财务复核，生成调整记录'),
      C('red', '不得更正', '供应商更正发票'),
    ],
  },
  {
    label: '收款银行账户',
    eg: 'IBAN、Remit-to、銀行口座',
    cells: [
      C('orange', '复核后生效', '与主数据比对'),
      C('orange', '复核后生效', '—'),
      C('red', '不得更正', '走主数据变更 + 回拨确认'),
      C('red', '不得更正', '同左'),
      C('red', '不得更正', '同左'),
    ],
  },
  {
    label: '归属与分类',
    eg: '供应商归属、PO 号、费用科目、成本中心、发生地',
    cells: [
      C('green', '可直接更正', '记录日志'),
      C('green', '可直接更正', '—'),
      C('green', '可直接更正', '自动撤回并重新匹配'),
      C('orange', '复核后生效', '生成重分类分录'),
      C('orange', '复核后生效', '仅重分类，不影响付款'),
    ],
  },
];

const COMP_TYPES: CompensationType[] = [
  {
    title: '下游撤回重推',
    when: '审核中更正生效',
    how: 'Saga：撤回 AP 单或费控单 → 重新三单匹配 / 预算校验 → 重推审批流；任一步失败自动回滚并告警',
  },
  {
    title: '红字发票 / 作废重开',
    when: '结构化发票业务内容有误',
    how: '购方发起红字确认单（或 CFDI cancelación、Nota de crédito），新票到达后自动关联原票',
  },
  { title: '冲销重做', when: '已入账后金额类错误', how: '冲销原凭证，按新版本重新过账；期间已关闭时在当期生成调整分录' },
  { title: '差额补付 / 扣款', when: '已付款后金额差异', how: '少付生成差额付款单；多付开具 Debit memo，在下次付款中抵扣' },
  {
    title: '样本回流',
    when: '任何被更正或被税局覆盖的识别错误',
    how: '影像与真值进入回流样本池，由标注与清洗 Agent 处理后参与下一版本训练',
  },
];

export const ERROR_TYPES = ['字符误识', '漏识', '多识', '字段错位', '格式或单位错误', '影像质量'];

export function buildReference(): CorrectionReference {
  return {
    stageNames: [...STAGE_NAMES],
    flow: FLOW,
    matrixStages: ['采集中', '已查验 / 税局同步', '审核中（AP 单 · 费控单）', '已入账', '已付款'],
    matrix: MATRIX,
    compTypes: COMP_TYPES,
    errorTypes: [...ERROR_TYPES],
  };
}
