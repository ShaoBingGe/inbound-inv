/* 示例数据：与设计稿 CorrectionData.dc.html 一致（mock 模式使用） */
import type { Tone } from '@/components/ui';
import type {
  ConflictRule,
  CorrectionDashboard,
  CorrectionRecord,
  CorrectionSource,
  EvalRun,
  HotField,
  LoopStage,
  RoutingRule,
  TruthRule,
} from './types';

const STAGES: LoopStage[] = [
  {
    label: '捕获',
    value: 5842,
    sub: '条修正',
    desc: '采集页、H5、门户、票夹、数据修正页的每一次更正，含税局覆盖',
    rules: ['记录 before/after、字段、渠道、组合版本、修正人角色', '同一字段多次更正只取最终生效值，但保留链路', '驳回的更正也捕获，标为负样本候选'],
  },
  {
    label: '核验',
    value: 4310,
    sub: '通过 · 212 待核验',
    desc: '按真值优先级核对，低优先级修正需要旁证',
    rules: ['税局/XML 真值可直接采纳', '人工更正需影像复读一致 + 第二来源', '修正人信任分 < 60 的条目强制双人'],
  },
  {
    label: '清洗',
    value: 4106,
    sub: '保留 · 204 剔除',
    desc: '去重、脱敏、剔除异常与无法定位的修正',
    rules: ['影像与字段框必须能定位，否则剔除', '脱敏：银行账号、个人姓名、联系方式', '同票同字段多次修正合并为一条'],
  },
  {
    label: '分层入集',
    value: 3980,
    sub: '入集 · 126 待分配',
    desc: '按国家 / 票种 / 字段 / 错误类型分层，送入训练或困难集',
    rules: ['回流占比上限由「数据识别规则管理」控制', '单供应商 ≤ 3%，单模板 ≤ 5%', '同季度回流样本不进冻结测试集'],
  },
  {
    label: '评测',
    value: 2,
    sub: '次 / 月',
    desc: '两周一次在修正样本集上评测线上模型',
    rules: ['修正样本准确率必须高于上期', '按国家出报告，退化国家自动开工单', '季度刷新冻结测试集时抽入 10% 已验证修正'],
  },
  {
    label: '回馈',
    value: 38,
    sub: '条规则建议',
    desc: '修正模式反推规则：来源规则、校验阈值、供应商模板',
    rules: ['同一供应商同一字段被改 ≥ 5 次 → 建议模板', '同一来源邮箱被改判 ≥ 3 次 → 建议来源规则', '建议由管理员确认后生效'],
  },
];

const SOURCES: CorrectionSource[] = (
  [
    ['员工（ERP / H5 / 票夹）', '采集时更正、票夹标注', 2210, 78, 6],
    ['供应商（门户）', '门户标注与补充', 940, 61, 14],
    ['税局 / 平台覆盖', '以平台数据覆盖 OCR', 1480, 100, 0],
    ['AP / 财务复核', '数据修正页四眼复核', 820, 92, 3],
    ['下游驳回回写', '三单匹配、审批驳回后的更正', 392, 84, 5],
  ] as const
).map(([name, sub, count, acceptedPct, rejectedPct]) => ({ name, sub, count, acceptedPct, rejectedPct }));

const TRUTH: TruthRule[] = (
  [
    [1, '税局 / 清关平台 / XML 主件', '直接采纳，覆盖所有其他来源', '绝对', 'red'],
    [2, '下游单据确认', 'AP 单过账或付款回单与更正值一致', '高', 'orange'],
    [3, '双人一致', '两名修正人独立给出相同值', '高', 'orange'],
    [4, '影像复读一致', '核验 Agent 复读影像与更正值一致（置信 ≥ 0.9）', '中', 'blue'],
    [5, '单人修正 + 高信任分', '修正人信任分 ≥ 80 且字段非金额/税号', '中', 'blue'],
    [6, '供应商自报', '供应商门户提交，无旁证', '低：待旁证', 'gray'],
  ] as const satisfies ReadonlyArray<readonly [number, string, string, string, Tone]>
).map(([priority, source, condition, weight, tone]) => ({ priority, source, condition, weight, tone }));

const CONFLICTS: ConflictRule[] = [
  { when: '员工与供应商不一致', then: '以影像复读为裁判；仍不一致则转 AP 复核，两条都保留并标注「争议」' },
  { when: '修正值与税局不一致', then: '税局为准；该修正判为错误更正，计入修正人信任分' },
  { when: '同一字段被反复来回改', then: '冻结该字段，转数据修正页；不进入数据集直到定论' },
];

