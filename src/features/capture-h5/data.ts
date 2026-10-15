import type {
  CaptureSession,
  CheckDef,
  CheckKey,
  CheckStatus,
  CorrectionLog,
  CountryDetail,
  CountryMeta,
  DemoDoc,
  FixField,
  FixValue,
  GeoCode,
  InvoiceRow,
  Localized,
  RecognitionTier,
} from './types';

/* 示例数据：与设计稿原型（Capture.dc.html）一致 */

/* 国家条目：名称、索引、币种、汇率、税种/税率、特殊说明 */
const P = (
  zh: string,
  en: string,
  es: string,
  ar: string,
  idx: string,
  currency: string,
  currencyCn: string,
  cny: number,
  tier: RecognitionTier,
  tax: string | Localized,
  note: Localized,
): CountryMeta => ({ zh, en, es, ar, idx, currency, currencyCn, cny, tier, tax, note });

const NGEN: Localized = { zh: '需当地税号方可抵扣 · 税额以票面为准', en: 'Local tax ID required for input credit; tax as printed' };

export const POOL: Record<GeoCode, CountryMeta> = {
  CN: P('中国大陆', 'China (Mainland)', 'China continental', 'الصين', 'Z', 'CNY', '人民币', 1, 'full',
    'VAT 13% / 9% / 6% / 3%',
    { zh: '专票需销方税号与用途 · 需税局查验与验重 · 价税分栏', en: 'Special invoice needs seller tax ID and purpose · tax-bureau verification and duplicate check · net and tax shown separately' }),
  JP: P('日本', 'Japan', 'Japón', 'اليابان', 'R', 'JPY', '日元', 0.0512, 'ocr',
    '消費税 (JCT) 10% / 8%',
    { zh: '无登録番号不可抵扣 · 日元取整无小数 · 需保存適格請求書', en: 'No registration no. means no input credit · JPY rounded to whole yen · qualified invoice must be retained' }),
  KR: P('韩国', 'South Korea', 'Corea del Sur', 'كوريا الجنوبية', 'H', 'KRW', '韩元', 0.0052, 'ocr',
    'VAT (부가세) 10%',
    { zh: '需사업자등록번호 · 韩元取整无小数 · 현금영수증可作凭证', en: 'Business reg. no. required · KRW rounded to whole won · cash receipt accepted' }),
  SG: P('新加坡', 'Singapore', 'Singapur', 'سنغافورة', 'X', 'SGD', '新加坡元', 5.61, 'none',
    'GST 9%',
    { zh: '≥ S$1,000 需完整 Tax Invoice · 小额可用 Simplified · 暂无识别', en: '≥ S$1,000 needs a full tax invoice · simplified accepted below · no recognition yet' }),
  US: P('美国', 'United States', 'Estados Unidos', 'الولايات المتحدة', 'M', 'USD', '美元', 7.11, 'ocr',
    { zh: 'Sales tax 0–11%（按州）', en: 'Sales tax 0–11% (by state)' },
    { zh: '无统一税号 · 税额常不单列 · 以卡账单对账', en: 'No unified tax ID · tax often not itemised · reconciled against card statement' }),
  DE: P('德国', 'Germany', 'Alemania', 'ألمانيا', 'D', 'EUR', '欧元', 8.32, 'ocr',
    'MwSt. 19% / 7%',
    { zh: '需 USt-IdNr. 方可申报进项 · ≤ 250 € 可用小额发票', en: 'USt-IdNr. required for input VAT · small-amount invoice allowed ≤ €250' }),
  FR: P('法国', 'France', 'Francia', 'فرنسا', 'F', 'EUR', '欧元', 8.32, 'ocr',
    'TVA 20% / 10% / 5,5%',
    { zh: '需 numéro de TVA · 餐饮票需注明人数与事由', en: 'TVA number required · meal receipts must state guests and purpose' }),
  NL: P('荷兰', 'Netherlands', 'Países Bajos', 'هولندا', 'H', 'EUR', '欧元', 8.32, 'ocr',
    'BTW 21% / 9%',
    { zh: '需 BTW-nummer · 跨境服务可能适用反向征收', en: 'BTW-nummer required · cross-border services may fall under reverse charge' }),
  GB: P('英国', 'United Kingdom', 'Reino Unido', 'المملكة المتحدة', 'Y', 'GBP', '英镑', 9.13, 'ocr',
    'VAT 20% / 5%',
    { zh: '需 VAT number · ≤ £250 可用简化发票', en: 'VAT number required · simplified invoice allowed ≤ £250' }),
  IT: P('意大利', 'Italy', 'Italia', 'إيطاليا', 'Y', 'EUR', '欧元', 8.32, 'ocr',
    'IVA 22% / 10% / 4%',
    { zh: '需 Partita IVA · 电子发票经 SdI 流转', en: 'Partita IVA required · e-invoices routed through SdI' }),
  ES: P('西班牙', 'Spain', 'España', 'إسبانيا', 'X', 'EUR', '欧元', 8.32, 'ocr',
    'IVA 21% / 10% / 4%',
    { zh: '需 NIF · 简化发票不可全额抵扣', en: 'NIF required · simplified invoices not fully deductible' }),
  CH: P('瑞士', 'Switzerland', 'Suiza', 'سويسرا', 'R', 'CHF', '瑞士法郎', 8.85, 'ocr',
    'MWST 8,1% / 2,6%',
    { zh: '非欧盟 · 需 UID 号 · 退税需单独申请', en: 'Outside the EU · UID required · refunds claimed separately' }),
  SE: P('瑞典', 'Sweden', 'Suecia', 'السويد', 'R', 'SEK', '瑞典克朗', 0.74, 'ocr',
    'Moms 25% / 12% / 6%',
    { zh: '需 momsregistreringsnummer', en: 'Swedish VAT registration number required' }),
  PL: P('波兰', 'Poland', 'Polonia', 'بولندا', 'B', 'PLN', '兹罗提', 1.95, 'ocr',
    'VAT 23% / 8% / 5%',
    { zh: '需 NIP · 票面须注明买方 NIP', en: 'NIP required, and the buyer NIP must appear on the invoice' }),
  AE: P('阿联酋', 'United Arab Emirates', 'Emiratos Árabes Unidos', 'الإمارات العربية المتحدة', 'A', 'AED', '迪拉姆', 1.94, 'ocr',
    'VAT 5%',
    { zh: '需 TRN · 阿拉伯语／英语双语票面', en: 'TRN required · invoices are bilingual Arabic/English' }),
  SA: P('沙特阿拉伯', 'Saudi Arabia', 'Arabia Saudita', 'السعودية', 'S', 'SAR', '里亚尔', 1.90, 'ocr',
    'VAT 15%',
    { zh: '需 VAT number 与 ZATCA 二维码', en: 'VAT number and ZATCA QR code required' }),
  TR: P('土耳其', 'Turkey', 'Turquía', 'تركيا', 'T', 'TRY', '土耳其里拉', 0.18, 'ocr',
    'KDV 20% / 10% / 1%',
    { zh: '需 vergi kimlik numarası', en: 'Turkish tax identification number required' }),
  ZA: P('南非', 'South Africa', 'Sudáfrica', 'جنوب أفريقيا', 'N', 'ZAR', '兰特', 0.39, 'ocr',
    'VAT 15%', NGEN),
  HK: P('中国香港', 'Hong Kong SAR', 'Hong Kong', 'هونغ كونغ', 'Z', 'HKD', '港元', 0.91, 'ocr',
    { zh: '无销售税 / VAT', en: 'No sales tax or VAT' },
    { zh: '不涉及进项抵扣 · 以收据为凭据', en: 'No input credit involved · receipts serve as evidence' }),
  MY: P('马来西亚', 'Malaysia', 'Malasia', 'ماليزيا', 'M', 'MYR', '林吉特', 1.62, 'ocr',
    'SST 6% / 10%',
    { zh: '需 SST registration number', en: 'SST registration number required' }),
  TH: P('泰国', 'Thailand', 'Tailandia', 'تايلاند', 'T', 'THB', '泰铢', 0.21, 'ocr',
    'VAT 7%',
    { zh: '需 13 位 Tax ID · 仅全额税票可抵扣', en: '13-digit tax ID required · only full tax invoices are deductible' }),
  VN: P('越南', 'Vietnam', 'Vietnam', 'فيتنام', 'Y', 'VND', '越南盾', 0.00029, 'none',
    'VAT 10% / 8% / 5%',
    { zh: '需 mã số thuế · 越南盾取整无小数 · 电子发票需查验', en: 'Tax code required · VND rounded to whole dong · e-invoices must be verified' }),
  IN: P('印度', 'India', 'India', 'الهند', 'Y', 'INR', '卢比', 0.085, 'ocr',
    'GST 18% / 12% / 5%',
    { zh: '需 GSTIN · 跨州适用 IGST', en: 'GSTIN required · inter-state supplies fall under IGST' }),
  ID: P('印度尼西亚', 'Indonesia', 'Indonesia', 'إندونيسيا', 'Y', 'IDR', '印尼卢比', 0.00045, 'none',
    'PPN 11%',
    { zh: '需 NPWP · 仅 Faktur Pajak 可抵扣 · 卢比取整', en: 'NPWP required · only Faktur Pajak is deductible · IDR rounded' }),
  PH: P('菲律宾', 'Philippines', 'Filipinas', 'الفلبين', 'F', 'PHP', '比索', 0.13, 'none',
    'VAT 12%',
    { zh: '需 TIN · 须为 official receipt', en: 'TIN required · must be an official receipt' }),
  AU: P('澳大利亚', 'Australia', 'Australia', 'أستراليا', 'A', 'AUD', '澳元', 4.72, 'ocr',
    'GST 10%',
    { zh: '需 ABN · ≥ A$82.50 须为 tax invoice', en: 'ABN required · tax invoice needed at or above A$82.50' }),
  NZ: P('新西兰', 'New Zealand', 'Nueva Zelanda', 'نيوزيلندا', 'X', 'NZD', '新西兰元', 4.28, 'ocr',
    'GST 15%',
    { zh: '需 GST number · ≥ NZ$50 须为 tax invoice', en: 'GST number required · tax invoice needed at or above NZ$50' }),
  CA: P('加拿大', 'Canada', 'Canadá', 'كندا', 'J', 'CAD', '加元', 5.21, 'ocr',
    { zh: 'GST 5% + PST/HST（按省）', en: 'GST 5% + PST/HST (by province)' },
    { zh: '需 GST/HST number · 省税税率不一', en: 'GST/HST number required · provincial rates differ' }),
  MX: P('墨西哥', 'Mexico', 'México', 'المكسيك', 'M', 'MXN', '墨西哥比索', 0.36, 'ocr',
    'IVA 16%',
    { zh: '需 RFC · 须为 CFDI 电子发票', en: 'RFC required · must be a CFDI e-invoice' }),
  BR: P('巴西', 'Brazil', 'Brasil', 'البرازيل', 'B', 'BRL', '雷亚尔', 1.28, 'ocr',
    { zh: 'ICMS / ISS（按州市）', en: 'ICMS / ISS (state and city)' },
    { zh: '需 CNPJ · 须为 Nota Fiscal 电子票', en: 'CNPJ required · must be an electronic Nota Fiscal' })
};

