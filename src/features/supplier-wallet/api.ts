import { http, isMock, mockDelay } from '@/lib/http';
import { buildCountries, ROUTE_RULES, SUPPLIERS } from './data';
import type { ApState, CountryCode, CountrySuppliers, ExpState, MatchState, WalletOverview } from './types';

const inv = (no: string) => `/v1/supplier-wallet/invoices/${encodeURIComponent(no)}`;

/** 国家页签（含各国指标与票数）与路由规则。后端按用户的国家授权过滤。 */
export async function fetchWalletOverview(): Promise<WalletOverview> {
  if (isMock()) return mockDelay({ countries: buildCountries(), routes: ROUTE_RULES });
  return http.get<WalletOverview>('/v1/supplier-wallet/overview');
}

/** 某国票夹内的供应商与发票（数据驻留在该国数据中心） */
export async function fetchWalletSuppliers(country: CountryCode): Promise<CountrySuppliers> {
  if (isMock()) return mockDelay({ country, suppliers: SUPPLIERS[country] });
  return http.get<CountrySuppliers>(`/v1/supplier-wallet/countries/${country}/suppliers`);
}

/** 重新执行三单 / 两单匹配 */
export async function rematchInvoice(no: string): Promise<{ m: MatchState | null; changed: boolean }> {
  if (isMock()) return mockDelay({ m: null, changed: false });
  return http.post(`${inv(no)}/rematch`);
}

/** 在容差内接受差异（记录审批意见） */
export async function acceptWithinTolerance(no: string): Promise<{ m: MatchState }> {
  if (isMock()) return mockDelay({ m: 'tol' as const });
  return http.post(`${inv(no)}/accept-tolerance`);
}

/** 生成 AP 单（none → draft）或提交审批并过账（draft → posted） */
export async function advanceApVoucher(no: string, current: ApState): Promise<{ ap: ApState }> {
  if (isMock()) return mockDelay({ ap: current === 'draft' ? ('posted' as const) : ('draft' as const) });
  return http.post(`${inv(no)}/ap-voucher`, { action: current === 'draft' ? 'post' : 'generate' });
}

/** 推送到费控，关联报销单 */
export async function pushToExpense(no: string): Promise<{ ex: ExpState; expenseNo: string }> {
  if (isMock()) return mockDelay({ ex: 'linked' as const, expenseNo: 'EXP-2026-0821' });
  return http.post(`${inv(no)}/expense`);
}
