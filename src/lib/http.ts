import { config } from '@/config/runtime';
import { LANG_STORAGE_KEY } from '@/i18n/I18nProvider';

/** 两个后端：业务 API 与统一 agent 平台 */
export type ApiTarget = 'api' | 'agent';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface AuthHooks {
  getAccessToken: () => Promise<string | null>;
  onUnauthorized: () => void;
  getTenant: () => string | null;
}

let hooks: AuthHooks = {
  getAccessToken: async () => null,
  onUnauthorized: () => undefined,
  getTenant: () => null,
};

/** 由 AuthProvider 注入，避免 http 层依赖 React */
export function setAuthHooks(h: AuthHooks) {
  hooks = h;
}

function baseUrl(target: ApiTarget): string {
  return (target === 'agent' ? config.agentPlatformBaseUrl : config.apiBaseUrl).replace(/\/$/, '');
}

function uiLang(): string {
  try {
    return window.localStorage.getItem(LANG_STORAGE_KEY) || 'zh';
  } catch {
    return 'zh';
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  target?: ApiTarget;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** 请求超时（毫秒），默认 30 秒 */
  timeoutMs?: number;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { target = 'api', query, body, timeoutMs = 30_000, headers, ...init } = opts;
  const qs = query
    ? '?' +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const token = await hooks.getAccessToken();
  const tenant = hooks.getTenant();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (init.signal) init.signal.addEventListener('abort', () => ctrl.abort());

  let res: Response;
  try {
    res = await fetch(baseUrl(target) + path + (qs === '?' ? '' : qs), {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Language': uiLang(),
        ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenant ? { 'X-Tenant-Id': tenant } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(0, ctrl.signal.aborted ? '请求超时' : '网络不可用', e);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) {
    hooks.onUnauthorized();
    throw new ApiError(401, '登录已失效');
  }
  const text = await res.text();
  const data: unknown = text ? safeJson(text) : undefined;
  if (!res.ok) {
    let msg = `请求失败（${res.status}）`;
    if (data && typeof data === 'object' && 'message' in data) {
      msg = String((data as { message: unknown }).message);
    }
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const http = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  del: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
};

/** mock 模式下模拟网络延迟，便于看到加载态 */
export function mockDelay<T>(value: T, ms = 160): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const isMock = () => config.dataMode === 'mock';