const RECORDS: CorrectionRecord[] = [
  { id: 'FC-9012', invoiceId: 'TK-2609-0031', country: '日本', channel: 'ERP H5', field: '登録番号', before: 'T7010001O81486', after: 'T7010001081486', who: '李 敏 · 员工', trust: 88, verify: '公表サイト有效 + 影像复读一致', clean: '通过', to: '训练集', toTone: 'green', status: 'accepted' },
  { id: 'FC-9013', invoiceId: 'TK-2609-0031', country: '日本', channel: 'ERP H5', field: '税率区分', before: '8%（軽減）', after: '10%', who: '李 敏 · 员工', trust: 88, verify: '待 AP 复核（金额类）', clean: '—', to: '困难集', toTone: 'purple', status: 'pending' },
  { id: 'FC-9020', invoiceId: 'BR-77120', country: '美国', channel: '供应商门户', field: 'Sales tax', before: '$0.00', after: '$742.90', who: 'Blue Ridge · 供应商', trust: 54, verify: '影像复读一致 0.93 · 员工未异议', clean: '通过', to: '训练集', toTone: 'green', status: 'accepted' },
  { id: 'FC-9021', invoiceId: 'BR-77120', country: '美国', channel: '供应商门户', field: 'PO number', before: '—', after: 'PO-4500128871', who: 'Blue Ridge · 供应商', trust: 54, verify: '与采购系统 PO 一致', clean: '通过', to: '训练集', toTone: 'green', status: 'accepted' },
  { id: 'FC-9031', invoiceId: '26372000000018842', country: '中国大陆', channel: '税局同步', field: '价税合计', before: '¥113,000.00', after: '¥118,000.00', who: '税局覆盖 · 系统', trust: 100, verify: '税局真值', clean: '通过', to: '训练集 + 困难集', toTone: 'green', status: 'accepted' },
  { id: 'FC-9044', invoiceId: 'INV-VN-2609-00433', country: '越南', channel: '邮箱', field: 'Tên người bán', before: 'Cong ty TNHH Co khi Minh Phat', after: 'Công ty TNHH Cơ khí Minh Phát', who: '阮 氏 · 员工', trust: 72, verify: '税局名称一致', clean: '通过', to: '训练集', toTone: 'green', status: 'accepted' },
  { id: 'FC-9052', invoiceId: 'RE-2026-45399', country: '德国', channel: '邮箱', field: 'Leistungsdatum', before: '2026-09-3O', after: '2026-09-31', who: 'A. Keller · 员工', trust: 91, verify: '日期不存在', clean: '剔除：更正值非法', to: '负样本', toTone: 'orange', status: 'rejected' },
  { id: 'FC-9060', invoiceId: 'NX-771204', country: '日本', channel: '邮箱', field: '合計金額', before: '¥286,000', after: '¥268,000', who: '佐藤 健 · 员工', trust: 83, verify: '影像复读 ¥286,000 · 与更正不一致', clean: '—', to: '争议', toTone: 'red', status: 'dispute' },
  { id: 'FC-9071', invoiceId: 'INV-SA-2609-00287', country: '沙特阿拉伯', channel: '供应商门户', field: 'VAT number', before: '3001 2345 6700 003', after: '300123456700003', who: 'Al Noor · 供应商', trust: 66, verify: '待旁证（ZATCA 校验排队）', clean: '—', to: '—', toTone: 'gray', status: 'pending' },
];

const ROUTING: RoutingRule[] = (
  [
    ['字符误识 / 格式', '训练集', 'green', '最常见，直接提升字段准确率'],
    ['字段错位 / 漏识', '训练集 + 困难集', 'green', '版面问题，困难集重点回归'],
    ['税局覆盖的金额差异', '困难集', 'purple', '模型已错、真值明确，优先回归'],
    ['供应商归属改判', '匹配规则集', 'blue', '不进 OCR 训练，进名称归一化与来源规则'],
    ['发生地改判', '分类器训练集', 'blue', '用于国家/票种判定模型'],
    ['非法或被驳回的更正', '负样本', 'orange', '用于核验 Agent 训练，不进 OCR'],
  ] as const satisfies ReadonlyArray<readonly [string, string, Tone, string]>
).map(([type, to, tone, why]) => ({ type, to, tone, why }));

const EVALS: EvalRun[] = (
  [
    ['EV-2610-02', '2026-10-12', '全部国家 · v4.1', 1842, 94.1, 1.3, '通过'],
    ['EV-2610-01', '2026-09-28', '全部国家 · v4.1', 1690, 92.8, 0.6, '通过'],
    ['EV-2609-02', '2026-09-14', '全部国家 · v4.1', 1577, 92.2, -0.4, '美国退化，已开工单'],
    ['EV-2609-01', '2026-08-31', '全部国家 · v4.1', 1402, 92.6, 2.1, '通过'],
  ] as const
).map(([id, date, scope, newSamples, accuracy, delta, verdict]) => ({ id, date, scope, newSamples, accuracy, delta, verdict }));

const HOT: HotField[] = (
  [
    ['日本 · 税率区分 / 消費税額', 412],
    ['美国 · Sales tax / Subtotal', 386],
    ['越南 · 销方名称（声调）', 301],
    ['德国 · Leistungsdatum', 188],
    ['沙特 · VAT number 分隔符', 142],
  ] as const
).map(([label, count]) => ({ label, count }));

export function buildCorrectionDashboard(): CorrectionDashboard {
  return {
    stages: STAGES,
    sources: SOURCES,
    truth: TRUTH,
    conflicts: CONFLICTS,
    records: RECORDS.map((r) => ({ ...r })),
    routing: ROUTING,
    evals: EVALS,
    hotFields: HOT,
    totalCorrections: STAGES[0].value,
  };
}
