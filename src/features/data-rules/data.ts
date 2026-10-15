/** 示例数据（与设计稿 Dataset.dc.html 一致） */
import type {
  AgentDef,
  CheckItem,
  CountryCode,
  CountryProfile,
  CountryStrategy,
  DatasetRules,
  StartRunRequest,
  TestRun,
  TriggerDef,
} from './types';

type Cov = [string, number, number];
type Sch = [string, string, string];
const cov = (xs: Cov[]) => xs.map(([label, cur, tgt]) => ({ label, cur, tgt }));
const sch = (xs: Sch[]) => xs.map(([key, required, format]) => ({ key, required, format }));

export const COUNTRIES: CountryProfile[] = [
  {
    code: 'JP', name: '日本', dc: 'JP-TYO', size: 8000, cur: 7420, pend: 1386, cap: 25, mu: 4.6, sigma: 0.9, floodCenter: 5.9, flood: 0.42,
    acc: '96.6%', model: 'v4.1', trig: '10-09 · 登録番号误差连续 3 天 > 3%', batch: 'JP-2610-03', batchN: 1200,
    types: cov([['適格請求書', 52, 55], ['レシート', 23, 25], ['手書き領収書', 14, 8], ['電子インボイス', 11, 12]]),
    schema: sch([['registration_no', '是', '^T\\d{13}$'], ['issue_date', '是', 'YYYY-MM-DD'], ['tax_rate_class', '是', '10% | 8%（軽減）'], ['consumption_tax', '是', '整数，无小数'], ['total_amount', '是', '整数 JPY'], ['po_no', '否', '^PO-45\\d{8}$']]),
  },
  {
    code: 'CN', name: '中国大陆', dc: 'CN-QD', size: 12000, cur: 11850, pend: 412, cap: 15, mu: 4.2, sigma: 1.1, floodCenter: 3.2, flood: 0.18,
    acc: '99.2%', model: 'v4.1', trig: '09-30 · 季度抽检', batch: 'CN-2609-12', batchN: 1600,
    types: cov([['数电专票', 46, 45], ['数电普票', 31, 30], ['纸质专票', 9, 10], ['火车票 / 机票行程单', 14, 15]]),
    schema: sch([['invoice_no', '是', '^\\d{20}$ 或 ^\\d{8}$'], ['issue_date', '是', 'YYYY-MM-DD'], ['seller_tax_id', '是', '18 位统一社会信用代码'], ['tax_amount', '是', '两位小数'], ['total_amount', '是', '两位小数']]),
  },
  {
    code: 'DE', name: '德国', dc: 'EU-FRA', size: 6000, cur: 5210, pend: 640, cap: 25, mu: 4.0, sigma: 1.0, floodCenter: 4.1, flood: 0.22,
    acc: '95.9%', model: 'v4.1', trig: '10-02 · 新模板：3 家供应商改版', batch: 'DE-2610-02', batchN: 800,
    types: cov([['Rechnung PDF', 48, 45], ['ZUGFeRD 呈现件', 22, 25], ['Kleinbetragsrechnung', 18, 20], ['Gutschrift', 12, 10]]),
    schema: sch([['ust_id', '是', '^DE\\d{9}$'], ['rechnungsdatum', '是', 'YYYY-MM-DD'], ['leistungsdatum', '是', 'YYYY-MM-DD 或区间'], ['mwst_betrag', '是', '两位小数'], ['gesamtbetrag', '是', '两位小数']]),
  },
  {
    code: 'US', name: '美国', dc: 'NA-IAD', size: 7000, cur: 6380, pend: 2210, cap: 30, mu: 3.9, sigma: 1.2, floodCenter: 4.1, flood: 0.51,
    acc: '93.0%', model: 'v4.1', trig: '10-11 · Sales tax 误差 > 6%', batch: 'US-2610-04', batchN: 1000,
    types: cov([['Invoice PDF', 55, 50], ['Receipt', 25, 30], ['Statement', 8, 8], ['Credit memo', 12, 12]]),
    schema: sch([['invoice_no', '是', '自由格式'], ['invoice_date', '是', 'YYYY-MM-DD'], ['subtotal', '是', '两位小数'], ['sales_tax', '否', '两位小数'], ['po_number', '否', '^PO-45\\d{8}$']]),
  },
  {
    code: 'VN', name: '越南', dc: 'SEA-SIN', size: 4000, cur: 2950, pend: 980, cap: 30, mu: 4.3, sigma: 0.8, floodCenter: 4.8, flood: 0.38,
    acc: '91.6%', model: 'v4.1', trig: '10-06 · 销方名称声调错误率 > 8%', batch: 'VN-2610-01', batchN: 600,
    types: cov([['Hóa đơn GTGT', 64, 60], ['Hóa đơn bán hàng', 21, 25], ['扫描件', 15, 15]]),
    schema: sch([['ma_so_thue', '是', '^\\d{10}(-\\d{3})?$'], ['ky_hieu', '是', '^[1-2][CK]\\d{2}[A-Z]{3}$'], ['ngay_lap', '是', 'YYYY-MM-DD'], ['tien_thue', '是', '整数 VND']]),
  },
  {
    code: 'MX', name: '墨西哥', dc: 'NA-IAD', size: 3000, cur: 3010, pend: 96, cap: 15, mu: 4.4, sigma: 0.9, floodCenter: 4.4, flood: 0.08,
    acc: '98.1%', model: 'v4.1', trig: '09-15 · 季度抽检', batch: 'MX-2609-03', batchN: 400,
    types: cov([['CFDI 4.0 PDF', 78, 75], ['Nota de crédito', 12, 15], ['Ticket', 10, 10]]),
    schema: sch([['uuid', '是', 'UUID v4'], ['rfc_emisor', '是', '^[A-Z&Ñ]{3,4}\\d{6}[A-Z0-9]{3}$'], ['total', '是', '两位小数']]),
  },
  {
    code: 'SA', name: '沙特阿拉伯', dc: 'ME-RUH', size: 3000, cur: 2440, pend: 520, cap: 25, mu: 4.5, sigma: 0.9, floodCenter: 4.7, flood: 0.3,
    acc: '97.0%', model: 'v4.1', trig: '10-04 · 二维码遮挡样本增多', batch: 'SA-2610-01', batchN: 300,
    types: cov([['Tax Invoice 阿英双语', 70, 65], ['Simplified', 30, 35]]),
    schema: sch([['vat_number', '是', '^3\\d{13}3$'], ['invoice_date', '是', 'YYYY-MM-DD'], ['total_incl_vat', '是', '两位小数']]),
  },
  {
    code: 'BR', name: '巴西', dc: 'LATAM-GRU', size: 3000, cur: 2760, pend: 210, cap: 20, mu: 4.6, sigma: 1.0, floodCenter: 4.9, flood: 0.12,
    acc: '97.8%', model: 'v4.1', trig: '09-20 · 季度抽检', batch: 'BR-2609-02', batchN: 300,
    types: cov([['DANFE NF-e', 72, 70], ['NFS-e', 28, 30]]),
    schema: sch([['chave_acesso', '是', '44 位数字'], ['cnpj_emitente', '是', 'NN.NNN.NNN/NNNN-NN'], ['valor_icms', '是', '两位小数']]),
  },
];