export const DETAIL: Partial<Record<GeoCode, CountryDetail>> = {
  CN: { emptyHint: '可从税局一键取票，或上传/拍摄票据文件。取票后系统自动完成查验与验重。',
    lockNote: '发生地由票面税号与票种自动判定，如需更改请重新归属该票据。',
    fields: [
      { label: '票种', key: 'kind', src: 'OCR' }, { label: '发票号码', key: 'no', src: 'OCR' },
      { label: '开票日期', key: 'date', src: 'OCR' }, { label: '销方名称', key: 'seller', src: 'OCR' },
      { label: '销方税号', key: 'sellerTax', src: 'OCR' }, { label: '不含税金额', key: 'net', src: 'OCR' },
      { label: '税额', key: 'tax', src: 'OCR' }, { label: '税局查验', key: 'verify', src: '税局' }] },
  JP: { emptyHint: '上传或拍摄領収書、レシート。识别后需人工确认登録番号与消費税額。',
    lockNote: '日本票据按 適格請求書等保存方式 处理：无登録番号者不可全额抵扣，将标记为不合规凭证。',
    fields: [
      { label: '票种', key: 'kind', src: 'OCR' }, { label: '票据号码', key: 'no', src: 'OCR' },
      { label: '开票日期', key: 'date', src: 'OCR' }, { label: '销方名称', key: 'seller', src: 'OCR' },
      { label: '登録番号', key: 'sellerTax', src: 'OCR' }, { label: '税率区分', key: 'rateClass', src: 'OCR' },
      { label: '消費税額', key: 'tax', src: '人工' }, { label: '不含税金额', key: 'net', src: '推算' }] },
  SG: { emptyHint: '上传原件后手动录入。该地区暂无识别能力，字段将全部标记为人工来源。',
    lockNote: '新加坡票据按 GST 规则处理：金额 ≥ S$1,000 需完整 Tax Invoice 方可抵扣。',
    fields: [
      { label: 'Doc type', key: 'kind', src: '人工' }, { label: 'Invoice no.', key: 'no', src: '人工' },
      { label: 'Date', key: 'date', src: '人工' }, { label: 'Supplier', key: 'seller', src: '人工' },
      { label: 'GST reg. no.', key: 'sellerTax', src: '人工' }, { label: 'GST amount', key: 'tax', src: '人工' },
      { label: 'Net amount', key: 'net', src: '人工' }] }
};

