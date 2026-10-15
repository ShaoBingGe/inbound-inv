import { http, isMock, mockDelay } from '@/lib/http';
import { buildSession } from './data';
import type { CaptureSession, SubmitCapturePayload, SubmitCaptureResult } from './types';

/** 手机端采集会话：报销单上下文、本单已采集票据、最近一次拍摄的识别与校验结果 */
export async function fetchCaptureSession(): Promise<CaptureSession> {
  if (isMock()) return mockDelay(buildSession());
  return http.get<CaptureSession>('/v1/capture/mobile/session');
}

/** 加入报销单：回传识别结果与更正（宿主页面收到 invoice.submitted） */
export async function submitCapture(payload: SubmitCapturePayload): Promise<SubmitCaptureResult> {
  if (isMock()) return mockDelay({ event: 'invoice.submitted', fixCount: payload.corrections.length });
  return http.post<SubmitCaptureResult>('/v1/capture/mobile/submit', payload);
}