export const TRIGGER_DEFS: TriggerDef[] = [
  { key: 'err', label: '字段误差率超阈值', sub: '任一字段 7 日误差率 > 3%，且连续 3 天' },
  { key: 'tpl', label: '同一版式被反复更正', sub: '单一供应商模板 30 天内被更正 ≥ 20 次' },
  { key: 'newsup', label: '出现新版式模板', sub: '版式聚类发现未见过的模板，样本 ≥ 30 张' },
  { key: 'release', label: '模型版本发布前', sub: '候选版本须在最新数据集上回归' },
  { key: 'quarter', label: '季度例行抽检', sub: '每季度按分层随机抽样 5%' },
];

export const STRATA = ['票种', '语言', '影像质量（清晰度 / 倾斜 / 手写）', '金额区间', '采集渠道', '供应商版式'];

export const AGENTS: AgentDef[] = [
  { key: 'collect', name: '回流采集', role: '监听高频修正与税局覆盖，按触发条件抽取候选', status: '运行中', tone: 'blue', gate: null },
  { key: 'clean', name: '脱敏清洗', role: '去重（感知哈希）、遮盖个人信息与银行账号、剔除模糊影像', status: '运行中', tone: 'blue', gate: null },
  { key: 'prelabel', name: '预标注', role: '用线上模型与更正真值生成预标注框与字段值', status: '运行中', tone: 'blue', gate: null },
  { key: 'qa', name: '标注质检', role: '格式检查、影像文本复读、双人一致性（κ）', status: '待人工', tone: 'orange', gate: '抽检 50 张并通过' },
  { key: 'balance', name: '分布均衡', role: '按分层维度重采样，保持 PSI < 0.10 与目标正态一致', status: '运行中', tone: 'blue', gate: null },
  { key: 'eval', name: '回归评测', role: '在冻结测试集与困难集上对比候选与线上模型', status: '空闲', tone: 'gray', gate: null },
  { key: 'gate', name: '发布守门', role: '指标不退化、各国不低于阈值时提交人工审批', status: '待审批', tone: 'orange', gate: '批准灰度 10%' },
];

