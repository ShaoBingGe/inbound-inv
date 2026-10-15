import { http, isMock, mockDelay } from '@/lib/http';
import { buildCaptureSession } from './data';
import type { CaptureSession, CheckKey, FieldKey, GeoCode } from './types';

/** 发票导入会话（报销单）：发生地、票据、校验结果与修正记录 */
export async function fetchCaptureSession(): Promise<CaptureSession> {
  if (isMock()) return mockDelay(buildCaptureSession());
  return http.get<CaptureSession>('/v1/capture/h5/session');
}

/** 导入所选票据至报销单 */
export async function importInvoices(reportNo: string, ids: number[]): Promise<void> {
  if (isMock()) return mockDelay(undefined);
  await http.post(`/v1/capture/h5/reports/${encodeURIComponent(reportNo)}/import`, { ids });
}

/** 改判票据发生地（原件与影像保留，按该国规则重新识别） */
export async function assignPlaceOfIssue(id: number, country: GeoCode): Promise<void> {
  if (isMock()) return mockDelay(undefined);
  await http.post(`/v1/capture/h5/invoices/${id}/place-of-issue`, { country });
}

/** 采纳一条自动纠正，写入修正前后记录 */
export async function applyCorrection(id: number, check: CheckKey): Promise<void> {
  if (isMock()) return mockDelay(undefined);
  await http.post(`/v1/capture/h5/invoices/${id}/corrections`, { check });
}

/** 标注 / 撤销标注字段识别有误（转入发票数据修正队列） */
export async function flagField(id: number, field: FieldKey, flagged: boolean): Promise<void> {
  if (isMock()) return mockDelay(undefined);
  await http.put(`/v1/capture/h5/invoices/${id}/field-flags/${field}`, { flagged });
}

/** 确认票据（一并采纳待纠正项），标记可导入 */
export async function confirmInvoice(id: number, corrections: CheckKey[]): Promise<void> {
  if (isMock()) return mockDelay(undefined);
  await http.post(`/v1/capture/h5/invoices/${id}/confirm`, { corrections });
}
