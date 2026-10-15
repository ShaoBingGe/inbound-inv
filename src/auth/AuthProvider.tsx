import type { User } from 'oidc-client-ts';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { config } from '@/config/runtime';
import { setAuthHooks } from '@/lib/http';
import { getManager, PROVIDER_KEY, toAppUser } from './oidc';
import type { AppUser, Role } from './types';

const MOCK_KEY = 'inboundHub.mockUser';

export interface AuthValue {
  user: AppUser | null;
  /** 首次检查会话中 */
  loading: boolean;
  error: string | null;
  mode: 'oidc' | 'mock';
  /** 跳转到第三方身份提供方登录 */
  login: (providerId: string, returnTo?: string) => Promise<void>;
  /** 开发模式：直接以指定角色登录 */
  loginMock: (opts: { name: string; roles: Role[]; countries: string[] }) => void;
  /** 回调页调用：完成授权码交换 */
  completeLogin: () => Promise<string>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthValue | null>(null);

function readMock(): AppUser | null {
  try {
    const raw = window.sessionStorage.getItem(MOCK_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function activeProvider(): string | null {
  try {
    return window.sessionStorage.getItem(PROVIDER_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = config.auth.mode;
  const [user, setUser] = useState<AppUser | null>(() => (mode === 'mock' ? readMock() : null));
  const [loading, setLoading] = useState(mode === 'oidc');
  const [error, setError] = useState<string | null>(null);

  // OIDC：恢复已有会话并订阅令牌事件
  useEffect(() => {
    if (mode !== 'oidc') return;
    const pid = activeProvider();
    if (!pid) {
      setLoading(false);
      return;
    }
    let alive = true;
    const mgr = getManager(pid);
    const onLoaded = (u: User) => setUser(toAppUser(u, pid));
    const onUnloaded = () => setUser(null);
    const onSilentError = () => setError('会话已过期，请重新登录');
    mgr.events.addUserLoaded(onLoaded);
    mgr.events.addUserUnloaded(onUnloaded);
    mgr.events.addSilentRenewError(onSilentError);
    mgr
      .getUser()
      .then((u) => {
        if (!alive) return;
        setUser(u && !u.expired ? toAppUser(u, pid) : null);
      })
      .catch((e: unknown) => alive && setError(String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      mgr.events.removeUserLoaded(onLoaded);
      mgr.events.removeUserUnloaded(onUnloaded);
      mgr.events.removeSilentRenewError(onSilentError);
    };
  }, [mode]);

  const login = useCallback(
    async (providerId: string, returnTo = '/') => {
      if (mode !== 'oidc') return;
      window.sessionStorage.setItem(PROVIDER_KEY, providerId);
      await getManager(providerId).signinRedirect({ state: { returnTo } });
    },
    [mode],
  );

  const loginMock = useCallback((opts: { name: string; roles: Role[]; countries: string[] }) => {
    const u: AppUser = {
      id: 'mock-' + opts.name,
      name: opts.name,
      email: 'li.min@group.example.com',
      tenant: 'group',
      roles: opts.roles,
      countries: opts.countries,
      providerId: 'mock',
    };
    window.sessionStorage.setItem(MOCK_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const completeLogin = useCallback(async () => {
    const pid = activeProvider();
    if (!pid) throw new Error('缺少登录上下文，请从登录页重新发起');
    const u = await getManager(pid).signinRedirectCallback();
    setUser(toAppUser(u, pid));
    const st = u.state as { returnTo?: string } | undefined;
    return st?.returnTo && st.returnTo.startsWith('/') ? st.returnTo : '/';
  }, []);

  const logout = useCallback(async () => {
    if (mode === 'mock') {
      window.sessionStorage.removeItem(MOCK_KEY);
      setUser(null);
      return;
    }
    const pid = activeProvider();
    setUser(null);
    if (pid) {
      window.sessionStorage.removeItem(PROVIDER_KEY);
      await getManager(pid).signoutRedirect();
    }
  }, [mode]);

  const getAccessToken = useCallback(async () => {
    if (mode === 'mock') return null;
    const pid = activeProvider();
    if (!pid) return null;
    const u = await getManager(pid).getUser();
    return u && !u.expired ? u.access_token : null;
  }, [mode]);

  // 让 http 层拿到令牌并在 401 时回到登录页
  useEffect(() => {
    setAuthHooks({
      getAccessToken,
      onUnauthorized: () => {
        setUser(null);
        const back = window.location.pathname + window.location.search;
        window.location.assign('/login?returnTo=' + encodeURIComponent(back));
      },
      getTenant: () => user?.tenant ?? null,
    });
  }, [getAccessToken, user]);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, error, mode, login, loginMock, completeLogin, logout, getAccessToken }),
    [user, loading, error, mode, login, loginMock, completeLogin, logout, getAccessToken],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