export const UNK: CountryMeta = { zh: '待归属', en: 'Unassigned', es: 'Sin asignar', ar: 'غير محدد', currency: '—', currencyCn: '发生地未定', cny: 1, tier: 'none', tax: '—' };

export const ENTITIES: Record<string, string> = { CN: '上海分公司', JP: '东京支店', SG: 'Singapore Pte Ltd' };
export const MATCHED: Record<number, string> = { 1: '市内交通 08-22', 2: '机票 08-14', 3: '住宿 08-19', 5: '停车费 05-03', 6: '停车费 05-16', 8: '停车费 05-14' };

export const SEED: InvoiceRow[] = [
  { id: 1, c: 'CN', kind: '数电票', seller: '滴滴出行科技有限公司', no: '25442000000365987', date: '2026-08-22', amt: 365.00, net: 334.86, tax: 30.14, sellerTax: '91330000MA27XG3B7L', attach: 1, missing: [], flag: null, verify: 'verifiedFull' },
  { id: 2, c: 'CN', kind: '行程单', seller: '中国国际航空股份有限公司', no: '999-2148876321', date: '2026-08-14', amt: 2180.00, net: 2000.00, tax: 180.00, sellerTax: '911100001000131X', attach: 0, missing: [], flag: null, verify: 'verified' },
  { id: 3, c: 'CN', kind: '专票', seller: '上海静安洲际酒店', no: '25310000000188402', date: '2026-08-19', amt: 1268.00, net: 1163.30, tax: 104.70, sellerTax: '91310106133887654J', attach: 2, missing: [], flag: { k: 'needPax' }, verify: 'verified' },
  { id: 4, c: 'JP', kind: '領収書', seller: '株式会社北富不動産', no: '000136', date: '2025-05-19', amt: 200, net: 182, tax: null, sellerTax: 'T5120001122066', rateClass: '10%', attach: 1, missing: ['tax'], flag: null },
  { id: 5, c: 'JP', kind: '領収書', seller: '三井不動産リアルティ株式会社', no: '000300', date: '2025-02-03', amt: 990, net: 900, tax: 90, sellerTax: 'T9OOOOO1140514', rateClass: '10%', attach: 1, missing: [], flag: null },
  { id: 6, c: 'JP', kind: 'レシート', seller: 'タイムズ24株式会社', no: '0000006132', date: '2025-05-16', amt: 2200, net: 2000, tax: 200, sellerTax: 'T4010001137774', rateClass: '10%', attach: 1, missing: [], flag: null },
  { id: 7, c: 'JP', kind: '領収書', seller: '株式会社スペースゼロ', no: '00-0925-25050', date: '2025-05-01', amt: 200, net: 182, tax: 18, sellerTax: '', rateClass: '10%', attach: 1, missing: ['sellerTax'], flag: null },
  { id: 8, c: 'JP', kind: 'レシート', seller: 'タイムズ24株式会社', no: '000951', date: '2025-05-14', amt: 2860, net: 2600, tax: 260, sellerTax: 'T4010001137774', rateClass: '10%', attach: 1, missing: [], flag: { k: 'dup', a: '000572' } },
  { id: 9, c: 'JP', kind: 'レシート', seller: 'タイムズ24株式会社', no: '000572', date: '2025-05-12', amt: 2860, net: 2600, tax: 260, sellerTax: 'T4010001137774', rateClass: '10%', attach: 1, missing: [], flag: { k: 'dup', a: '000951' } },
  { id: 10, c: 'JP', kind: '附件', seller: '支付宝境外支付凭证（无票据）', no: '—', date: '2025-05-18', amt: 4500, net: null, tax: null, sellerTax: '', rateClass: '—', attach: 1, missing: ['noInvoice'], flag: null },
  { id: 11, c: 'UNK', kind: '图片', seller: '영수증 · 서울시티투어', no: '—', date: '2025-05-20', amt: 0, net: null, tax: null, sellerTax: '', attach: 1, missing: [], flag: { k: 'langKR' } },
  { id: 12, c: 'UNK', kind: 'PDF', seller: 'Booking.com B.V.', no: 'BK-4417208', date: '2025-05-11', amt: 0, net: null, tax: null, sellerTax: '', attach: 1, missing: [], flag: { k: 'ambNL' } },
  { id: 13, c: 'UNK', kind: '图片', seller: '同一张图内含 2 个国家的票据', no: '—', date: '2025-05-18', amt: 0, net: null, tax: null, sellerTax: '', attach: 1, missing: [], flag: { k: 'twoInOne' } }
];

