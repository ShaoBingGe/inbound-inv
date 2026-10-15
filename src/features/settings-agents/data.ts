import type {
  AgentId,
  AgentProfile,
  AgentSettings,
  AgentUser,
  FlowStep,
  Level,
  LevelRule,
  MemoryGroup,
  MemoryItem,
  RunRecord,
  RunStats,
  Todo,
} from './types';

/** 级别 → [文案, 色调] */
export const LV: Record<Level, { label: string; tone: 'gray' | 'blue' | 'green' }> = {
  suggest: { label: '仅建议', tone: 'gray' },
  prefill: { label: '预填待确认', tone: 'blue' },
  auto: { label: '自动提交', tone: 'green' },
};
export const LEVEL_ORDER: Level[] = ['suggest', 'prefill', 'auto'];

type RunTuple = [string, string, string, string, string, Level, string, boolean];
const run = ([at, agent, action, obj, basis, lv, res, canUndo]: RunTuple): RunRecord => ({
  at,
  agent,
  action,
  obj,
  basis,
  lv,
  res,
  canUndo,
});

const CHEN_TODOS: Todo[] = [
  {
    id: 't1',
    lv: 'prefill',
    title: '3 张差旅发票已生成报销单 EXP-2026-0821 草稿',
    body: '酒店 ¥1,836 → 住宿费 · 成本中心 CC-3120；滴滴 ¥365 → 市内交通；行程单 ¥2,180 → 机票。事由沿用上周「华东渠道走访」。',
    mem: ['常用科目映射', '成本中心 CC-3120', '事由沿用最近行程'],
    cta: '提交报销单',
    result: '已提交，审批人 周 明（按你的历史审批链）',
  },
  {
    id: 't2',
    lv: 'suggest',
    title: '酒店发票缺入住人与事由，Agent 建议填「陈 涛 · 华东渠道走访」',
    body: '来自同一行程的机票与订单已能证明入住人。建议值需要你确认，因为这是合规字段。',
    mem: ['行程关联'],
    cta: '采用建议',
    result: '已填入并随报销单提交',
  },
  {
    id: 't3',
    lv: 'auto',
    title: '上月 2 张超 7 日未认领的发票已按行程归到你名下',
    body: '票面日期与你的差旅申请重合，认领台规则允许自动认领 ≤ ¥500 的交通票。',
    mem: ['差旅申请时间窗'],
    cta: '知道了',
    result: '已记录',
  },
];

const LI_TODOS: Todo[] = [
  {
    id: 't1',
    lv: 'auto',
    title: '恒立液压 3 张数电专票已自动生成 AP 单并过账',
    body: '三单匹配全部在容差内，供应商信任分 92，按你的授权范围自动过账，付款条件 Net 60。',
    mem: ['供应商：恒立液压 月结 25 日', '容差 ±1%'],
    cta: '知道了',
    result: '已记录，24 小时内可撤回',
  },
  {
    id: 't2',
    lv: 'prefill',
    title: '宝田機械 TK-2609-0031 税率区分需要你确认后生成 AP 单',
    body: 'Agent 根据该供应商历史 26 张票（均为 10% 标准税率）建议更正为 10%，但金额类更正需人工确认。',
    mem: ['供应商：宝田機械 税率特征', '供应商：PO 位于页脚'],
    cta: '确认 10% 并生成 AP 单',
    result: 'AP-2610-00087 已生成，进入审批',
  },
  {
    id: 't3',
    lv: 'suggest',
    title: 'Blue Ridge 疑似重复开票，建议向供应商发起说明请求',
    body: 'BR-77120 与 BR-77098 同金额同 PO；该供应商 90 天内已出现 2 次类似情况。',
    mem: ['供应商：Blue Ridge 重复开票倾向'],
    cta: '发起说明请求',
    result: '已通过供应商门户发出',
  },
  {
    id: 't4',
    lv: 'prefill',
    title: '本周到期的 7 张发票付款批次已排好',
    body: '按供应商付款条件与你的「周四付款批」习惯，合计 ¥412,600，等你确认。',
    mem: ['周四付款批', '供应商付款条件'],
    cta: '确认付款批次',
    result: '付款批 PAY-2610-W2 已提交财务',
  },
];

