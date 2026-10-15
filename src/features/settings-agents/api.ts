import { http, isMock, mockDelay } from '@/lib/http';
import { buildAgentSettings } from './data';
import type { AgentSettings, Level, MemState, MemTab, TodoDecision, UserId } from './types';

/**
 * agent 由统一 agent 平台运行与调度：能力配置、记忆、运行记录都从平台读写（target: 'agent'）。
 * 接口路径为约定草案。
 */

export async function fetchAgentSettings(): Promise<AgentSettings> {
  if (isMock()) return mockDelay(buildAgentSettings());
  return http.get<AgentSettings>('/v1/agents/settings', { target: 'agent' });
}

export interface OkResult {
  ok: true;
}
const OK: OkResult = { ok: true };

/** 处理一项待办作业：提交 / 修改后提交 / 不要这样做 */
export async function decideTodo(user: UserId, todoId: string, decision: TodoDecision): Promise<OkResult> {
  if (isMock()) return mockDelay(OK, 80);
  return http.post<OkResult>(`/v1/agents/todos/${encodeURIComponent(todoId)}/decision`, { user, decision }, { target: 'agent' });
}

/** 一键执行「自动提交」级别的作业 */
export async function runAutoTodos(user: UserId, todoIds: string[]): Promise<OkResult> {
  if (isMock()) return mockDelay(OK, 80);
  return http.post<OkResult>('/v1/agents/todos/run-auto', { user, todoIds }, { target: 'agent' });
}

/** 确认 / 删除 / 恢复一条记忆 */
export async function setMemoryState(tab: MemTab, index: number, state: MemState): Promise<OkResult> {
  if (isMock()) return mockDelay(OK, 80);
  return http.put<OkResult>(`/v1/agents/memories/${tab}/${index}/state`, { state }, { target: 'agent' });
}

/** 调整某类作业的自动化级别 */
export async function setAutomationLevel(task: string, level: Level): Promise<OkResult> {
  if (isMock()) return mockDelay(OK, 80);
  return http.put<OkResult>('/v1/agents/automation-levels', { task, level }, { target: 'agent' });
}

/** 撤回一次自动动作 */
export async function undoRun(user: UserId, index: number): Promise<OkResult> {
  if (isMock()) return mockDelay(OK, 80);
  return http.post<OkResult>('/v1/agents/runs/undo', { user, index }, { target: 'agent' });
}