/* 各国演示票据（手机端识别结果用） */
export const DEMO: Partial<Record<GeoCode, DemoDoc>> = {
  CN: { seller: '滴滴出行科技有限公司', kind: '数电票', amt: 365, tax: 30.14 },
  JP: { seller: 'タイムズ24株式会社', kind: '領収書', amt: 2200, tax: null, askTax: true },
  KR: { seller: '서울시티투어', kind: '현금영수증', amt: 38000, tax: 3454 },
  TH: { seller: 'บริษัท ซีพี ออลล์ จำกัด', kind: 'ใบกำกับภาษี', amt: 820, tax: 53.6 },
  DE: { seller: 'Deutsche Bahn AG', kind: 'Rechnung', amt: 86.4, tax: null, askTax: true },
  FR: { seller: 'SNCF Voyageurs', kind: 'Facture', amt: 74.2, tax: 12.37 },
  AE: { seller: 'Emirates Taxi LLC', kind: 'فاتورة ضريبية', amt: 96, tax: 4.57 },
  US: { seller: 'Blue Bottle Coffee', kind: 'Receipt', amt: 24.8, tax: 2.11 },
  SG: { seller: 'Grab Rides Pte Ltd', kind: 'Tax Invoice', amt: 32.4, tax: null, askTax: true }
};