const WANG_TODOS: Todo[] = [
  {
    id: 't1',
    lv: 'prefill',
    title: '10 月对账周期：14 家月结 25 日供应商的对账单已生成',
    body: '按各供应商对账口径（按收货 / 按开票）生成，差异 3 家，已标出差异行。',
    mem: ['对账规则：月结日', '对账口径'],
    cta: '批量发送对账单',
    result: '已通过供应商门户发送 14 份',
  },
  {
    id: 't2',
    lv: 'suggest',
    title: '建议把 Blue Ridge 的对账口径改为「按收货」',
    body: '近 3 期对账差异均来自开票早于收货，改口径后差异可消除。这是规则变更，需你确认。',
    mem: ['对账差异模式'],
    cta: '采纳并更新规则',
    result: '规则已更新，对该法人生效',
  },
  {
    id: 't3',
    lv: 'auto',
    title: '季度税务申报前的进项认证清单已汇总',
    body: '中国大陆 3 个法人待认证 1,208 张，已按申报期排序推送给税务岗。',
    mem: ['申报周期'],
    cta: '知道了',
    result: '已记录',
  },
];

export const USERS: AgentUser[] = [
  {
    id: 'chen',
    name: '陈 涛',
    option: '陈 涛 · 市场部 · 报销人',
    hint: '市场部 · 上海分公司 · 你的报销通常在周五下午提交',
    todos: CHEN_TODOS,
    runs: (
      [
        ['10-13 09:02', '报销 Agent', '生成报销单草稿', 'EXP-2026-0821', '科目映射（12 次观察）· 成本中心（员工确认）', 'prefill', '待确认', false],
        ['10-10 17:40', '认领 Agent', '自动认领交通票 2 张', 'INV-CN-2610-00412…', '差旅申请时间窗 · 认领台规则 v3', 'auto', '已完成', true],
        ['10-06 16:05', '报销 Agent', '预填报销单', 'EXP-2026-0802', '科目映射 · 事由沿用', 'prefill', '被修改：事由改为「客户拜访」', false],
      ] as RunTuple[]
    ).map(run),
  },
  {
    id: 'li',
    name: '李 敏',
    option: '李 敏 · 采购 · AP 专员',
    hint: '采购 · AP 专员 · 负责华东原材料供应商',
    todos: LI_TODOS,
    runs: (
      [
        ['10-13 08:30', 'AP Agent', '自动生成 AP 单并过账', 'AP-2610-00081…83', '供应商信任分 92 · 三单匹配容差 v2 · 授权范围 ≤ ¥20 万', 'auto', '已完成', true],
        ['10-12 14:12', '对账 Agent', '生成恒立液压 9 月对账单', 'STMT-2609-HL', '月结 25 日 · 对账口径：按收货', 'prefill', '已采纳', false],
        ['10-09 11:20', 'AP Agent', '预填 AP 单', 'AP-2610-00064', '供应商 PO 位置记忆', 'prefill', '被修改：成本中心', false],
      ] as RunTuple[]
    ).map(run),
  },
  {
    id: 'wang',
    name: '王 琳',
    option: '王 琳 · 财务共享 · 对账负责人',
    hint: '财务共享中心 · 维护集团对账规则与周期',
    todos: WANG_TODOS,
    runs: (
      [
        ['10-13 07:00', '对账 Agent', '生成月度对账单 14 份', 'STMT-2610-*', '对账规则库 v9 · 月结 25 日', 'prefill', '待确认', false],
        ['10-11 07:00', '税务 Agent', '汇总待认证清单', 'VAT-CERT-2610', '申报周期：季度', 'auto', '已完成', true],
      ] as RunTuple[]
    ).map(run),
  },
];

