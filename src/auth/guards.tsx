import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { PageLoading } from '@/components/ui';
import { useAuth } from './AuthProvider';
import { hasRole, type Role } from './types';

/** 未登录跳到登录页，并带上回跳地址 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoading />;
  if (!user) {
    const back = loc.pathname + loc.search;
    return <Navigate to={`${ROUTES.login}?returnTo=${encodeURIComponent(back)}`} replace />;
  }
  return <>{children}</>;
}

/** 角色不足时显示 403 */
export function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!hasRole(user, roles)) return <Navigate to={ROUTES.forbidden} replace />;
  return <>{children}</>;
}
