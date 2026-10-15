import { http, isMock, mockDelay } from '@/lib/http';
import { buildViewerDocument } from './data';
import type { ViewerDocument, ViewerFileLink } from './types';

/** 原件影像与票面（只读存证） */
export async function fetchViewerDocument(invoiceId: string): Promise<ViewerDocument> {
  if (isMock()) return mockDelay(buildViewerDocument(invoiceId));
  return http.get<ViewerDocument>(`/v1/invoices/${encodeURIComponent(invoiceId)}/original`);
}

/**
 * 下载原件（含存证哈希）。mock 模式没有真实文件，url 为 null，页面只给出提示。
 * TODO: live 模式返回带签名的文件地址后，页面用该 url 触发真实下载。
 */
export async function fetchOriginalFile(invoiceId: string, fileName: string): Promise<ViewerFileLink> {
  if (isMock()) return mockDelay({ url: null, fileName });
  return http.get<ViewerFileLink>(`/v1/invoices/${encodeURIComponent(invoiceId)}/original/file`);
}