type MemTuple = [string, string, string, number, string, MemoryItem['st']];
const mem = ([k, v, src, conf, use, st]: MemTuple): MemoryItem => ({ k, v, src, conf, use, st });

export const MEMORIES: MemoryGroup[] = [
  {
    key: 'emp',
    label: '员工个人习惯',
    desc: '只对本人可见；Agent 用它预填单据、选择审批链与提交时机',
    items: (
      [
        ['费用科目映射', '酒店→住宿费；滴滴/出租车→市内交通；航司→机票', '观察到 12 次', 96, '报销单预填', 'confirmed'],
        ['默认成本中心', 'CC-3120 市场部华东', '员工确认', 100, '报销单 / AP 单', 'confirmed'],
        ['事由习惯', '同一行程内沿用最近一次事由', '观察到 5 次', 82, '报销单预填', 'observed'],
        ['提交时间', '周五 14:00–17:00 集中提交', '观察到 8 次', 88, '提醒与批量提交', 'observed'],
        ['审批链偏好', '金额 > ¥5,000 时主动加抄部门总监', '观察到 3 次', 64, '审批路由', 'observed'],
        ['付款批习惯', '周四统一提交付款批', '观察到 9 次', 90, '付款排程', 'observed'],
      ] as MemTuple[]
    ).map(mem),
  },
  {
    key: 'sup',
    label: '供应商发票特征',
    desc: '按法人共享给 AP 与采购；来自识别结果、修正记录与三单匹配历史',
    items: (
      [
        ['恒立液压 · 月结与付款', '月结 25 日 · Net 60 · 一票一 PO', '对账历史 14 期', 97, '对账 / 付款排程', 'confirmed'],
        ['宝田機械 · 税率特征', '机械设备 10% 标准税率；手写追记常见于第 3 页', '修正记录 26 张', 91, '校验策略 / 更正建议', 'observed'],
        ['宝田機械 · PO 位置', 'PO 番号印在页脚，OCR 易漏', '修正记录 9 次', 85, '识别模板', 'observed'],
        ['Blue Ridge · 税额列示', 'Sales tax 并入 Subtotal', '修正记录 31 次', 94, '自动纠正规则', 'confirmed'],
        ['Blue Ridge · 重复开票倾向', '90 天 2 次同金额同 PO', '三单匹配历史', 70, '重复检测阈值', 'observed'],
        ['Werner · 结构化优先', 'ZUGFeRD XML 为准，PDF 的 Leistungsdatum 不可靠', '修正记录 6 次', 88, '渠道策略', 'observed'],
      ] as MemTuple[]
    ).map(mem),
  },
  {
    key: 'rec',
    label: '企业对账规则与周期',
    desc: '由财务共享中心维护，全局可读；Agent 据此生成对账单、排付款批、汇总申报清单',
    items: (
      [
        ['对账周期', '月结供应商 25 日；项目类按里程碑', '管理员设定', 100, '对账 Agent', 'confirmed'],
        ['对账口径', '原材料按收货；服务按开票；物流按运单', '管理员设定', 100, '对账 Agent', 'confirmed'],
        ['容差', '数量 ±2% · 单价 ±1% · 总额 ±500 CNY 等值', '管理员设定', 100, '三单匹配', 'confirmed'],
        ['付款批次', '每周四；跨境付款每月 10 / 25 日', '管理员设定', 100, 'AP Agent', 'confirmed'],
        ['申报周期', '中国大陆按月 / 季度（小规模）；德国月报；日本年度 + 中间申报', '税务规则设置', 100, '税务 Agent', 'confirmed'],
        ['差异处理', '连续 3 期同类差异 → 建议改口径', '观察到 2 次', 60, '对账 Agent 建议', 'observed'],
      ] as MemTuple[]
    ).map(mem),
  },
];