export const CHECK_ITEMS: CheckItem[] = [
  { label: '必填字段缺失', value: 6, action: '退回标注员补全' },
  { label: '格式不符（正则 / 小数位）', value: 9, action: '自动规范化 7 处，2 处退回' },
  { label: '标注框越界或重叠', value: 4, action: '自动裁剪到影像边界' },
  { label: '标注值与影像文本不一致', value: 11, action: '复读后人工复核' },
  { label: '与税局 / XML 真值冲突', value: 3, action: '以真值为准并记录' },
  { label: '双人一致性 κ', value: '0.91', action: '≥ 0.85 合格' },
];

const RUNS0: TestRun[] = [
  { id: 'RUN-3318', country: '日本', model: 'v4.2-rc1', split: '冻结测试集', n: 1200, acc: 97.4, full: 81.2, dur: 4.1, delta: 0.8, verdict: '可发布' },
  { id: 'RUN-3317', country: '日本', model: 'v4.2-rc1', split: '高频修正困难集', n: 600, acc: 91.8, full: 58.3, dur: 5.2, delta: 6.1, verdict: '显著改善' },
  { id: 'RUN-3309', country: '美国', model: 'v4.2-rc1', split: '冻结测试集', n: 1000, acc: 92.6, full: 63.0, dur: 6.3, delta: -0.4, verdict: '退化，阻断' },
  { id: 'RUN-3301', country: '越南', model: 'v4.1', split: '冻结测试集', n: 600, acc: 91.6, full: 55.4, dur: 8.6, delta: 0, verdict: '基线' },
];

export const SPLIT_NAMES = { test: '冻结测试集', hard: '高频修正困难集', val: '验证集' } as const;

function initialStrategies(): Record<CountryCode, CountryStrategy> {
  const out = {} as Record<CountryCode, CountryStrategy>;
  for (const c of COUNTRIES) {
    const quarter = c.code === 'CN' || c.code === 'MX' || c.code === 'BR';
    out[c.code] = { size: c.size, cap: c.cap, trig: { err: true, tpl: true, newsup: true, release: true, quarter } };
  }
  return out;
}

export function buildDatasetRules(): DatasetRules {
  return {
    countries: COUNTRIES,
    strategies: initialStrategies(),
    triggerDefs: TRIGGER_DEFS,
    strata: STRATA,
    agents: AGENTS,
    checkItems: CHECK_ITEMS,
    runs: RUNS0,
    nextRunSeq: 3319,
  };
}

/** mock：模拟一次批量测试运行（与设计稿 startRun 的算法一致） */
export function simulateRun(req: StartRunRequest): TestRun {
  const c = COUNTRIES.find((x) => x.code === req.country) ?? COUNTRIES[0];
  const base = parseFloat(c.acc);
  const hard = req.split === 'hard';
  const cand = req.model === 'v4.2-rc1';
  const acc = (hard ? base - 5.6 : base) + (cand ? (hard ? 5.2 : 0.6) : req.model === 'v4.0' ? -1.1 : 0);
  const delta = acc - (hard ? base - 5.6 : base);
  return {
    id: 'RUN-' + req.seq,
    country: c.name,
    model: req.model,
    split: SPLIT_NAMES[req.split],
    n: hard ? Math.round(c.batchN / 2) : c.batchN,
    acc,
    full: acc - 16 - (hard ? 15 : 0),
    dur: 4 + (100 - acc) / 4,
    delta,
    verdict: delta < -0.2 ? '退化，阻断' : delta > 0.2 ? '可发布' : '持平',
  };
}
