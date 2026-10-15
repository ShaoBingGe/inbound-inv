import { http, isMock, mockDelay } from '@/lib/http';
import { buildChannelsConfig } from './data';
import type { ChannelsConfig, PolicyMatrix, PublishResult, SubOverrides } from './types';

/** 采集渠道、校验策略矩阵（当前生效版本）、嵌入说明与规则库 */
export async function fetchChannelsConfig(): Promise<ChannelsConfig> {
  if (isMock()) return mockDelay(buildChannelsConfig());
  return http.get<ChannelsConfig>('/v1/capture-policies/current');
}

/** 发布新的策略版本：对新采集的发票生效 */
export async function publishPolicy(body: { baseVer: number; pol: PolicyMatrix; sub: SubOverrides }): Promise<PublishResult> {
  if (isMock()) return mockDelay({ ver: body.baseVer + 1 });
  return http.post<PublishResult>('/v1/capture-policies', body);
}
