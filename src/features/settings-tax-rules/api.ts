import { http, isMock, mockDelay } from '@/lib/http';
import { buildRegimes, nextDraftVersion, simulate } from './data';
import type { CountryCode, RuleVersion, SimInput, SimResult, TaxRegime } from './types';

/** 各国税制、规则条目与版本记录（按国家排序） */
export async function fetchTaxRegimes(): Promise<TaxRegime[]> {
  if (isMock()) return mockDelay(buildRegimes());
  return http.get<TaxRegime[]>('/v1/tax-rules/regimes');
}

/** 规则模拟：按国家当前版本计算一张假想发票的税额与处理 */
export async function simulateTaxRules(regime: TaxRegime, input: SimInput): Promise<SimResult> {
  if (isMock()) return mockDelay(simulate(regime, input), 60);
  return http.post<SimResult>(`/v1/tax-rules/${regime.code}/simulate`, { version: regime.ver, ...input });
}

/** 基于当前版本新建草稿版本 */
export async function createDraftVersion(country: CountryCode, baseVersion: string): Promise<RuleVersion> {
  if (isMock()) {
    return mockDelay({ v: nextDraftVersion(baseVersion), eff: '—', change: '—', impact: '—', status: 'draft' });
  }
  return http.post<RuleVersion>(`/v1/tax-rules/${country}/versions`, { baseVersion, status: 'draft' });
}
