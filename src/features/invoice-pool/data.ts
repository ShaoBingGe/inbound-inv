/**
 * 企业票池示例数据（mock）。与设计稿 InvoicePool.dc.html 的生成逻辑一致（确定性随机），
 * 页面不要直接 import，统一经 api.ts 取数。
 */
import { hs, rng } from '@/lib/sample';
import { fmtMoney, rnd2 } from './format';
import type {
  CountryCode,
  CountryConfig,
  CountryInfo,
  DataRow,
  DataSection,
  DocLabels,
  DocLang,
  Entity,
  FlagKey,
  ImagePage,
  InvoiceDetail,
  InvoiceRow,
  LabelKey,
  LifeStep,
  LineItem,
  OrgCatalog,
  OrgQuery,
  RecognizedData,
  ReviewDoc,
  Supplier,
  SupplierItem,
  TranslateTarget,
} from './types';

/* ======== 票面文字：原文标签（按语言）与翻译 ======== */
export const LBL: Record<LabelKey, [string, string]> = {
  no: ['发票号码', 'Invoice No.'],
  date: ['开票日期', 'Issue date'],
  seller: ['销售方', 'Seller'],
  buyer: ['购买方', 'Buyer'],
  taxId: ['税号', 'Tax ID'],
  addr: ['地址', 'Address'],
  po: ['订单号', 'PO No.'],
  item: ['项目', 'Item'],
  qty: ['数量', 'Qty'],
  price: ['单价', 'Unit price'],
  amount: ['金额', 'Amount'],
  net: ['不含税金额', 'Net amount'],
  tax: ['税额', 'Tax'],
  total: ['价税合计', 'Total'],
  pay: ['付款条件', 'Payment terms'],
  due: ['到期日', 'Due date'],
  bank: ['收款账户', 'Bank account'],
  title: ['票据类型', 'Document type'],
};

export const L: Record<DocLang, DocLabels> = {
  zh: { no: '发票号码', date: '开票日期', seller: '销售方', buyer: '购买方', taxId: '纳税人识别号', addr: '地址', po: '订单号', item: '项目名称', qty: '数量', price: '单价', amount: '金额', net: '合计', tax: '税额', total: '价税合计（小写）', pay: '付款条件', due: '到期日', bank: '开户行及账号', title: '票据类型' },
  ja: { no: '請求書番号', date: '発行日', seller: '発行者', buyer: '宛先', taxId: '登録番号', addr: '住所', po: '注文番号', item: '品名', qty: '数量', price: '単価', amount: '金額', net: '小計（税抜）', tax: '消費税額', total: '合計金額（税込）', pay: '支払条件', due: '支払期日', bank: '振込先', title: '書類区分' },
  ko: { no: '승인번호', date: '작성일자', seller: '공급자', buyer: '공급받는자', taxId: '사업자등록번호', addr: '주소', po: '주문번호', item: '품목', qty: '수량', price: '단가', amount: '공급가액', net: '공급가액 합계', tax: '세액', total: '합계금액', pay: '결제조건', due: '지급기한', bank: '입금계좌', title: '문서 종류' },
  vi: { no: 'Số hóa đơn', date: 'Ngày lập', seller: 'Đơn vị bán hàng', buyer: 'Đơn vị mua hàng', taxId: 'Mã số thuế', addr: 'Địa chỉ', po: 'Số đơn hàng', item: 'Tên hàng hóa, dịch vụ', qty: 'Số lượng', price: 'Đơn giá', amount: 'Thành tiền', net: 'Cộng tiền hàng', tax: 'Tiền thuế GTGT', total: 'Tổng tiền thanh toán', pay: 'Hình thức thanh toán', due: 'Hạn thanh toán', bank: 'Số tài khoản', title: 'Loại chứng từ' },
  en: { no: 'Invoice No.', date: 'Invoice Date', seller: 'From', buyer: 'Bill To', taxId: 'Tax ID', addr: 'Address', po: 'PO Number', item: 'Description', qty: 'Qty', price: 'Unit Price', amount: 'Amount', net: 'Subtotal', tax: 'Tax', total: 'Total', pay: 'Terms', due: 'Due Date', bank: 'Remit To', title: 'Document' },
  de: { no: 'Rechnungsnummer', date: 'Rechnungsdatum', seller: 'Rechnungssteller', buyer: 'Rechnungsempfänger', taxId: 'USt-IdNr.', addr: 'Anschrift', po: 'Bestellnummer', item: 'Bezeichnung', qty: 'Menge', price: 'Einzelpreis', amount: 'Betrag', net: 'Nettobetrag', tax: 'MwSt.', total: 'Gesamtbetrag', pay: 'Zahlungsbedingungen', due: 'Fällig am', bank: 'Bankverbindung', title: 'Belegart' },
  fr: { no: 'N° de facture', date: 'Date de facture', seller: 'Émetteur', buyer: 'Client', taxId: 'N° TVA intracom.', addr: 'Adresse', po: 'N° de commande', item: 'Désignation', qty: 'Qté', price: 'Prix unitaire HT', amount: 'Montant HT', net: 'Total HT', tax: 'TVA', total: 'Total TTC', pay: 'Conditions de paiement', due: 'Échéance', bank: 'IBAN', title: 'Type de document' },
  es: { no: 'Folio fiscal', date: 'Fecha de emisión', seller: 'Emisor', buyer: 'Receptor', taxId: 'RFC', addr: 'Domicilio fiscal', po: 'Orden de compra', item: 'Descripción', qty: 'Cantidad', price: 'Valor unitario', amount: 'Importe', net: 'Subtotal', tax: 'IVA', total: 'Total', pay: 'Método de pago', due: 'Vencimiento', bank: 'Cuenta', title: 'Tipo de comprobante' },
  pt: { no: 'Número / Chave', date: 'Data de emissão', seller: 'Emitente', buyer: 'Destinatário', taxId: 'CNPJ', addr: 'Endereço', po: 'Pedido de compra', item: 'Descrição do produto', qty: 'Qtd.', price: 'Valor unitário', amount: 'Valor total', net: 'Valor dos produtos', tax: 'ICMS + IPI', total: 'Valor total da nota', pay: 'Condição de pagamento', due: 'Vencimento', bank: 'Dados bancários', title: 'Documento' },
};