/* 校验与纠正：每张票的校验结果
   st: pass 通过 | fix 可自动纠正（field, from, to）| warn 提示 | fail 不通过 | lock 以税局为准、不得更正 */
const RAW_CHECKS: Record<number, CheckTuple[]> = {
  1: [['img', 'pass', '清晰度 0.94'], ['dup', 'pass', '未发现同号或近似票据'], ['auth', 'pass', '全国增值税发票查验平台：正常'], ['buyer', 'pass', '购方税号与上海分公司一致'], ['sum', 'pass', '334.86 + 30.14 = 365.00']],
  2: [['img', 'pass', '清晰度 0.91'], ['dup', 'pass', '未重复'], ['auth', 'pass', '行程单查验：正常'], ['sum', 'pass', '2,000.00 + 180.00 = 2,180.00']],
  3: [['auth', 'lock', '税额以税局数据为准：OCR 读作 107.40，已自动覆盖为 104.70，不可人工更正'], ['sum', 'pass', '1,163.30 + 104.70 = 1,268.00'], ['buyer', 'pass', '购方一致']],
  4: [['tid', 'pass', '登録番号公表サイト：有效'], ['sum', 'fix', '票面未印消費税額，按税率区分 10% 反算', 'tax', null, 18]],
  5: [['tid', 'fix', '登録番号中字母 O 应为数字 0；公表サイト校验通过', 'sellerTax', 'T9OOOOO1140514', 'T9000001140514'], ['sum', 'pass', '900 + 90 = 990']],
  6: [['cur', 'fix', '日元无小数位：识别结果规范为整数', 'amt', '2,200.00', '2,200'], ['tid', 'pass', '登録番号有效'], ['sum', 'pass', '2,000 + 200 = 2,200']],
  7: [['tid', 'fail', '未识别到登録番号：不属于適格請求書，只能按不可抵扣凭证入账']],
  8: [['dup', 'fail', '与 000572 同车场、同金额，间隔 2 天'], ['tid', 'pass', '登録番号有效']],
  9: [['dup', 'fail', '与 000951 同车场、同金额，间隔 2 天'], ['tid', 'pass', '登録番号有效']],
  10: [['req', 'fail', '无票据，仅有支付凭证，需填写说明']],
  11: [['geo', 'fail', '上传在日本，票面为韩语']],
  12: [['geo', 'warn', '开票主体在荷兰、服务发生在日本']],
  13: [['geo', 'fail', '一张图含两国票据，需拆分']]
};

