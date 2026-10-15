import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';
import { config, type OidcProviderConfig } from '@/config/runtime';
import type { AppUser, Role } from './types';

/** 当前会话使用的身份提供方 id（回调页据此找到对应的 UserManager） */
export const PROVIDER_KEY = 'inboundHub.authProvider';

const managers = new Map<string, UserManager>();

export function getProvider(id: string): OidcProviderConfig | undefined {
  return config.auth.providers.find((p) => p.id === id);
}

export function getManager(id: string): UserManager {
  const existing = managers.get(id);
  if (existing) return existing;
  const p = getProvider(id);
  if (!p) throw new Error(`Unknown identity provider: ${id}`);
  const origin = window.location.origin;
  const mgr = new UserManager({
    authority: p.authority,
    client_id: p.clientId,
    redirect_uri: `${origin}/auth/callback`,
    post_logout_redirect_uri: `${origin}/login`,
    response_type: 'code',
    scope: p.scope ?? 'openid profile email',
    // 使用 refresh_token 静默续期（scope 需包含 offline_access，IdP 需为该 client 开启 refresh token）
    automaticSilentRenew: true,
    loadUserInfo: true,
    // 令牌只放 sessionStorage：关闭浏览器即失效，不写 localStorage
    userStore: new WebStorageStateStore({ store: window.sessionStorage, prefix: `oidc.${p.id}.` }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage, prefix: `oidc.${p.id}.state.` }),
    acr_values: p.acrValues || undefined,
    extraQueryParams: p.extraQueryParams,
  });
  managers.set(id, mgr);
  return mgr;
}

function claim(profile: Record<string, unknown>, path: string): unknown {
  // 支持点路径，例如 "realm_access.roles"
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), profile);
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string' && v) return v.split(/[\s,]+/).filter(Boolean);
  return [];
}

const KNOWN_ROLES: Role[] = ['viewer', 'ap_clerk', 'tax_manager', 'data_ops', 'skill_editor', 'admin'];

export function toAppUser(u: User, providerId: string): AppUser {
  const c = config.auth.claims;
  const profile = u.profile as unknown as Record<string, unknown>;
  const roles = asList(claim(profile, c.roles)).filter((r): r is Role => (KNOWN_ROLES as string[]).includes(r));
  const countries = asList(claim(profile, c.countries));
  return {
    id: String(u.profile.sub),
    name: String(claim(profile, c.name) ?? u.profile.preferred_username ?? u.profile.sub),
    email: (claim(profile, c.email) as string | undefined) ?? undefined,
    tenant: (claim(profile, c.tenant) as string | undefined) ?? undefined,
    roles: roles.length ? roles : ['viewer'],
    countries: countries.length ? countries : [],
    providerId,
    expiresAt: u.expires_at,
  };
}
