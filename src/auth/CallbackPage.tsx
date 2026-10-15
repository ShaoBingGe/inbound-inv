import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { PageLoading } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from './AuthProvider';

/** OIDC 回调：完成授权码交换后回到原页面 */
export function CallbackPage() {
  const t = useT();
  const nav = useNavigate();
  const { completeLogin } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return; // StrictMode 下避免重复交换授权码
    once.current = true;
    completeLogin()
      .then((to) => nav(to, { replace: true }))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, [completeLogin, nav]);

  if (err) {
    return (
      <div style={{ padding: 40, display: 'grid', gap: 12, justifyItems: 'start' }}>
        <h1 style={{ fontSize: 20 }}>{t('登录未完成')}</h1>
        <p style={{ color: 'var(--red-ink)' }}>{err}</p>
        <Link to={ROUTES.login}>{t('返回登录页')}</Link>
      </div>
    );
  }
  return <PageLoading />;
}
