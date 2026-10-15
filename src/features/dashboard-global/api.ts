import { http, isMock, mockDelay } from '@/lib/http';
import { buildDashboard, buildScopes, buildTrend } from './data';
import type { DashboardData, DashboardQuery, ScopeCountry, TrendPoint, TrendQuery } from './types';

/** 可选数据视角（国家 / 数据中心）。页面再按 user.countries 过滤，后端同样校验。 */
export async function fetchScopes(): Promise<ScopeCountry[]> {
  if (isMock()) return mockDelay(buildScopes());
  return http.get<ScopeCountry[]>('/v1/dashboard/global/scopes');
}

/** 统计月 + 视角下的明细聚合（国家 × 省/州 × 行业）与需关注发票 */
export async function fetchGlobalDashboard(q: DashboardQuery): Promise<DashboardData> {
  if (isMock()) return mockDelay(buildDashboard(q));
  return http.get<DashboardData>('/v1/dashboard/global', { query: { month: q.month, scope: q.scope } });
}

/** 近 12 个月同比趋势（选中节点或合计） */
export async function fetchGlobalTrend(q: TrendQuery): Promise<TrendPoint[]> {
  if (isMock()) return mockDelay(buildTrend(q), 60);
  return http.get<TrendPoint[]>('/v1/dashboard/global/trend', {
    query: { month: q.month, scope: q.scope, node: q.node ?? undefined },
  });
}
