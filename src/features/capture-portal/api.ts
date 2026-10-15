import { http, isMock, mockDelay } from '@/lib/http';
import { buildPortalView } from './data';
import type { FieldMark, PortalView, RequestAction, SupplierKey } from './types';

/** 供应商门户：概览、我的发票（含识别字段）、更正请求、错误率趋势与更正规则 */
export async function fetchSupplierPortal(supplier: SupplierKey): Promise<PortalView> {
  if (isMock()) return mockDelay(buildPortalView(supplier));
  return http.get<PortalView>('/v1/supplier-portal', { query: { supplier } });
}

/** 供应商提交对识别字段的标注 / 更正，进入买方的数据修正队列 */
export async function submitFieldMarks(invoiceNo: string, marks: FieldMark[]): Promise<{ ok: true }> {
  if (isMock()) return mockDelay({ ok: true as const });
  return http.post<{ ok: true }>(`/v1/supplier-portal/invoices/${encodeURIComponent(invoiceNo)}/field-marks`, { marks });
}

/** 供应商处理买方发来的更正请求：接受（上传更正票据）或提出异议 */
export async function respondCorrectionRequest(requestId: string, action: RequestAction): Promise<{ ok: true }> {
  if (isMock()) return mockDelay({ ok: true as const });
  return http.post<{ ok: true }>(`/v1/supplier-portal/correction-requests/${encodeURIComponent(requestId)}/response`, {
    action,
  });
}
