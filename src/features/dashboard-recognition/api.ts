import { http, isMock, mockDelay } from '@/lib/http';
import { buildRecognitionBoard } from './data';
import type { RecognitionBoard } from './types';

/** 识别效果看板：各国冻结测试集评测结果、近 12 个月线上指标与模型版本记录 */
export async function fetchRecognitionBoard(): Promise<RecognitionBoard> {
  if (isMock()) return mockDelay(buildRecognitionBoard());
  return http.get<RecognitionBoard>('/v1/recognition/evaluation-board');
}
