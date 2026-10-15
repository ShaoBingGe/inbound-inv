import { http, isMock, mockDelay } from '@/lib/http';
import { buildDetail, sampleOptions } from './data';
import type { LifecycleDetail, SampleOption } from './types';

/** 发票全生命周期：概要、时间线、正逆向关联、税务处理、规则路由、影像与识别数据 */
export async function fetchInvoiceLifecycle(invoiceId: string): Promise<LifecycleDetail> {
  if (isMock()) return mockDelay(buildDetail(invoiceId));
  return http.get<LifecycleDetail>(`/v1/invoices/${encodeURIComponent(invoiceId)}/lifecycle`);
}

/** 页头「示例发票」下拉的可选发票 */
export async function fetchLifecycleSamples(): Promise<SampleOption[]> {
  if (isMock()) return mockDelay(sampleOptions(), 80);
  return http.get<SampleOption[]>('/v1/invoices/lifecycle-samples');
}
