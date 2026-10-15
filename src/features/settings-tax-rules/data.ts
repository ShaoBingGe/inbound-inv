/**
 * 税务规则设置：示例数据（自设计稿 TaxRules.dc.html 原样迁移）与规则模拟。
 * 页面不直接引用本文件，统一经 api.ts 取数。
 */
import type {
  CountryCode,
  RuleStatus,
  SimInput,
  SimLine,
  SimNote,
  SimResult,
  TaxRegime,
  TaxType,
  Treat,
} from './types';

type Pair = [string, string];
type Triple = [string, string, string];
type RuleRow = [string, string, string, string, string, string, RuleStatus];
type VersionRow = [string, string, string, string, RuleStatus];

interface RawRegime {
  name: string;
  regime: string;
  ver: string;
  eff: string;
  owner: string;
  cur: string;
  facts: Pair[];
  taxes: TaxType[];
  reverse: Triple[];
  wht: Pair[];
  kinds: string[];
  rules: RuleRow[];
  versions: VersionRow[];
}

const C: Record<CountryCode, RawRegime> = {
  CN: { name: '中国大陆', regime: '增值税 + 附加税费', ver: 'CN-VAT-2026.2', eff: '2026-07-01', owner: '集团税务 · 青岛', cur: 'CNY',
    facts: [['真值来源', '税局数电票池 / 查验平台'], ['电子发票强制', '数电票全面推行'], ['进项凭证', '专票 · 海关缴款书 · 农产品收购 · 通行费电子票'], ['申报周期', '月（一般纳税人）/ 季'], ['存档', '10 年'], ['逆向机制', '红字发票（红字确认单）']],
    taxes: [{ name: '增值税', level: '国家', rate: '13% / 9% / 6% / 3%', treat: 'credit', cond: '专票 + 用途确认 + 购方税号一致', form: '增值税及附加税费申报表' }, { name: '城建税 / 教育费附加', level: '地方附加', rate: '7% / 3% / 2%（按应纳 VAT）', treat: 'none', cond: '随销项计算，进项不涉及', form: '同上' }, { name: '进口 VAT', level: '海关', rate: '13% / 9%', treat: 'credit', cond: '海关缴款书 + 稽核比对', form: '同上' }],
    reverse: [['退货 / 折让', '红字确认单 → 红字数电票', '进项税额转出，当期申报'], ['开错票', '红字全额冲红后重开', '原票进项不得抵扣'], ['用途改变（转福利）', '无需红字', '进项税额转出'], ['非正常损失', '无需红字', '进项税额转出']],
    wht: [['境外服务', '代扣代缴 VAT 6%（可抵扣）+ 企业所得税 10%'], ['技术引进', '同上，可享协定税率']],
    kinds: ['数电专票', '数电普票', '纸质专票', '海关缴款书'],
    rules: [['CN-DED-001', '抵扣', '仅专票（含数电专票）、海关缴款书等法定凭证可抵扣', 'kind in [专票, 海关缴款书, 农产品, 通行费]', '2019-04-01 →', '财税〔2016〕36 号', 'active'], ['CN-DED-002', '抵扣', '集体福利、个人消费、免税项目用途不得抵扣', 'use in [welfare, exempt] → 转出', '2016-05-01 →', '36 号文 §27', 'active'], ['CN-DED-003', '抵扣', '混用固定资产可全额抵扣；混用其他按比例', 'type=asset & use=mixed → 100%', '2016-05-01 →', '36 号文', 'active'], ['CN-CHK-010', '校验', '专票必须在税局查验平台查验通过且未重复', 'status=正常 & dup=false', '2020-01-01 →', '税总', 'active'], ['CN-REV-020', '逆向', '红字发票必须引用红字确认单号', 'ref=红字确认单', '2023-01-01 →', '税总 2023 年 15 号', 'active'], ['CN-WHT-030', '预提', '境外服务代扣 VAT 与企业所得税', 'type=xborder → VAT 6% + CIT 10%', '2016-05-01 →', '36 号文 / 企业所得税法', 'active'], ['CN-CHK-011', '校验', '数电票以票池数据为准，OCR 差异不得人工更正', 'truth=税局', '2024-01-01 →', '集团内规', 'active'], ['CN-ARC-040', '存档', '电子发票原件保存 10 年', 'retention=10y', '2016-01-01 →', '会计档案管理办法', 'active']],
    versions: [['CN-VAT-2026.2', '2026-07-01', '数电票用途确认流程纳入抵扣条件', '2026-07 起新票', 'active'], ['CN-VAT-2026.1', '2026-01-01', '红字确认单引用改为强制', '逆向票校验', 'superseded'], ['CN-VAT-2025.1', '2025-01-01', '基线', '—', 'superseded']] },
  JP: { name: '日本', regime: '消費税（JCT）· 適格請求書等保存方式', ver: 'JP-JCT-2026.1', eff: '2026-04-01', owner: 'JP-TYO 税务', cur: 'JPY',
    facts: [['真值来源', '票面 + 登録番号公表サイト'], ['电子发票', 'Peppol JP PINT（自愿）'], ['进项凭证', '適格請求書 + 帳簿'], ['申报周期', '年度 + 中間申告'], ['存档', '7 年（電子帳簿保存法）'], ['逆向机制', '返還インボイス / 修正適格請求書']],
    taxes: [{ name: '消費税（国税）', level: '国家', rate: '7.8% / 6.24%', treat: 'credit', cond: '適格請求書 + 帳簿记载', form: '消費税及び地方消費税申告書' }, { name: '地方消費税', level: '地方', rate: '2.2% / 1.76%', treat: 'credit', cond: '随国税', form: '同上' }, { name: '非適格发票', level: '经過措置', rate: '80%（→ 2026-09）/ 50%', treat: 'partial', cond: '帳簿注明経過措置', form: '同上' }],
    reverse: [['退货 / 返還', '返還インボイス', '仕入税額控除 减额'], ['票面错误', '修正適格請求書', '以修正后为准'], ['值引', '返還インボイス', '同上']],
    wht: [['非居民服务', '源泉徴収 20.42%'], ['使用料', '协定税率']],
    kinds: ['適格請求書', '適格簡易請求書', '非適格請求書', '電子インボイス（PINT）'],
    rules: [['JP-DED-001', '抵扣', '仅適格請求書可全额控除，须登録番号有效', 'reg_no valid', '2023-10-01 →', '消費税法 §30', 'active'], ['JP-DED-002', '抵扣', '非適格发票经過措置：80% → 50% → 0', 'rate by date', '2023-10-01 → 2029-09-30', '経過措置', 'active'], ['JP-DED-003', '抵扣', '税率区分必须明示（10% / 8% 軽減）', 'rate_class required', '2023-10-01 →', '区分記載', 'active'], ['JP-CHK-010', '校验', '登録番号在公表サイト校验', 'T + 13 digits', '2023-10-01 →', '国税庁', 'active'], ['JP-CUR-011', '格式', '日元无小数位', 'decimals=0', '—', '—', 'active'], ['JP-REV-020', '逆向', '返還インボイス 须引用原請求書与対象期間', 'ref required', '2023-10-01 →', '消費税法', 'active'], ['JP-ARC-040', '存档', '电子数据 7 年，含修正履歴', 'retention=7y', '2024-01-01 →', '電子帳簿保存法', 'active']],
    versions: [['JP-JCT-2026.1', '2026-04-01', '経過措置比例自动按日期切换', '非適格票', 'active'], ['JP-JCT-2025.1', '2025-04-01', '基线', '—', 'superseded']] },
  DE: { name: '德国', regime: 'Umsatzsteuer（MwSt.）', ver: 'DE-USt-2026.1', eff: '2026-01-01', owner: 'EU-FRA 税务', cur: 'EUR',
    facts: [['真值来源', 'XML（ZUGFeRD / XRechnung）'], ['电子发票', 'B2B 2025 起须能接收；2027/2028 起须开具'], ['进项凭证', '§14 UStG 要素齐全的发票'], ['申报周期', 'USt-VA 月报 + 年报'], ['存档', '10 年（GoBD）'], ['逆向机制', 'Gutschrift / Rechnungskorrektur']],
    taxes: [{ name: 'Umsatzsteuer', level: '联邦', rate: '19% / 7%', treat: 'credit', cond: '§14 要素 + USt-IdNr. 有效 + 应税用途', form: 'USt-Voranmeldung' }, { name: 'Reverse charge（§13b）', level: '跨境服务 / 建筑', rate: '19%', treat: 'credit', cond: '买方自计销项并抵扣进项', form: '同上' }, { name: 'Einfuhrumsatzsteuer', level: '海关', rate: '19% / 7%', treat: 'credit', cond: '海关单据', form: '同上' }],
    reverse: [['退货 / 折让', 'Gutschrift 引用原票', 'Vorsteuer §17 更正'], ['票面错误', 'Rechnungskorrektur', '未更正前进项有 §14c 风险'], ['Skonto', '付款时折扣', '按实付更正进项']],
    wht: [['建筑劳务', 'Bauabzugsteuer 15%（除非有免税证明）'], ['非居民艺术/体育', '§50a EStG']],
    kinds: ['Rechnung（ZUGFeRD）', 'XRechnung', 'Rechnung PDF', 'Kleinbetragsrechnung ≤ €250'],
    rules: [['DE-DED-001', '抵扣', '发票须含 §14 Abs.4 全部要素', '§14 elements', '—', 'UStG §14/§15', 'active'], ['DE-DED-002', '抵扣', '≤ €250 小额发票可简化', 'total ≤ 250', '2017-01-01 →', '§33 UStDV', 'active'], ['DE-DED-003', '抵扣', '跨境服务 §13b 买方自计', 'type=xborder → RC', '—', '§13b', 'active'], ['DE-CHK-010', '校验', 'USt-IdNr. 经 VIES 校验', 'VIES valid', '—', 'EU', 'active'], ['DE-CHK-011', '校验', '结构化 XML 为准，PDF 仅参照', 'truth=XML', '2025-01-01 →', 'E-Rechnung', 'active'], ['DE-REV-020', '逆向', 'Gutschrift 须引用原票号与行', 'ref required', '—', '§14/§17', 'active'], ['DE-ARC-040', '存档', '10 年，XML 原件不可变', 'retention=10y', '—', 'GoBD', 'active']],
    versions: [['DE-USt-2026.1', '2026-01-01', 'XML 为真值来源；PDF 不一致提示', '邮箱与门户渠道', 'active'], ['DE-USt-2025.1', '2025-01-01', 'E-Rechnung 接收义务', '—', 'superseded']] },
  US: { name: '美国', regime: 'Sales & Use Tax（州 / 地方）', ver: 'US-GA-2026.1', eff: '2026-01-01', owner: 'NA-IAD 税务', cur: 'USD',
    facts: [['真值来源', '票面 OCR / EDI 810'], ['电子发票', '无强制'], ['进项凭证', '无进项抵扣概念'], ['申报周期', 'Use tax 按州月/季'], ['存档', '联邦 7 年'], ['逆向机制', 'Credit memo']],
    taxes: [{ name: 'State sales tax', level: '州', rate: '0–7.25%（按州）', treat: 'cost', cond: '供应商代收', form: '—' }, { name: 'Local sales tax', level: '县 / 市', rate: '0–5%', treat: 'cost', cond: '同上', form: '—' }, { name: 'Use tax', level: '州', rate: '同 sales tax', treat: 'cost', cond: '供应商未代收时买方自评', form: 'State use tax return' }],
    reverse: [['退货 / 折让', 'Credit memo 引用原票', '成本冲减'], ['多付', 'Credit memo 抵扣下次付款', '—'], ['免税采购', 'Exemption certificate', '不计税']],
    wht: [['服务供应商（非公司）', '1099-NEC 年度申报，不代扣'], ['非居民', 'W-8BEN · 30% 预提除非协定']],
    kinds: ['Invoice', 'Receipt', 'EDI 810', 'Credit memo'],
    rules: [['US-TAX-001', '税务', '税额计入成本或资本化，不抵扣', 'credit=0', '—', '州法', 'active'], ['US-TAX-002', '税务', '供应商未代收 → 买方自评 Use tax', 'tax=0 & taxable → use tax', '—', '州法', 'active'], ['US-TAX-003', '税务', '转售 / 制造用途凭免税证书免税', 'cert on file', '—', '州法', 'active'], ['US-CHK-010', '校验', 'Sales tax 须单列，不得并入 Subtotal', 'tax line required', '—', '集团内规', 'active'], ['US-WHT-030', '预提', '非居民服务 30% 预提，除非 W-8BEN-E 协定', 'type=xborder', '—', 'IRC §1441', 'active'], ['US-ARC-040', '存档', '7 年', 'retention=7y', '—', 'IRS', 'active']],
    versions: [['US-GA-2026.1', '2026-01-01', '乔治亚地方税率更新', '法人 US-ATL-01', 'active'], ['US-GA-2025.1', '2025-01-01', '基线', '—', 'superseded']] },
  BR: { name: '巴西', regime: 'ICMS / IPI / PIS / COFINS（→ IBS/CBS 过渡）', ver: 'BR-SP-2026.2', eff: '2026-07-01', owner: 'LATAM-GRU 税务', cur: 'BRL',
    facts: [['真值来源', 'SEFAZ 授权的 NF-e XML'], ['电子发票', 'NF-e / NFS-e 强制'], ['进项凭证', '授权 XML + 正确 CFOP'], ['申报周期', 'SPED Fiscal · EFD-Contribuições 月报'], ['存档', '5 年'], ['逆向机制', 'NF-e de devolução / Carta de Correção']],
    taxes: [{ name: 'ICMS', level: '州', rate: '7–20%', treat: 'credit', cond: '用于应税流转，CFOP 匹配', form: 'SPED Fiscal' }, { name: 'IPI', level: '联邦', rate: '0–30%', treat: 'credit', cond: '工业企业，用于生产', form: 'SPED Fiscal' }, { name: 'PIS / COFINS', level: '联邦', rate: '1.65% / 7.6%', treat: 'credit', cond: '非累积制', form: 'EFD-Contribuições' }, { name: 'CBS / IBS（过渡）', level: '改革', rate: '2026 试点 0.9% / 0.1%', treat: 'credit', cond: '并行计算', form: '新申报' }],
    reverse: [['退货', 'NF-e de devolução 引用 chave', '各税种分别冲减'], ['非金额错误', 'Carta de Correção', '无税务影响'], ['金额错误', '取消（24h）后重开', '原票作废']],
    wht: [['服务', 'IRRF 1.5% · CSRF 4.65% · INSS 11%（部分）'], ['跨境', 'IRRF 15–25% + CIDE 10%']],
    kinds: ['NF-e', 'NFS-e', 'CT-e（运输）'],
    rules: [['BR-DED-001', '抵扣', 'NF-e 须经 SEFAZ 授权且 CFOP 与用途一致', 'status=autorizada', '—', 'RICMS', 'active'], ['BR-DED-002', '抵扣', '一张票按税种拆分为 4 个抵扣对象', 'split by tax', '—', '—', 'active'], ['BR-CHK-010', '校验', 'XML 签名与 chave 校验', 'signature valid', '—', 'SEFAZ', 'active'], ['BR-REV-020', '逆向', 'Carta de Correção 不得修改金额、税额、CNPJ', 'fields limited', '—', 'Ajuste SINIEF', 'active'], ['BR-WHT-030', '预提', '服务发票按类别代扣 IRRF/CSRF/INSS', 'type=service', '—', 'RFB', 'active'], ['BR-TRN-050', '改革', 'CBS/IBS 并行计算，暂不抵扣', 'parallel calc', '2026-01-01 →', 'LC 214/2025', 'draft']],
    versions: [['BR-SP-2026.2', '2026-07-01', 'CBS/IBS 并行试算', '新字段', 'active'], ['BR-SP-2026.1', '2026-01-01', '基线', '—', 'superseded']] },
  IN: { name: '印度', regime: 'GST（CGST / SGST / IGST）', ver: 'IN-GST-2026.1', eff: '2026-04-01', owner: 'SEA-SIN 税务', cur: 'INR',
    facts: [['真值来源', 'IRP（IRN + QR）'], ['电子发票', 'B2B 强制（按营业额阈值）'], ['进项凭证', 'IRN 有效 + GSTR-2B 匹配'], ['申报周期', 'GSTR-3B 月报'], ['存档', '6 年'], ['逆向机制', 'Credit note（引用原票）']],
    taxes: [{ name: 'CGST + SGST', level: '州内', rate: '各 9% / 6% / 2.5%', treat: 'credit', cond: 'GSTR-2B 中出现 + IRN 有效', form: 'GSTR-3B' }, { name: 'IGST', level: '跨州 / 进口', rate: '18% / 12% / 5%', treat: 'credit', cond: '同上', form: 'GSTR-3B' }, { name: 'RCM', level: '反向征收', rate: '按品类', treat: 'credit', cond: '买方自计', form: 'GSTR-3B' }],
    reverse: [['退货 / 折让', 'Credit note 引用原票', 'ITC 反转'], ['180 天未付款', '无需单据', 'ITC 反转并加息'], ['票面错误', 'Credit + 新票', '—']],
    wht: [['服务', 'TDS 194C/194J 1–10%'], ['GST TDS', '政府采购 2%']],
    kinds: ['Tax invoice（IRN）', 'Bill of supply', 'Import BoE'],
    rules: [['IN-DED-001', '抵扣', 'ITC 仅限 GSTR-2B 中出现的发票', '2B match', '2022-01-01 →', 'CGST Rule 36(4)', 'active'], ['IN-DED-002', '抵扣', '180 天未付款反转 ITC', 'unpaid > 180d', '—', 'Sec 16(2)', 'active'], ['IN-CHK-010', '校验', 'IRN 与 QR 码校验', 'IRN valid', '—', 'IRP', 'active'], ['IN-WHT-030', '预提', '服务按 194 条款代扣 TDS', 'type=service', '—', 'IT Act', 'active'], ['IN-ARC-040', '存档', '6 年', 'retention=6y', '—', 'CGST Act', 'active']],
    versions: [['IN-GST-2026.1', '2026-04-01', 'IRN 阈值下调', '更多供应商', 'active'], ['IN-GST-2025.1', '2025-04-01', '基线', '—', 'superseded']] },
  SA: { name: '沙特阿拉伯', regime: 'VAT（ZATCA e-invoicing）', ver: 'SA-VAT-2026.1', eff: '2026-01-01', owner: 'ME-RUH 税务', cur: 'SAR',
    facts: [['真值来源', 'ZATCA 清关 / 报告的 XML + QR'], ['电子发票', 'Fatoora 第二阶段，分批集成'], ['进项凭证', '合规税务发票（阿英双语）'], ['申报周期', '月 / 季'], ['存档', '6 年'], ['逆向机制', 'Credit note（ZATCA 报告）']],
    taxes: [{ name: 'VAT', level: '国家', rate: '15%', treat: 'credit', cond: 'VAT number 有效 + ZATCA 合规', form: 'VAT return' }, { name: 'RCM', level: '进口服务', rate: '15%', treat: 'credit', cond: '买方自计', form: 'VAT return' }],
    reverse: [['退货 / 折让', 'Credit note 引用原票，ZATCA 报告', '进项减额'], ['票面错误', 'Credit + 新票', '—']],
    wht: [['非居民服务', 'WHT 5–20%'], ['特许权', '15%']],
    kinds: ['Tax invoice', 'Simplified tax invoice'],
    rules: [['SA-DED-001', '抵扣', '须为合规税务发票并含 QR', 'QR valid', '2021-12-04 →', 'ZATCA', 'active'], ['SA-CHK-010', '校验', 'VAT number 15 位，首尾为 3', '^3\\d{13}3$', '—', 'ZATCA', 'active'], ['SA-WHT-030', '预提', '非居民服务代扣', 'type=xborder', '—', 'Income Tax Law', 'active'], ['SA-ARC-040', '存档', '6 年', 'retention=6y', '—', 'VAT Law', 'active']],
    versions: [['SA-VAT-2026.1', '2026-01-01', 'Fatoora 集成波次扩展', '更多供应商', 'active']] },
  MX: { name: '墨西哥', regime: 'IVA（CFDI 4.0）', ver: 'MX-IVA-2026.1', eff: '2026-01-01', owner: 'NA-IAD 税务', cur: 'MXN',
    facts: [['真值来源', 'SAT 盖章的 CFDI XML'], ['电子发票', 'CFDI 4.0 强制'], ['进项凭证', 'CFDI 状态 Vigente + 付款补充单'], ['申报周期', '月'], ['存档', '5 年'], ['逆向机制', 'CFDI de egreso（Nota de crédito）/ cancelación']],
    taxes: [{ name: 'IVA', level: '联邦', rate: '16% / 8%（边境）/ 0%', treat: 'credit', cond: 'CFDI Vigente + 已付款（PPD 需 complemento de pago）', form: 'Declaración mensual' }, { name: 'IVA retenido', level: '代扣', rate: '2/3 或 4%', treat: 'wht', cond: '服务 / 运输', form: '同上' }, { name: 'ISR retenido', level: '代扣', rate: '10%', treat: 'wht', cond: '个人服务', form: '同上' }],
    reverse: [['退货 / 折让', 'CFDI de egreso 引用 UUID', 'IVA 减额'], ['票面错误', 'Cancelación（需接受）+ 新 CFDI', '原票作废'], ['付款', 'Complemento de pago', '决定可抵扣月份']],
    wht: [['专业服务（个人）', 'ISR 10% + IVA 2/3'], ['运输', 'IVA 4%']],
    kinds: ['CFDI Ingreso', 'CFDI Egreso', 'CFDI Pago'],
    rules: [['MX-DED-001', '抵扣', 'CFDI 须 Vigente；PPD 发票以付款补充单月份抵扣', 'status=Vigente', '2022-01-01 →', 'LIVA', 'active'], ['MX-CHK-010', '校验', 'UUID 与 SAT 状态查询', 'SAT status', '—', 'SAT', 'active'], ['MX-REV-020', '逆向', 'Egreso 须引用原 UUID', 'ref=UUID', '—', 'Anexo 20', 'active'], ['MX-WHT-030', '预提', '按 CFDI 代扣节点自动计算', 'retenciones node', '—', 'LISR/LIVA', 'active'], ['MX-ARC-040', '存档', '5 年', 'retention=5y', '—', 'CFF', 'active']],
    versions: [['MX-IVA-2026.1', '2026-01-01', '基线', '—', 'active']] }
};

