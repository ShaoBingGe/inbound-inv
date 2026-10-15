/** 邮箱采集与识别：取数与写操作。mock 模式返回 data.ts，live 模式调用后端（路径为约定草案）。 */
import { http, isMock, mockDelay } from '@/lib/http';
import { BIND_DEFAULTS, buildMailboxSettings, buildTestRows } from './data';
import type { AuthState, BindRequest, BindResult, MailboxSettings, RuleTestRow, SourceRule } from './types';

export async function fetchMailboxSettings(): Promise<MailboxSettings> {
  if (isMock()) return mockDelay(buildMailboxSettings());
  return http.get<MailboxSettings>('/v1/capture/mailbox/settings');
}

/** 撤销员工邮箱的令牌（解除授权） */
export async function revokeMailbox(boxId: string): Promise<{ auth: AuthState }> {
  if (isMock()) return mockDelay({ auth: 'none' as const });
  return http.post<{ auth: AuthState }>(`/v1/capture/mailboxes/${encodeURIComponent(boxId)}/revoke`);
}

/** 重新授权（令牌即将过期或已失效） */
export async function reauthorizeMailbox(boxId: string): Promise<{ auth: AuthState }> {
  // TODO(live): 与 authorizeMailbox 相同，需要跳转到服务商的授权同意页，回调后刷新状态。
  if (isMock()) return mockDelay({ auth: 'ok' as const });
  return http.post<{ auth: AuthState }>(`/v1/capture/mailboxes/${encodeURIComponent(boxId)}/reauthorize`);
}

/** 向尚未绑定的员工发送绑定邀请 */
export async function inviteMailbox(boxId: string): Promise<void> {
  if (isMock()) return mockDelay(undefined);
  await http.post<void>(`/v1/capture/mailboxes/${encodeURIComponent(boxId)}/invite`);
}

/**
 * 绑定向导第 2 步「前往 {服务商} 授权」。
 *
 * 目前为 mock：直接返回授权成功，页面切到第 3 步。
 * TODO(live): 真实流程应为
 *   1. POST /v1/capture/mailboxes/oauth/start { provider, mail, folders, lookback }
 *      → 后端生成 state / PKCE code_verifier，返回服务商授权同意页 URL
 *        （Microsoft 365: login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize，scope=Mail.Read offline_access User.Read；
 *         Google Workspace: accounts.google.com/o/oauth2/v2/auth，scope=gmail.readonly gmail.labels；
 *         Exchange Server / IMAP 不走 OAuth 跳转，改为提交服务账户委派或应用专用密码）。
 *   2. window.location.assign(authorizeUrl) 跳转到服务商同意页。
 *   3. 服务商回调后端 /v1/capture/mailboxes/oauth/callback，后端换取令牌并加密存放在用户所属数据中心，
 *      再重定向回 ROUTES.captureMailbox?bound=<boxId>，页面据此显示第 3 步。
 */
export async function authorizeMailbox(req: BindRequest): Promise<BindResult> {
  if (isMock()) return mockDelay({ boxId: BIND_DEFAULTS.boxId, mail: req.mail || BIND_DEFAULTS.mail });
  const r = await http.post<{ authorizeUrl?: string } & Partial<BindResult>>('/v1/capture/mailboxes/oauth/start', req);
  if (r.authorizeUrl) {
    window.location.assign(r.authorizeUrl);
    // 页面即将跳走；返回一个永不 resolve 的 promise，避免页面继续切换步骤
    return new Promise<BindResult>(() => undefined);
  }
  return { boxId: r.boxId ?? '', mail: r.mail ?? req.mail };
}

/** 保存来源规则（某员工邮箱下的全部规则） */
export async function saveSourceRules(boxId: string, rules: SourceRule[]): Promise<void> {
  if (isMock()) return mockDelay(undefined);
  await http.put<void>(`/v1/capture/mailboxes/${encodeURIComponent(boxId)}/source-rules`, rules);
}

/** 用最近 5 封来信测试规则 */
export async function testSourceRule(boxId: string, rule: SourceRule): Promise<RuleTestRow[]> {
  if (isMock()) return mockDelay(buildTestRows(rule));
  return http.post<RuleTestRow[]>(`/v1/capture/mailboxes/${encodeURIComponent(boxId)}/source-rules/test`, rule);
}

/** 切换「提升采集效率的功能」开关 */
export async function setMailboxFeature(key: string, on: boolean): Promise<void> {
  if (isMock()) return mockDelay(undefined, 60);
  await http.patch<void>(`/v1/capture/mailbox/features/${encodeURIComponent(key)}`, { on });
}
