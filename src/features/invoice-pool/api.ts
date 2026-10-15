import { http, isMock, mockDelay } from '@/lib/http';
import { buildDetail, buildOrgCatalog, buildOrgRows, buildRecognizedData } from './data';
import type { InvoiceDetail, InvoiceRow, OrgCatalog, OrgQuery, PoolFilters, RecognizedData, TranslateTarget } from './types';

/** 国家 / 企业目录（切换器数据源；页面再按用户可见国家过滤，后端同样校验） */
export async function fetchOrgCatalog(): Promise<OrgCatalog> {
  if (isMock()) return mockDelay(buildOrgCatalog(), 60);
  return http.get<OrgCatalog>('/v1/orgs/catalog');
}

/** 当前组织 + 期间内进入票池的发票（审核中 / 已入账 / 已付款） */
export async function fetchPoolInvoices(q: OrgQuery): Promise<InvoiceRow[]> {
  if (isMock()) return mockDelay(buildOrgRows(q));
  return http.get<InvoiceRow[]>('/v1/invoice-pool/invoices', { query: { ...q } });
}

/** 单票全生命周期：时间线、正逆向、税务、影像页 */
export async function fetchInvoiceDetail(id: string): Promise<InvoiceDetail> {
  if (isMock()) return mockDelay(buildDetail(id));
  return http.get<InvoiceDetail>(`/v1/invoices/${encodeURIComponent(id)}/lifecycle`);
}

/** 识别数据（含智能翻译结果；翻译仅供阅读，不改原始票面数据） */
export async function fetchRecognizedData(id: string, target: TranslateTarget): Promise<RecognizedData> {
  if (isMock()) return mockDelay(buildRecognizedData(id, target), 80);
  return http.get<RecognizedData>(`/v1/invoices/${encodeURIComponent(id)}/recognized-data`, { query: { translateTo: target } });
}

/** 按当前筛选导出（Excel） */
export async function exportPoolInvoices(org: OrgQuery, filters: PoolFilters, count: number): Promise<{ count: number }> {
  if (isMock()) return mockDelay({ count }, 200);
  return http.post<{ count: number }>('/v1/invoice-pool/exports', { ...org, ...filters, format: 'xlsx' });
}
