import { http, isMock, mockDelay } from '@/lib/http';
import { buildCorrectionDashboard } from './data';
import type { BatchVerifyResult, CorrectionDashboard, CorrectionRecord, VerifyResult } from './types';

/** 发票识别数据管理看板：闭环流程、来源、核验规则、修正记录、入集策略、定期评测 */
export async function fetchCorrectionDashboard(): Promise<CorrectionDashboard> {
  if (isMock()) return mockDelay(buildCorrectionDashboard());
  return http.get<CorrectionDashboard>('/v1/data/corrections/dashboard', { query: { days: 30 } });
}

/** 对单条待核验修正运行核验 Agent（影像复读 + 旁证） */
export async function verifyCorrection(id: string): Promise<VerifyResult> {
  if (isMock()) return mockDelay({ id, status: 'accepted' });
  return http.post<VerifyResult>(`/v1/data/corrections/${encodeURIComponent(id)}/verify`);
}

/** 争议修正转 AP 复核，两条修正均保留 */
export async function escalateCorrectionToAp(id: string): Promise<VerifyResult> {
  if (isMock()) return mockDelay({ id, status: 'dispute' });
  return http.post<VerifyResult>(`/v1/data/corrections/${encodeURIComponent(id)}/escalate`, { to: 'ap_review' });
}

/**
 * 对待核验条目批量运行核验 Agent：影像复读 + 旁证通过的转为已采纳；
 * 金额类（需 AP 复核）的条目仍待 AP 复核，不在返回的 accepted 中。
 */
export async function batchVerifyCorrections(
  pending: Pick<CorrectionRecord, 'id' | 'verify'>[],
): Promise<BatchVerifyResult> {
  if (isMock()) return mockDelay({ accepted: pending.filter((r) => r.verify.indexOf('AP') < 0).map((r) => r.id) });
  return http.post<BatchVerifyResult>('/v1/data/corrections/verify-batch', { ids: pending.map((r) => r.id) });
}
