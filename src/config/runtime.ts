/**
 * 运行时配置。由 index.html 先加载的 /config.js 写入 window.__APP_CONFIG__，
 * K8s 中通过 ConfigMap → 环境变量 → docker-entrypoint 生成，镜像一次构建、多环境复用。
 */
export type DataMode = 'mock' | 'live';
export type AuthMode = 'oidc' | 'mock';

export interface OidcProviderConfig {
  /** 唯一 id，用于登录按钮与回调识别 */
  id: string;
  /** 登录页显示名称，例如「企业统一身份认证」「Azure AD」 */
  name: string;
  authority: string;
  clientId: string;
  scope?: string;
  /** 要求 IdP 做额外认证（如 MFA）时传入，例如 "mfa" 或 "urn:mace:incommon:iap:silver" */
  acrValues?: string;
  extraQueryParams?: Record<string, string>;
}

export interface ClaimMapping {
  roles: string;
  /** 用户可访问的数据中心 / 国家范围，取值如 ["CN","JP"] 或 ["*"]（主数据中心） */
  countries: string;
  tenant: string;
  name: string;
  email: string;
}

export interface AppConfig {
  env: string;
  apiBaseUrl: string;
  /** 统一 agent 平台的 API 根地址（Skill 查看与编辑） */
  agentPlatformBaseUrl: string;
  dataMode: DataMode;
  defaultLang: string;
  auth: {
    mode: AuthMode;
    providers: OidcProviderConfig[];
    claims: ClaimMapping;
  };
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

const DEFAULTS: AppConfig = {
  env: 'local',
  apiBaseUrl: '/api',
  agentPlatformBaseUrl: '/agent-api',
  dataMode: 'mock',
  defaultLang: 'zh',
  auth: {
    mode: 'mock',
    providers: [],
    claims: { roles: 'roles', countries: 'dc_scope', tenant: 'tenant', name: 'name', email: 'email' },
  },
};

function read(): AppConfig {
  const w = typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined;
  const c = w ?? {};
  return {
    ...DEFAULTS,
    ...c,
    auth: {
      ...DEFAULTS.auth,
      ...(c.auth ?? {}),
      claims: { ...DEFAULTS.auth.claims, ...(c.auth?.claims ?? {}) },
      providers: c.auth?.providers ?? DEFAULTS.auth.providers,
    },
  };
}

export const config: AppConfig = read();