export const COUNTRY_ORDER = Object.keys(C) as CountryCode[];

function toRegime(code: CountryCode, c: RawRegime): TaxRegime {
  return {
    code,
    name: c.name,
    regime: c.regime,
    ver: c.ver,
    eff: c.eff,
    owner: c.owner,
    cur: c.cur,
    facts: c.facts.map(([k, v]) => ({ k, v })),
    taxes: c.taxes.map((t) => ({ ...t })),
    reverse: c.reverse.map(([k, how, eff]) => ({ k, how, eff })),
    wht: c.wht.map(([k, v]) => ({ k, v })),
    kinds: [...c.kinds],
    rules: c.rules.map(([code, cat, text, param, eff, basis, status]) => ({ code, cat, text, param, eff, basis, status })),
    versions: c.versions.map(([v, eff, change, impact, status]) => ({ v, eff, change, impact, status })),
  };
}

export function buildRegimes(): TaxRegime[] {
  return COUNTRY_ORDER.map((k) => toRegime(k, C[k]));
}

/** 下一个草稿版本号：CN-VAT-2026.2 → CN-VAT-2026.3 */
export function nextDraftVersion(ver: string): string {
  const m = /^(.*\.)(\d+)$/.exec(ver);
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${ver}.1`;
}

/** 规则模拟：输入一张假想发票，按该国当前版本给出各税种税额与处理（逻辑与设计稿 simulate 一致） */
export function simulate(c: TaxRegime, sim: SimInput): SimResult {
  const k = c.code;
  const amt = parseFloat(String(sim.amt).replace(/[^0-9.]/g, '')) || 0;
  const digits = k === 'JP' ? 0 : 2;
  const fmt = (v: number) =>
    c.cur + ' ' + v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const lines: SimLine[] = [];
  const notes: SimNote[] = [];
  let credit = 0;
  let cost = 0;
  let wht = 0;
  let total = amt;
  const push = (name: string, rate: number, treat: Treat, code: string | null, text: string) => {
    const v = Math.round(amt * rate * 100) / 100;
    lines.push({ name, amt: fmt(v), treat });
    if (treat === 'credit') credit += v;
    if (treat === 'partial') credit += v * 0.8;
    if (treat === 'cost') cost += v;
    if (treat === 'wht') wht += v;
    if (treat !== 'wht') total += v;
    if (code) notes.push({ code, text });
  };
  const nonTaxable = sim.use === 'exempt' || sim.use === 'welfare';

  if (k === 'CN') {
    const r = sim.type === 'service' || sim.type === 'xborder' ? 0.06 : 0.13;
    const special = sim.kind.indexOf('专票') >= 0 || sim.kind.indexOf('海关') >= 0;
    if (sim.type === 'xborder') {
      push('代扣代缴 VAT', 0.06, nonTaxable ? 'cost' : 'credit', 'CN-WHT-030', '境外服务：代扣代缴 VAT 6%，取得完税凭证后可抵扣');
      push('代扣企业所得税', 0.1, 'wht', null, '');
    } else {
      push(
        '增值税',
        r,
        !special ? 'cost' : nonTaxable ? 'cost' : sim.use === 'mixed' && sim.type !== 'asset' ? 'partial' : 'credit',
        'CN-DED-001',
        special ? '专票可抵扣' : '普票不得抵扣，税额计入成本',
      );
      if (nonTaxable) notes.push({ code: 'CN-DED-002', text: '用途为免税或福利：进项税额转出' });
      if (sim.use === 'mixed' && sim.type === 'asset') notes.push({ code: 'CN-DED-003', text: '混用固定资产可全额抵扣' });
    }
  } else if (k === 'JP') {
    const r = 0.1;
    const ok = sim.kind.indexOf('非適格') < 0;
    push(
      '消費税（含地方）',
      r,
      ok ? (nonTaxable ? 'cost' : 'credit') : 'partial',
      ok ? 'JP-DED-001' : 'JP-DED-002',
      ok ? '適格請求書：全额仕入税額控除' : '非適格：経過措置按 80% 控除（至 2026-09-30）',
    );
    notes.push({ code: 'JP-CUR-011', text: '日元取整，无小数' });
  } else if (k === 'DE') {
    if (sim.type === 'xborder') {
      push('USt（§13b 自计）', 0.19, 'credit', 'DE-DED-003', 'Reverse charge：自计销项并同额抵扣进项，净额为零');
    } else {
      push('Umsatzsteuer', 0.19, nonTaxable ? 'cost' : 'credit', 'DE-DED-001', '§14 要素齐全 + VIES 有效即可抵扣');
      if (amt <= 250) notes.push({ code: 'DE-DED-002', text: '≤ €250 可用小额发票简化' });
    }
  } else if (k === 'US') {
    push('State sales tax', 0.04, 'cost', 'US-TAX-001', '无进项抵扣，税额计入成本');
    push('Local sales tax', 0.03, 'cost', null, '');
    if (sim.type === 'xborder') push('非居民预提', 0.3, 'wht', 'US-WHT-030', '除非 W-8BEN-E 适用协定');
    if (sim.use === 'mixed') notes.push({ code: 'US-TAX-003', text: '转售 / 制造用途可向供应商提供免税证书' });
  } else if (k === 'BR') {
    push('ICMS', 0.18, nonTaxable ? 'cost' : 'credit', 'BR-DED-002', '按税种拆分为 4 个抵扣对象');
    push('IPI', 0.05, sim.type === 'goods' ? 'credit' : 'cost', null, '');
    push('PIS', 0.0165, 'credit', null, '');
    push('COFINS', 0.076, 'credit', null, '');
    if (sim.type === 'service') {
      push('IRRF 代扣', 0.015, 'wht', 'BR-WHT-030', '服务发票代扣 IRRF / CSRF / INSS');
      push('CSRF 代扣', 0.0465, 'wht', null, '');
    }
    notes.push({ code: 'BR-TRN-050', text: 'CBS/IBS 并行试算（草稿规则）' });
  } else if (k === 'IN') {
    const r = 0.18;
    if (sim.type === 'xborder') push('IGST', r, 'credit', 'IN-DED-001', '跨州 / 进口按 IGST');
    else {
      push('CGST', r / 2, 'credit', 'IN-DED-001', '须在 GSTR-2B 中出现');
      push('SGST', r / 2, 'credit', null, '');
    }
    if (sim.type === 'service') push('TDS 194J', 0.1, 'wht', 'IN-WHT-030', '专业服务代扣 10%');
    notes.push({ code: 'IN-DED-002', text: '180 天未付款将反转 ITC' });
  } else if (k === 'SA') {
    push('VAT', 0.15, nonTaxable ? 'cost' : 'credit', 'SA-DED-001', '合规税务发票含 QR 方可抵扣');
    if (sim.type === 'xborder') push('WHT', 0.15, 'wht', 'SA-WHT-030', '非居民服务代扣');
  } else if (k === 'MX') {
    push('IVA', 0.16, nonTaxable ? 'cost' : 'credit', 'MX-DED-001', 'CFDI Vigente；PPD 以付款补充单月份抵扣');
    if (sim.type === 'service') {
      push('IVA retenido', (0.16 * 2) / 3, 'wht', 'MX-WHT-030', '个人服务代扣 IVA 2/3 与 ISR 10%');
      push('ISR retenido', 0.1, 'wht', null, '');
    }
  }
  return { lines, notes, total: fmt(total), credit: fmt(credit), cost: fmt(cost), wht: fmt(wht) };
}
