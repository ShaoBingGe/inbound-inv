/**
 * 匹配训练成果取数。训练与调度属于统一 agent 平台；本模块只展示学习成果，
 * 并允许把不应参与训练的品名 / 规格「终止学习」（写回后端，下一轮训练生效）。
 */
import { http, isMock, mockDelay } from '@/lib/http';
import type { CountryCode } from '@/features/supplier-wallet/types';
import { buildTrainingItems, TRAINING_SUPPLIERS, UPDATED_AT } from './data';
import type { TrainingDetail, TrainingOverview } from './types';

const base = (c: CountryCode) => `/v1/match-training/countries/${c}/suppliers`;

/** 示例数据只有中国大陆 */
const MOCK_COUNTRY: CountryCode = 'CN';
/** mock：本次会话的终止学习记录，按供应商 */
const stoppedBySupplier = new Map<string, Set<string>>();

export async function fetchTrainingOverview(country: CountryCode): Promise<TrainingOverview> {
  if (!isMock()) return http.get<TrainingOverview>(base(country));
  return mockDelay({ updatedAt: UPDATED_AT, suppliers: country === MOCK_COUNTRY ? TRAINING_SUPPLIERS : [] });
}

export async function fetchTrainingDetail(country: CountryCode, code: string): Promise<TrainingDetail> {
  if (!isMock()) return http.get<TrainingDetail>(`${base(country)}/${encodeURIComponent(code)}`);
  const supplier = country === MOCK_COUNTRY ? TRAINING_SUPPLIERS.find((s) => s.code === code) : undefined;
  if (!supplier) throw new Error('未找到该供应商的训练成果');
  return mockDelay({
    supplier,
    items: buildTrainingItems(code),
    stopped: [...(stoppedBySupplier.get(code) ?? [])],
  });
}

/** 终止学习 / 重新学习：key 为 'n:<品名 id>' 或 's:<规格 id>'，返回最新的终止集合 */
export async function setLearningStopped(
  country: CountryCode,
  code: string,
  keys: string[],
  stopped: boolean,
): Promise<{ stopped: string[] }> {
  if (!isMock()) return http.put(`${base(country)}/${encodeURIComponent(code)}/stopped`, { keys, stopped });
  const set = stoppedBySupplier.get(code) ?? new Set<string>();
  keys.forEach((k) => (stopped ? set.add(k) : set.delete(k)));
  stoppedBySupplier.set(code, set);
  return mockDelay({ stopped: [...set] }, 80);
}