type ItemTuple = [string, string, string, number];
function sup(
  name: string,
  code: string,
  industry: string,
  addr: string,
  taxId: string,
  rate: number,
  review: 'AP' | 'EXP',
  noPrefix: string,
  items: ItemTuple[],
): Supplier {
  return {
    name,
    code,
    industry,
    addr,
    taxId,
    rate,
    review,
    noPrefix,
    items: items.map(([orig, zh, en, price]): SupplierItem => ({ orig, zh, en, price })),
  };
}

/* ======== 国家配置 ======== */
export const CC: Record<CountryCode, CountryConfig> = {
  CN: {
    code: 'CN', name: '中国大陆', lang: 'zh', cur: 'CNY', sym: '¥', dp: 2, cny: 1, dc: 'CN-QD', ruleVer: 'CN-VAT-2026.2', regime: '增值税',
    kinds: ['数电专票', '数电普票'], title: ['电子发票（增值税专用发票）', '电子发票（普通发票）'],
    titleT: [['增值税专用发票', 'VAT special invoice'], ['普通发票', 'General e-invoice']], taxName: '增值税',
    truth: '税局查验正常 · 验重通过', ded: '用途确认 · 进项抵扣', filing: '按月申报 · 次月 15 日前', archive: '电子原件 10 年', treat: '进项抵扣', treatPaid: '已认证抵扣',
    revMech: '红字发票（红字确认单 → 红字数电票）', revHow: '购方发起红字确认单，供应商开具红字发票并引用原票号',
    rules: [['抵扣条件', '专票 · 购方税号一致 · 用途为应税项目'], ['申报', '按月，次月 15 日前'], ['逆向机制', '红字发票，不作废已交付票'], ['不得更正', '票面字段以税局为准']],
    pay: ['月结 60 天', '月结 60 天', 'Net 60 days'], payDays: 60, bank: '招商银行上海分行 ···· 4392',
    ch: ['税局同步', '税局同步', '税局同步', 'ERP 嵌入 H5', '供应商门户', '邮箱采集'],
    sups: [
      sup('江苏恒立液压股份有限公司', 'SUP-0007712', '原材料', '江苏省常州市武进区', '91320400MA1XXXX7Q', 0.13, 'AP', 'cn', [['液压油缸 HC-80', '液压油缸 HC-80', 'Hydraulic cylinder HC-80', 5221.24], ['密封件套装', '密封件套装', 'Seal kit', 186.5]]),
      sup('深圳市华讯电子元器件有限公司', 'SUP-0009356', '电子元器件', '广东省深圳市南山区', '91440300MA5XXXX2K', 0.13, 'AP', 'cn', [['MCU 控制芯片', 'MCU 控制芯片', 'MCU controller chip', 12.6], ['贴片电容 0402', '贴片电容 0402', 'SMD capacitor 0402', 0.08]]),
      sup('华东通达物流有限公司', 'SUP-0008841', '物流运输', '上海市浦东新区', '91310115MA1XXXX8D', 0.09, 'AP', 'cn', [['国内公路运输服务', '国内公路运输服务', 'Domestic road freight', 3200]]),
      sup('上海虹桥商务酒店有限公司', 'SUP-0013120', '差旅与行政', '上海市长宁区', '91310105MA1XXXX3H', 0.06, 'EXP', 'cn', [['住宿服务', '住宿服务', 'Accommodation', 580], ['餐饮服务', '餐饮服务', 'Catering', 120]]),
    ],
  },
  JP: {
    code: 'JP', name: '日本', lang: 'ja', cur: 'JPY', sym: '¥', dp: 0, cny: 0.0512, dc: 'JP-TYO', ruleVer: 'JP-JCT-2026.1', regime: '消費税（JCT）',
    kinds: ['適格請求書', '適格簡易請求書'], title: ['適格請求書', '適格簡易請求書'],
    titleT: [['合格发票（適格請求書）', 'Qualified invoice'], ['简易合格发票', 'Simplified qualified invoice']], taxName: '消費税',
    truth: '登録番号公表サイト有效', ded: '仕入税額控除（帳簿 + 請求書保存）', filing: '年度申告 + 中間申告', archive: '電子帳簿保存法 7 年', treat: '仕入税額控除', treatPaid: '已控除',
    revMech: '返還インボイス / 修正適格請求書', revHow: '供应商开具返還インボイス并注明原請求書番号与対象期間',
    rules: [['控除条件', '登録番号有效 · 税率区分明示 · 帳簿记载'], ['申报', '年度申告 + 中間申告'], ['逆向机制', '返還インボイス / 修正適格請求書'], ['经過措置', '非適格发票仅 80% 控除（至 2026-09-30）']],
    pay: ['月末締め翌月末払い', '月末结算，次月末付款', 'Month-end closing, paid end of next month'], payDays: 45, bank: 'みずほ銀行 芝支店 普通 ····1774',
    ch: ['ERP 嵌入 H5', '邮箱采集', '邮箱采集', '供应商门户', 'Peppol'],
    sups: [
      sup('株式会社宝田機械', 'SUP-0013397', '设备与模具', '東京都港区芝浦 3-1-1', 'T7010001081486', 0.1, 'AP', 'TK', [['精密プレス金型 P-12', '精密冲压模具 P-12', 'Precision press die P-12', 820000], ['据付・調整作業', '安装调试', 'Installation & adjustment', 82000]]),
      sup('日本通運株式会社', 'SUP-0013455', '物流运输', '東京都千代田区', 'T4010001034920', 0.1, 'AP', 'NX', [['海上輸送付帯費用', '海运附加费', 'Ocean freight surcharge', 15800]]),
      sup('タイムズ24株式会社', 'SUP-0013502', '差旅与行政', '東京都品川区', 'T4010001137774', 0.1, 'EXP', 'TM', [['駐車場利用料', '停车费', 'Parking fee', 2200]]),
    ],
  },
  KR: {
    code: 'KR', name: '韩国', lang: 'ko', cur: 'KRW', sym: '₩', dp: 0, cny: 0.0052, dc: 'JP-TYO', ruleVer: 'KR-VAT-2026.1', regime: '부가가치세（VAT）',
    kinds: ['전자세금계산서'], title: ['전자세금계산서', '전자세금계산서'],
    titleT: [['电子税务发票', 'Electronic tax invoice'], ['电子税务发票', 'Electronic tax invoice']], taxName: '부가가치세',
    truth: '국세청 홈택스 전송 확인', ded: '매입세액 공제', filing: '分季度预定 / 确定申报', archive: '5 年', treat: '进项抵扣', treatPaid: '已抵扣',
    revMech: '수정세금계산서（负数）', revHow: '供应商开具수정세금계산서并引用原승인번호',
    rules: [['抵扣条件', '国税厅已传送的电子税务发票'], ['申报', '每季度预定 + 每半年确定'], ['逆向机制', '수정세금계산서'], ['存档', '5 年']],
    pay: ['세금계산서 발행 후 30일', '开票后 30 天', '30 days after invoice'], payDays: 30, bank: '국민은행 ····5521',
    ch: ['税局同步', '税局同步', '邮箱采集', '供应商门户'],
    sups: [
      sup('서울정밀부품(주)', 'SUP-0015021', '原材料', '서울특별시 금천구', '120-86-12345', 0.1, 'AP', 'SJ', [['정밀 베어링 6204', '精密轴承 6204', 'Precision bearing 6204', 4800]]),
      sup('한빛물류(주)', 'SUP-0015088', '物流运输', '경기도 평택시', '124-81-55667', 0.1, 'AP', 'HB', [['국내 운송 서비스', '国内运输服务', 'Domestic transport service', 350000]]),
    ],
  },
  VN: {
    code: 'VN', name: '越南', lang: 'vi', cur: 'VND', sym: '₫', dp: 0, cny: 0.00029, dc: 'SEA-SIN', ruleVer: 'VN-VAT-2026.1', regime: 'Thuế GTGT（VAT）',
    kinds: ['Hóa đơn GTGT'], title: ['HÓA ĐƠN GIÁ TRỊ GIA TĂNG', 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG'],
    titleT: [['增值税发票', 'VAT invoice'], ['增值税发票', 'VAT invoice']], taxName: 'Thuế GTGT',
    truth: 'Tổng cục Thuế 查验通过', ded: '进项抵扣（≥ 2,000 万 VND 须银行付款凭证）', filing: '按月 / 季申报', archive: '10 年', treat: '进项抵扣', treatPaid: '已抵扣',
    revMech: 'Hóa đơn điều chỉnh / thay thế', revHow: '开具调整或替代发票，引用原票符号与号码',
    rules: [['抵扣条件', '电子发票经税局编码 · 非现金付款'], ['申报', '按月或按季'], ['逆向机制', '调整 / 替代发票'], ['存档', '10 年']],
    pay: ['Chuyển khoản trong 30 ngày', '30 天内银行转账', 'Bank transfer within 30 days'], payDays: 30, bank: 'Vietcombank ····8810',
    ch: ['邮箱采集', '邮箱采集', 'ERP 嵌入 H5', '税局同步'],
    sups: [
      sup('Công ty TNHH Cơ khí Minh Phát', 'SUP-0016011', '设备与模具', 'KCN Quế Võ, Bắc Ninh', '0312456789', 0.1, 'AP', '1C26TMP', [['Khuôn dập kim loại', '金属冲压模具', 'Metal stamping die', 38000000], ['Dịch vụ bảo trì máy', '设备维护服务', 'Machine maintenance service', 3800000]]),
      sup('Công ty CP Bao bì Sài Gòn', 'SUP-0016042', '原材料', 'TP. Hồ Chí Minh', '0301234567', 0.08, 'AP', '1C26TBB', [['Thùng carton 5 lớp', '五层纸箱', '5-ply carton box', 12500]]),
    ],
  },
  IN: {
    code: 'IN', name: '印度', lang: 'en', cur: 'INR', sym: '₹', dp: 2, cny: 0.085, dc: 'SEA-SIN', ruleVer: 'IN-GST-2026.1', regime: 'GST',
    kinds: ['Tax invoice（IRN）'], title: ['TAX INVOICE', 'TAX INVOICE'],
    titleT: [['税务发票', 'Tax invoice'], ['税务发票', 'Tax invoice']], taxName: 'IGST',
    truth: 'IRP · IRN 有效', ded: 'ITC（须出现在 GSTR-2B）', filing: 'GSTR-3B 月报', archive: '6 年', treat: 'ITC 抵扣', treatPaid: '已抵扣',
    revMech: 'Credit note', revHow: '供应商开具 Credit note 引用原票并在 GSTR-1 申报',
    rules: [['抵扣条件', 'IRN 有效 · 出现在 GSTR-2B'], ['申报', 'GSTR-3B 月报'], ['反转', '180 天未付款反转 ITC'], ['存档', '6 年']],
    pay: ['Net 45 days', '45 天净额付款', 'Net 45 days'], payDays: 45, bank: 'HDFC Bank ····2290',
    ch: ['税局同步', '邮箱采集', '供应商门户', 'ERP 嵌入 H5'],
    sups: [
      sup('Bharat Precision Pvt Ltd', 'SUP-0017002', '原材料', 'Pune, Maharashtra', '27AABCB1234F1Z5', 0.18, 'AP', 'BP/26-27/', [['CNC machined housing', 'CNC 加工外壳', 'CNC machined housing', 4200]]),
      sup('Deccan Freight Services', 'SUP-0017031', '物流运输', 'Mumbai, Maharashtra', '27AAFFD5678K1Z2', 0.18, 'AP', 'DF/26-27/', [['Inland freight Pune–Nhava Sheva', '浦那—那瓦舍瓦内陆运输', 'Inland freight Pune–Nhava Sheva', 18500]]),
    ],
  },
  DE: {
    code: 'DE', name: '德国', lang: 'de', cur: 'EUR', sym: '€', dp: 2, cny: 8.32, dc: 'EU-FRA', ruleVer: 'DE-USt-2026.1', regime: 'Umsatzsteuer',
    kinds: ['Rechnung（ZUGFeRD）', 'Rechnung'], title: ['RECHNUNG', 'RECHNUNG'],
    titleT: [['发票', 'Invoice'], ['发票', 'Invoice']], taxName: 'Umsatzsteuer',
    truth: 'VIES 有效 · XML 为准', ded: 'Vorsteuerabzug §15 UStG', filing: 'USt-VA 月报 · 次月 10 日', archive: 'GoBD 10 年', treat: 'Vorsteuerabzug', treatPaid: '已抵扣',
    revMech: 'Gutschrift / Rechnungskorrektur', revHow: '供应商开具 Gutschrift 引用原票号与行项目',
    rules: [['抵扣条件', '§14 UStG 要素齐全 · USt-IdNr. 有效'], ['申报', 'USt-Voranmeldung 月报'], ['逆向机制', 'Gutschrift / Rechnungskorrektur'], ['存档', 'GoBD 10 年，XML 原件不可改']],
    pay: ['Zahlbar innerhalb 30 Tagen netto', '30 天内净额付款', 'Net 30 days'], payDays: 30, bank: 'IBAN DE89 3704 ···· 3000',
    ch: ['邮箱采集', '邮箱采集', '供应商门户', 'Peppol', 'ERP 嵌入 H5'],
    sups: [
      sup('Werner Antriebstechnik GmbH', 'SUP-0021004', '设备与模具', 'Werner-von-Siemens-Str. 1, München', 'DE811907980', 0.19, 'AP', 'RE-2026-', [['Servomotor SM-40', '伺服电机 SM-40', 'Servo motor SM-40', 1310.92], ['Getriebe G-220', '减速机 G-220', 'Gearbox G-220', 1747.9]]),
      sup('Rhein Logistik GmbH', 'SUP-0021377', '物流运输', 'Duisburg', 'DE298765432', 0.19, 'AP', 'RL-', [['Containertransport Hamburg–München', '汉堡—慕尼黑集装箱运输', 'Container haulage Hamburg–Munich', 1450]]),
      sup('Amazon Business EU S.à r.l.', 'SUP-0021310', '差旅与行政', 'Luxembourg', 'LU26375245', 0.19, 'EXP', 'DE-2026-', [['Büromaterial', '办公用品', 'Office supplies', 48.2]]),
    ],
  },
  FR: {
    code: 'FR', name: '法国', lang: 'fr', cur: 'EUR', sym: '€', dp: 2, cny: 8.32, dc: 'EU-FRA', ruleVer: 'FR-TVA-2026.1', regime: 'TVA',
    kinds: ['Facture（Factur-X）', 'Facture'], title: ['FACTURE', 'FACTURE'],
    titleT: [['发票', 'Invoice'], ['发票', 'Invoice']], taxName: 'TVA',
    truth: 'VIES 有效 · Factur-X XML', ded: 'Déduction de TVA', filing: 'CA3 月报', archive: '10 年', treat: 'TVA 抵扣', treatPaid: '已抵扣',
    revMech: "Facture d'avoir", revHow: "供应商开具 Facture d'avoir 引用原票号",
    rules: [['抵扣条件', '发票法定要素齐全 · 供应商 TVA 号有效'], ['申报', 'CA3 月报'], ['逆向机制', "Facture d'avoir"], ['存档', '10 年']],
    pay: ['Paiement à 45 jours fin de mois', '月末起 45 天付款', '45 days end of month'], payDays: 45, bank: 'IBAN FR76 3000 ···· 0189',
    ch: ['邮箱采集', '供应商门户', 'Peppol', 'ERP 嵌入 H5'],
    sups: [
      sup('Lyon Composants Électriques SAS', 'SUP-0022010', '电子元器件', 'Lyon', 'FR42552100554', 0.2, 'AP', 'FA-2026-', [['Disjoncteur modulaire 16 A', '16A 模块化断路器', 'Modular circuit breaker 16 A', 64.5]]),
      sup('SNCF Voyageurs', 'SUP-0022091', '差旅与行政', 'Saint-Denis', 'FR87519037584', 0.1, 'EXP', 'SN-', [['Billet TGV Paris–Lyon', '巴黎—里昂 TGV 车票', 'TGV ticket Paris–Lyon', 74.2]]),
    ],
  },
  US: {
    code: 'US', name: '美国', lang: 'en', cur: 'USD', sym: '$', dp: 2, cny: 7.11, dc: 'NA-IAD', ruleVer: 'US-GA-2026.1', regime: 'Sales & Use Tax',
    kinds: ['Invoice', 'Receipt'], title: ['INVOICE', 'RECEIPT'],
    titleT: [['发票', 'Invoice'], ['收据', 'Receipt']], taxName: 'Sales tax',
    truth: '无统一查验平台', ded: 'Sales tax 计入成本（不可抵扣）', filing: '买方仅自评 Use tax', archive: '7 年', treat: '计入成本', treatPaid: '计入成本',
    revMech: 'Credit memo', revHow: '供应商开具 Credit memo 引用原发票号，抵扣下次付款',
    rules: [['抵扣', '无进项抵扣，税额计入成本'], ['Use tax', '供应商未代收时买方自评'], ['逆向机制', 'Credit memo'], ['存档', '联邦 7 年']],
    pay: ['Net 30', '30 天净额付款', 'Net 30'], payDays: 30, bank: 'ACH ····4392',
    ch: ['供应商门户', '邮箱采集', '邮箱采集', 'ERP 嵌入 H5'],
    sups: [
      sup('Blue Ridge Supply LLC', 'SUP-0030882', '原材料', '1420 Forsyth St, Atlanta, GA', 'EIN 58-1234567', 0.07, 'AP', 'BR-', [['Copper coil CC-6', '铜线圈 CC-6', 'Copper coil CC-6', 28.2]]),
      sup('Peachtree Industrial Services Inc.', 'SUP-0030915', '专业服务', 'Marietta, GA', 'EIN 58-7654321', 0, 'AP', 'PIS-', [['Preventive maintenance, Line 3', '3 号线预防性维护', 'Preventive maintenance, Line 3', 1850]]),
    ],
  },
  MX: {
    code: 'MX', name: '墨西哥', lang: 'es', cur: 'MXN', sym: 'MX$', dp: 2, cny: 0.36, dc: 'NA-IAD', ruleVer: 'MX-IVA-2026.1', regime: 'IVA（CFDI 4.0）',
    kinds: ['CFDI 4.0'], title: ['FACTURA · CFDI 4.0', 'FACTURA · CFDI 4.0'],
    titleT: [['电子发票 CFDI', 'CFDI e-invoice'], ['电子发票 CFDI', 'CFDI e-invoice']], taxName: 'IVA',
    truth: 'SAT · CFDI Vigente', ded: 'IVA acreditable（PPD 以付款补充单月份）', filing: '月报 · 次月 17 日', archive: '5 年', treat: 'IVA 抵扣', treatPaid: '已抵扣',
    revMech: 'CFDI de Egreso / Cancelación', revHow: '供应商开具 Egreso 引用原 UUID，或经接受后取消重开',
    rules: [['抵扣条件', 'CFDI Vigente · 已付款'], ['申报', '月报'], ['逆向机制', 'CFDI de Egreso'], ['存档', '5 年']],
    pay: ['PPD · Pago en parcialidades o diferido', 'PPD · 分期或延期付款', 'PPD · Deferred payment'], payDays: 30, bank: 'BBVA ····7712',
    ch: ['邮箱采集', '税局同步', '供应商门户'],
    sups: [
      sup('Aceros del Norte S.A. de C.V.', 'SUP-0042001', '原材料', 'Monterrey, N.L.', 'ANO010203AB1', 0.16, 'AP', 'uuid', [['Lámina de acero rolada en frío', '冷轧钢板', 'Cold-rolled steel sheet', 6210]]),
      sup('Transportes Regiomontanos S.A.', 'SUP-0042077', '物流运输', 'Apodaca, N.L.', 'TRE990101XY2', 0.16, 'AP', 'uuid', [['Flete terrestre MTY–Laredo', '蒙特雷—拉雷多陆运', 'Land freight MTY–Laredo', 14500]]),
    ],
  },
  BR: {
    code: 'BR', name: '巴西', lang: 'pt', cur: 'BRL', sym: 'R$', dp: 2, cny: 1.28, dc: 'LATAM-GRU', ruleVer: 'BR-SP-2026.2', regime: 'ICMS / IPI / PIS / COFINS',
    kinds: ['NF-e'], title: ['DANFE · NF-e', 'DANFE · NF-e'],
    titleT: [['电子货物发票辅助单据', 'Electronic invoice (NF-e)'], ['电子货物发票辅助单据', 'Electronic invoice (NF-e)']], taxName: 'ICMS + IPI',
    truth: 'SEFAZ 授权 · 签名有效', ded: 'ICMS / IPI / PIS / COFINS 分别抵扣', filing: 'SPED Fiscal · EFD 月报', archive: 'XML 5 年', treat: '分税种抵扣', treatPaid: '已抵扣',
    revMech: 'NF-e de devolução / Carta de Correção', revHow: '退货由买方开具 NF-e de devolução 引用原 chave',
    rules: [['抵扣条件', 'SEFAZ 授权 · CFOP 与用途一致'], ['申报', 'SPED Fiscal 与 EFD-Contribuições 月报'], ['逆向机制', 'NF-e de devolução'], ['限制', 'Carta de Correção 不得改金额、税额、CNPJ']],
    pay: ['Boleto 28 dias', '28 天银行票据', 'Bank slip, 28 days'], payDays: 28, bank: 'Itaú ····3021',
    ch: ['邮箱采集', '税局同步', '供应商门户'],
    sups: [
      sup('Metalúrgica São Bento Ltda.', 'SUP-0051003', '原材料', 'São Bernardo do Campo, SP', '12.345.678/0001-90', 0.23, 'AP', 'nfe', [['Chapa de aço galvanizado', '镀锌钢板', 'Galvanized steel sheet', 2948]]),
      sup('Embalagens Paulista Ltda.', 'SUP-0051040', '原材料', 'Guarulhos, SP', '23.456.789/0001-01', 0.18, 'AP', 'nfe', [['Caixa de papelão ondulado', '瓦楞纸箱', 'Corrugated cardboard box', 4.6]]),
    ],
  },
};

const ent = (code: string, name: string, country: CountryCode, weight: number, legalName: string, buyerTaxId: string): Entity => ({
  code,
  name,
  country,
  weight,
  legalName,
  buyerTaxId,
});
export const ENT: Entity[] = [
  ent('CN-SH-01', '上海分公司', 'CN', 26, '集团上海分公司', '91310000MA1FL0XX2X'),
  ent('CN-QD-01', '集团总部', 'CN', 14, '集团股份有限公司', '91370200MA3CXXXX5N'),
  ent('CN-GD-02', '广东制造基地', 'CN', 12, '集团（广东）电器有限公司', '91440600MA4WXXXX7L'),
  ent('JP-TYO-01', '日本法人', 'JP', 10, 'グループジャパン株式会社', 'T8010401XXXXXX'),
  ent('KR-SEL-01', '韩国法人', 'KR', 7, '그룹코리아(주)', '214-87-XXXXX'),
  ent('VN-BN-01', '越南工厂', 'VN', 8, 'Công ty TNHH Group Việt Nam', '2301XXXXXX'),
  ent('IN-MH-01', '印度法人', 'IN', 8, 'Group India Pvt Ltd', '27AAGCG1XXXXX1Z3'),
  ent('DE-MUC-01', '德国法人', 'DE', 10, 'Group Deutschland GmbH', 'DE31XXXXXXX'),
  ent('FR-PAR-01', '法国法人', 'FR', 6, 'Group France SAS', 'FR19XXXXXXXXX'),
  ent('US-ATL-01', '美国法人', 'US', 9, 'Group USA Corp.', 'EIN 82-XXXXXXX'),
  ent('MX-MTY-01', '墨西哥工厂', 'MX', 7, 'Group México S.A. de C.V.', 'GME150101XX1'),
  ent('BR-SP-01', '巴西法人', 'BR', 6, 'Group Brasil Ltda.', '45.XXX.XXX/0001-XX'),
];

const MONTHS = ['2026-08', '2026-09', '2026-10'];
const pad = (n: number, w: number) => String(n).padStart(w, '0');
function addDays(iso: string, d: number): string {
  const t = new Date(iso + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
}

function genNo(c: CountryCode, s: Supplier, r: () => number, mo: string): string {
  const p = s.noPrefix;
  if (c === 'CN') return '26' + pad(Math.floor(r() * 1e9), 9) + pad(Math.floor(r() * 1e9), 9);
  if (c === 'JP') return p + '-' + mo.slice(2, 4) + mo.slice(5, 7) + '-' + pad(Math.floor(r() * 9000) + 100, 4);
  if (c === 'KR') return mo.replace('-', '') + '15-' + pad(Math.floor(r() * 1e8), 8);
  if (c === 'VN') return p + '-' + pad(Math.floor(r() * 99999), 5);
  if (c === 'MX') {
    const h = () =>
      Math.floor(r() * 0xffff)
        .toString(16)
        .toUpperCase()
        .padStart(4, '0');
    const a = h();
    const b = h();
    const c2 = h();
    const d = h();
    const e = h();
    return a + b + '-' + c2 + '-…-' + d + e;
  }
  if (c === 'BR') return 'NF-e 000.' + pad(Math.floor(r() * 999), 3);
  return p + pad(Math.floor(r() * 99999), 5);
}

function genRows(): InvoiceRow[] {
  const out: InvoiceRow[] = [];
  ENT.forEach(({ code, country: c, weight: w }) => {
    const cc = CC[c];
    MONTHS.forEach((mo, mi) => {
      const r = rng(hs(code + mo));
      const cur = mi === 2;
      const n = Math.round(w * (0.8 + 0.4 * r()));
      for (let i = 0; i < n; i++) {
        const s = cc.sups[Math.floor(r() * cc.sups.length)];
        const k = s.items.length > 1 && r() < 0.45 ? 2 : 1;
        const items: LineItem[] = [];
        for (let j = 0; j < k; j++) {
          const it = s.items[j];
          const qty =
            it.price > 100000
              ? 1
              : it.price > 2000
                ? 1 + Math.floor(r() * 12)
                : it.price > 50
                  ? 2 + Math.floor(r() * 30)
                  : 50 + Math.floor(r() * 2000);
          items.push({ item: it, qty });
        }
        const net = rnd2(
          items.reduce((a, x) => a + x.qty * x.item.price, 0),
          cc.dp,
        );
        const tax = rnd2(net * s.rate, cc.dp);
        const day = 1 + Math.floor(r() * (cur ? 12 : 27));
        const p = r();
        const status = cur
          ? p < 0.42
            ? 'review'
            : p < 0.75
              ? 'posted'
              : 'paid'
          : p < 0.15
            ? 'review'
            : p < 0.5
              ? 'posted'
              : 'paid';
        const date = addDays(mo + '-01', day - 1 - Math.floor(r() * (status === 'review' ? 8 : 40)));
        const review: ReviewDoc = s.review === 'EXP' ? '费控单' : 'AP单';
        const due = addDays(date, cc.payDays);
        const f = r();
        let flag = '';
        let flagKey: FlagKey = '';
        if (status === 'review' && review === 'AP单' && f < 0.12) {
          flag = '三单匹配差异';
          flagKey = 'any';
        } else if (status === 'review' && review === '费控单' && f < 0.2) {
          flag = '超费用标准';
          flagKey = 'any';
        } else if (status === 'posted' && c === 'CN' && f < 0.14) {
          flag = '待用途确认';
          flagKey = 'any';
        } else if (status === 'posted' && due <= '2026-11-12' && due >= '2026-10-13') {
          flag = '30 天内到期';
          flagKey = 'due';
        } else if (f > 0.96) {
          flag = '识别已更正';
          flagKey = 'any';
        }
        const kindIdx = s.review === 'EXP' && cc.kinds[1] ? 1 : 0;
        const no = genNo(c, s, r, mo);
        const doc = (review === 'AP单' ? 'AP-' : 'EXP-') + mo.slice(2, 4) + mo.slice(5, 7) + '-' + pad(Math.floor(r() * 99999), 5);
        const channel = cc.ch[Math.floor(r() * cc.ch.length)];
        const po = review === 'AP单' ? 'PO-45001' + pad(Math.floor(r() * 99999), 5) : '—';
        const pages = k > 1 || r() < 0.3 ? 2 : 1;
        const err = Math.round(r() * 8);
        out.push({
          id: code + mo + i,
          c,
          entity: code,
          month: mo,
          sup: s.name,
          supCode: s.code,
          ind: s.industry,
          supAddr: s.addr,
          supId: s.taxId,
          rate: s.rate,
          kind: cc.kinds[kindIdx],
          kindIdx,
          no,
          date,
          items,
          net,
          tax,
          total: rnd2(net + tax, cc.dp),
          status,
          review,
          doc,
          channel,
          po,
          due,
          flag,
          flagKey,
          revs: [],
          pages,
          err,
        });
      }
    });
  });
  const it = (c: CountryCode, si: number, ii: number) => CC[c].sups[si].items[ii];
  const rich: InvoiceRow[] = [
    {
      id: 'R-CN', c: 'CN', entity: 'CN-SH-01', month: '2026-10', sup: '江苏恒立液压股份有限公司', supCode: 'SUP-0007712', ind: '原材料', supAddr: '江苏省常州市武进区', supId: '91320400MA1XXXX7Q', rate: 0.13,
      kind: '数电专票', kindIdx: 0, no: '26372000000018842', date: '2026-09-08', items: [{ item: it('CN', 0, 0), qty: 20 }], net: 104424.78, tax: 13575.22, total: 118000,
      status: 'posted', review: 'AP单', doc: 'AP-2609-00412', channel: '税局同步', po: 'PO-4500127102', due: '2026-11-07', flag: '部分红冲', flagKey: 'rev', pages: 1, err: 2,
      revs: [{ kind: '红字数电专票（部分）', no: '26372000000021107', amt: -10230, tax: -1176.99, date: '2026-10-05', effect: '2 件退货；红字确认单 HZ-2610-0033 → 供应商开具后自动关联原票；进项税转出在 2026-10 期申报' }],
    },
    {
      id: 'R-JP', c: 'JP', entity: 'JP-TYO-01', month: '2026-10', sup: '株式会社宝田機械', supCode: 'SUP-0013397', ind: '设备与模具', supAddr: '東京都港区芝浦 3-1-1', supId: 'T7010001081486', rate: 0.1,
      kind: '適格請求書', kindIdx: 0, no: 'TK-2609-0031', date: '2026-09-03', items: [{ item: it('JP', 0, 0), qty: 1 }, { item: it('JP', 0, 1), qty: 1 }], net: 902000, tax: 90200, total: 992200,
      status: 'review', review: 'AP单', doc: 'AP-2610-00087', channel: 'ERP 嵌入 H5', po: 'PO-4500127730', due: '2026-10-31', flag: '识别已更正', flagKey: 'any', pages: 3, err: 4, revs: [],
    },
    {
      id: 'R-DE', c: 'DE', entity: 'DE-MUC-01', month: '2026-10', sup: 'Werner Antriebstechnik GmbH', supCode: 'SUP-0021004', ind: '设备与模具', supAddr: 'Werner-von-Siemens-Str. 1, München', supId: 'DE811907980', rate: 0.19,
      kind: 'Rechnung（ZUGFeRD）', kindIdx: 0, no: 'RE-2026-45102', date: '2026-09-18', items: [{ item: it('DE', 0, 1), qty: 12 }], net: 20974.79, tax: 3985.21, total: 24960,
      status: 'paid', review: 'AP单', doc: 'AP-2609-DE-0410', channel: '邮箱采集', po: 'PO-4500128034', due: '2026-10-18', flag: 'Gutschrift 已关联', flagKey: 'rev', pages: 2, err: 0,
      revs: [{ kind: 'Gutschrift', no: 'GS-2026-0117', amt: -1200, tax: -191.6, date: '2026-10-11', effect: '第 1 行单价差额；已付款，差额在下次付款中抵扣；Vorsteuer 在 2026-10 期更正' }],
    },
    {
      id: 'R-US', c: 'US', entity: 'US-ATL-01', month: '2026-10', sup: 'Blue Ridge Supply LLC', supCode: 'SUP-0030882', ind: '原材料', supAddr: '1420 Forsyth St, Atlanta, GA', supId: 'EIN 58-1234567', rate: 0.07,
      kind: 'Invoice', kindIdx: 0, no: 'BR-77098', date: '2026-09-02', items: [{ item: it('US', 0, 0), qty: 400 }], net: 11280, tax: 742.9, total: 12022.9,
      status: 'paid', review: 'AP单', doc: 'AP-2609-US-0211', channel: '供应商门户', po: 'PO-4500128871', due: '2026-10-02', flag: '', flagKey: '', pages: 1, err: 3, revs: [],
    },
  ];
  return rich.concat(out);
}

let allCache: InvoiceRow[] | null = null;
function allRows(): InvoiceRow[] {
  if (!allCache) allCache = genRows();
  return allCache;
}

const STEPS = ['采集', '校验', '税局/平台', '供应商归属', '匹配/审核', '入账', '进项处理', '申报', '付款', '归档'];

function countryInfo(c: CountryCode): CountryInfo {
  const { sups: _sups, ch: _ch, ...info } = CC[c];
  return info;
}

/* ======== 组织与列表 ======== */
export function buildOrgCatalog(): OrgCatalog {
  return { countries: (Object.keys(CC) as CountryCode[]).map(countryInfo), entities: ENT };
}

export function buildOrgRows(q: OrgQuery): InvoiceRow[] {
  return allRows().filter(
    (r) => r.c === q.country && (q.entity === 'ALL' || r.entity === q.entity) && (q.period === 'q' ? true : r.month === q.period),
  );
}

/* ======== 单票：生命周期 ======== */
function lifeOf(row: InvoiceRow): LifeStep[] {
  const cc = CC[row.c];
  const r = rng(hs(row.id + 'life'));
  const cur = row.status === 'review' ? 4 : row.status === 'posted' ? 7 : 9;
  let d = row.date;
  const at: string[] = [];
  for (let i = 0; i < 10; i++) {
    d = addDays(d, i === 0 ? Math.floor(r() * 2) : i <= 3 ? 0 : 1 + Math.floor(r() * 3));
    at.push(d.slice(5));
  }
  const jv = 'JV-' + row.date.slice(2, 4) + row.date.slice(5, 7) + '-' + pad(Math.floor(r() * 9999), 4);
  const pay = 'PAY-' + row.due.slice(2, 4) + row.due.slice(5, 7) + '-' + pad(Math.floor(r() * 999), 3);
  const who = [
    row.channel,
    row.err ? row.err + ' 处识别已更正' : '校验全部通过',
    cc.truth,
    row.supCode + (row.channel === '供应商门户' ? ' · 登录身份' : ' · 税号精确匹配'),
    (row.review === 'AP单' ? '三单匹配 · ' : '费控审批 · ') + row.doc,
    jv,
    cc.ded,
    cc.filing,
    row.status === 'paid' ? pay : '计划 ' + row.due.slice(5),
    cc.archive,
  ];
  return STEPS.map((label, i) => {
    const done = i < cur;
    const now = i === cur;
    return { label, at: done || now ? at[i] : '—', who: done || now ? who[i] : '—', state: done ? 'done' : now ? 'now' : 'todo' };
  });
}

/* ======== 单票：影像页 ======== */
function pagesOf(row: InvoiceRow): ImagePage[] {
  const cc = CC[row.c];
  const lb = L[cc.lang];
  const e = ENT.find((x) => x.code === row.entity) ?? ENT[0];
  const n = row.pages;
  const mk = (i: number): ImagePage => {
    const base = {
      title: cc.title[row.kindIdx] || cc.title[0],
      pageLabel: 'Page ' + (i + 1) + ' / ' + n,
      noL: lb.no,
      no: row.no,
      dateL: lb.date,
      date: row.date,
      poL: lb.po,
      po: row.po,
    };
    if (i === 0)
      return {
        ...base,
        isMain: true,
        sellerL: lb.seller,
        seller: row.sup,
        addrL: lb.addr,
        sellerAddr: row.supAddr,
        taxIdL: lb.taxId,
        sellerId: row.supId,
        buyerL: lb.buyer,
        buyer: e.legalName,
        buyerId: e.buyerTaxId,
        itemL: lb.item,
        qtyL: lb.qty,
        priceL: lb.price,
        amountL: lb.amount,
        items: row.items.map((x) => ({
          name: x.item.orig,
          qty: x.qty.toLocaleString('en-US'),
          price: fmtMoney(cc, x.item.price),
          amt: fmtMoney(cc, rnd2(x.qty * x.item.price, cc.dp)),
        })),
        netL: lb.net,
        net: fmtMoney(cc, row.net),
        taxL: lb.tax + (row.rate ? ' ' + Math.round(row.rate * 100) + '%' : ''),
        tax: fmtMoney(cc, row.tax),
        totalL: lb.total,
        total: fmtMoney(cc, row.total),
        payL: lb.pay,
        pay: cc.pay[0],
        bankL: lb.bank,
        bank: cc.bank,
      };
    if (i === 1)
      return {
        ...base,
        isMain: false,
        textTitle: lb.item + ' · ' + lb.pay,
        lines: row.items
          .map((x) => x.item.orig + ' · ' + x.qty.toLocaleString('en-US') + ' × ' + fmtMoney(cc, x.item.price))
          .concat([lb.pay + ': ' + cc.pay[0], lb.due + ': ' + row.due, lb.bank + ': ' + cc.bank, lb.taxId + ': ' + row.supId]),
      };
    return {
      ...base,
      isMain: false,
      textTitle: cc.lang === 'ja' ? '納品書（添付）' : 'Delivery note',
      lines: row.items
        .map((x) => x.item.orig + ' — ' + x.qty.toLocaleString('en-US'))
        .concat([
          cc.lang === 'ja' ? '検収日: ' + addDays(row.date, -2) : 'Received: ' + addDays(row.date, -2),
          cc.lang === 'ja' ? '受領印: 済' : 'Signed',
          '—',
          '—',
        ]),
    };
  };
  const out: ImagePage[] = [];
  for (let i = 0; i < n; i++) out.push(mk(i));
  return out;
}

export function buildDetail(id: string): InvoiceDetail {
  const row = allRows().find((r) => r.id === id || r.no === id);
  if (!row) throw new Error('未找到发票 ' + id);
  const e = ENT.find((x) => x.code === row.entity) ?? ENT[0];
  return {
    row,
    country: countryInfo(row.c),
    entity: e,
    steps: lifeOf(row),
    pages: pagesOf(row),
    hash: hs(row.no).toString(16) + '…' + hs(row.sup).toString(16).slice(0, 4),
    fileName: row.no.replace(/[^A-Za-z0-9-]/g, '') + '.pdf',
  };
}

/* ======== 单票：识别数据（含翻译） ======== */
export function buildRecognizedData(id: string, target: TranslateTarget): RecognizedData {
  const { row, entity: e } = buildDetail(id);
  const cc = CC[row.c];
  const lb = L[cc.lang];
  const ti = target === 'zh' ? 0 : 1;
  const R = (key: LabelKey, v: string, tv?: string, cls: DataRow['cls'] = ''): DataRow => ({
    kind: 'field',
    k: lb[key],
    tk: LBL[key][ti],
    v,
    tv: tv || '',
    cls,
  });
  const S = (k: string, v: string, cls: DataRow['cls'] = ''): DataRow => ({ kind: 'system', k, tk: '', v, tv: '', cls });
  const sections: DataSection[] = [
    {
      title: '票面表头',
      rows: [
        R('title', cc.title[row.kindIdx] || cc.title[0], (cc.titleT[row.kindIdx] || cc.titleT[0])[ti]),
        R('no', row.no, '', 'mono'),
        R('date', row.date),
        R('seller', row.sup),
        R('taxId', row.supId, '', 'mono'),
        R('addr', row.supAddr),
        R('buyer', e.legalName),
        R('po', row.po, '', 'mono'),
      ],
    },
    {
      title: '行项目',
      rows: row.items.map(
        (x): DataRow => ({
          kind: 'item',
          k: x.item.orig,
          tk: '',
          v:
            x.qty.toLocaleString('en-US') +
            ' × ' +
            fmtMoney(cc, x.item.price) +
            ' = ' +
            fmtMoney(cc, rnd2(x.qty * x.item.price, cc.dp)),
          tv: ti === 0 ? x.item.zh : x.item.en,
          cls: 'num',
        }),
      ),
    },
    {
      title: '金额与税额',
      rows: [
        R('net', fmtMoney(cc, row.net), '', 'num'),
        R('tax', fmtMoney(cc, row.tax) + (row.rate ? '（' + Math.round(row.rate * 100) + '%）' : ''), '', 'num'),
        R('total', fmtMoney(cc, row.total), '', 'num'),
        S('折算 CNY', 'CNY ' + (row.total * cc.cny).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' · 汇率 ' + cc.cny, 'num'),
      ],
    },
    { title: '付款信息', rows: [R('pay', cc.pay[0], cc.pay[ti + 1]), R('due', row.due), R('bank', cc.bank, '', 'mono')] },
    {
      title: '系统字段（中台）',
      rows: [
        S('采集渠道', row.channel),
        S('采集法人', row.entity + ' · ' + e.name),
        S('数据中心', cc.dc),
        S('规则版本', cc.ruleVer),
        S('识别更正', row.err ? row.err + ' 处（含税局覆盖）' : '无'),
        S('关联单据', row.doc),
      ],
    },
  ];
  return { srcLang: cc.lang, target, sections };
}