type LevelTuple = [string, Level, string, Level];
export const LEVELS: LevelRule[] = (
  [
    ['生成报销单', 'prefill', '采集完成且科目映射置信 ≥ 85%', 'prefill'],
    ['生成 AP 单', 'auto', '三单匹配容差内 · 供应商信任 ≥ 80 · 金额 ≤ 授权', 'auto'],
    ['过账', 'auto', 'AP 单审批通过', 'auto'],
    ['排付款批', 'prefill', '到期前 3 天', 'prefill'],
    ['生成对账单', 'prefill', '对账日前 1 天', 'auto'],
    ['发送供应商说明请求', 'suggest', '重复或差异', 'prefill'],
    ['认领无主发票', 'auto', '≤ ¥500 且行程重合', 'auto'],
  ] as LevelTuple[]
).map(([task, cur, when, cap]) => ({ task, cur, when, cap }));

export const FLOW_INV = '示例：恒立液压 26372000000018842 · 数电专票 · ¥118,000 · 李 敏的授权范围';
export const FLOW: FlowStep[] = (
  [
    ['采集完成', '渠道：ERP H5 · 校验通过，1 处可纠正已采纳', '09:01:12'],
    ['识别场景', '有 PO、原材料、供应商信任分 92 → 走 AP 自动化', '09:01:13'],
    ['读取记忆', '供应商：月结 25 日、Net 60；员工：无需干预', '09:01:13'],
    ['生成单据草稿', 'AP 单：科目、税码 J1、付款条件、成本中心', '09:01:15'],
    ['二次校验', '三单匹配容差内 · 预算可用 · 无重复', '09:01:18'],
    ['决定级别', '满足「自动提交」条件 → 直接过账，24 小时可撤回', '09:01:18'],
    ['学习', '本次无修改 → 科目映射置信 +1；写入运行记录', '09:01:19'],
  ] as [string, string, string][]
).map(([label, sub, t]) => ({ label, sub, t }));

export const STATS: RunStats = { auto: '126', acc: '84%', mod: '11%', undo: '2', saved: '≈ 31 小时' };

/**
 * agent → Skill id。Skill id 与 Skill 管理模块共享，保持不变。
 * agent 由统一 agent 平台运行与调度，本项目只展示能力配置。
 */
export const AGENT_SKILLS: Record<AgentId, string[]> = {
  expense: ['employee-habit-memory', 'invoice-ocr-review'],
  claim: ['employee-habit-memory'],
  ap: ['supplier-feature-memory', 'invoice-ocr-review', 'dataset-cleaning'],
  reconcile: ['reconciliation-rules', 'supplier-feature-memory'],
  tax: ['tax-rule-check', 'reconciliation-rules'],
};

/** 运行记录中出现的 agent；作业名与「自动化分级」一致 */
export const AGENTS: AgentProfile[] = [
  { id: 'expense', name: '报销 Agent', tasks: ['生成报销单'], mems: ['emp'], skills: AGENT_SKILLS.expense },
  { id: 'claim', name: '认领 Agent', tasks: ['认领无主发票'], mems: ['emp'], skills: AGENT_SKILLS.claim },
  {
    id: 'ap',
    name: 'AP Agent',
    tasks: ['生成 AP 单', '过账', '排付款批', '发送供应商说明请求'],
    mems: ['sup', 'emp', 'rec'],
    skills: AGENT_SKILLS.ap,
  },
  { id: 'reconcile', name: '对账 Agent', tasks: ['生成对账单'], mems: ['rec', 'sup'], skills: AGENT_SKILLS.reconcile },
  { id: 'tax', name: '税务 Agent', tasks: ['汇总待认证清单'], mems: ['rec'], skills: AGENT_SKILLS.tax },
];

export function buildAgentSettings(): AgentSettings {
  return {
    users: USERS,
    memories: MEMORIES,
    levels: LEVELS,
    flowInv: FLOW_INV,
    flow: FLOW,
    stats: STATS,
    agents: AGENTS,
  };
}
