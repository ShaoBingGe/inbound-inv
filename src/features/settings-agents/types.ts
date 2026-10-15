/** 自动化级别：仅建议 / 预填待确认 / 自动提交 */
export type Level = 'suggest' | 'prefill' | 'auto';

/** 以谁的身份查看 */
export type UserId = 'chen' | 'li' | 'wang';

/** 三类记忆：员工个人习惯 / 供应商发票特征 / 企业对账规则与周期 */
export type MemTab = 'emp' | 'sup' | 'rec';

export type MemState = 'confirmed' | 'observed' | 'forgotten';

/** 待办作业的处理结果 */
export type TodoDecision = 'ok' | 'edit' | 'skip';

/** 本页涉及的 agent（由统一 agent 平台运行与调度） */
export type AgentId = 'expense' | 'claim' | 'ap' | 'reconcile' | 'tax';

export interface Todo {
  id: string;
  lv: Level;
  title: string;
  body: string;
  /** Agent 用到的记忆 */
  mem: string[];
  cta: string;
  result: string;
}

export interface RunRecord {
  at: string;
  agent: string;
  action: string;
  obj: string;
  basis: string;
  lv: Level;
  res: string;
  canUndo: boolean;
}

export interface AgentUser {
  id: UserId;
  name: string;
  /** 选择器中的展示文字 */
  option: string;
  hint: string;
  todos: Todo[];
  runs: RunRecord[];
}

export interface MemoryItem {
  k: string;
  v: string;
  src: string;
  conf: number;
  use: string;
  st: Exclude<MemState, 'forgotten'>;
}

export interface MemoryGroup {
  key: MemTab;
  label: string;
  desc: string;
  items: MemoryItem[];
}

export interface LevelRule {
  task: string;
  cur: Level;
  when: string;
  cap: Level;
}

export interface FlowStep {
  label: string;
  sub: string;
  t: string;
}

export interface RunStats {
  auto: string;
  acc: string;
  mod: string;
  undo: string;
  saved: string;
}

export interface AgentProfile {
  id: AgentId;
  name: string;
  /** 负责的作业（与自动化分级的作业名一致） */
  tasks: string[];
  /** 读取的记忆类别 */
  mems: MemTab[];
  /** 挂载的 Skill id（与 Skill 管理模块共享） */
  skills: string[];
}

export interface AgentSettings {
  users: AgentUser[];
  memories: MemoryGroup[];
  levels: LevelRule[];
  flowInv: string;
  flow: FlowStep[];
  stats: RunStats;
  agents: AgentProfile[];
}