type CheckTuple = [CheckKey, CheckStatus, string, FixField?, FixValue?, FixValue?];

export const CHECKS: Record<number, CheckDef[]> = Object.fromEntries(
  Object.entries(RAW_CHECKS).map(([id, list]) => [
    Number(id),
    list.map(([key, st, msg, field, from, to]) => ({ key, st, msg, field, from, to })),
  ]),
);

export const INITIAL_LOG: CorrectionLog[] = [
  { id: 3, field: '税额', before: 'CNY 107.40', after: 'CNY 104.70', src: '税局覆盖', at: '08-19 21:04' },
];

/** 导入会话：报销单 EXP-2026-0814，本位币国家 CN，默认选中日本 */
export function buildCaptureSession(localCountry: GeoCode = 'CN', showConversion = true): CaptureSession {
  return {
    reportNo: 'EXP-2026-0814',
    localCountry,
    showConversion,
    entities: ENTITIES,
    pool: POOL,
    unknown: UNK,
    detail: DETAIL,
    rows: SEED.map((r) => ({ ...r, missing: [...r.missing] })),
    checks: CHECKS,
    matched: MATCHED,
    demo: DEMO,
    log: INITIAL_LOG.map((l) => ({ ...l })),
    active: ['CN', 'JP'],
    checked: [1, 2, 5, 6],
    sel: 'JP',
  };
}
