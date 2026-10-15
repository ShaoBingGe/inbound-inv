import { http, isMock, mockDelay } from '@/lib/http';
import { buildDatasetRules, simulateRun } from './data';
import type { AgentKey, CountryCode, CountryStrategy, DatasetRules, StartRunRequest, TestRun } from './types';

/** 各国数据集策略、Agent 编排、批量测试记录 */
export async function fetchDatasetRules(): Promise<DatasetRules> {
  if (isMock()) return mockDelay(buildDatasetRules());
  return http.get<DatasetRules>('/v1/dataset-rules');
}

/** 保存某国的采集与检测策略 */
export async function saveCountryStrategy(country: CountryCode, strategy: CountryStrategy): Promise<CountryStrategy> {
  if (isMock()) return mockDelay(strategy);
  return http.put<CountryStrategy>(`/v1/dataset-rules/${country}/strategy`, strategy);
}

/** 对当前标注批次运行格式检查 */
export async function runFormatCheck(country: CountryCode, batch: string): Promise<{ batch: string; done: boolean }> {
  if (isMock()) return mockDelay({ batch, done: true });
  return http.post<{ batch: string; done: boolean }>(`/v1/dataset-rules/${country}/batches/${encodeURIComponent(batch)}/format-check`);
}

/** 人工关口确认（抽检通过 / 批准灰度） */
export async function approveAgentGate(country: CountryCode, agent: AgentKey): Promise<{ approved: boolean }> {
  if (isMock()) return mockDelay({ approved: true });
  return http.post<{ approved: boolean }>(`/v1/dataset-rules/${country}/agents/${agent}/approve`);
}

/** 发起批量测试运行 */
export async function startBatchTestRun(req: StartRunRequest): Promise<TestRun> {
  if (isMock()) return mockDelay(simulateRun(req), 400);
  return http.post<TestRun>(`/v1/dataset-rules/${req.country}/test-runs`, { model: req.model, split: req.split });
}
