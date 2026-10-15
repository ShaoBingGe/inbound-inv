import { Suspense } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { NAV, ROUTES } from '@/app/routes';
import { useAuth } from '@/auth/AuthProvider';
import { hasRole } from '@/auth/types';
import { Chip, Icon, PageLoading, Popover } from '@/components/ui';
import { config } from '@/config/runtime';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { LangSwitcher } from './LangSwitcher';
import s from './AppLayout.module.css';

export function AppLayout() {
  const t = useT();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((it) => hasRole(user, it.roles)) })).filter(
    (g) => g.items.length > 0,
  );
  const scope = user?.countries.includes('*') ? t('主数据中心 · 全球汇总') : (user?.countries ?? []).join(' · ');

  return (
    <div className={s.shell}>
      <aside className={s.aside}>
        <Link to={ROUTES.dashboardGlobal} className={s.brand}>
          <span className={s.logo}>
            <Icon name="invoice" size={17} strokeWidth={1.8} />
          </span>
          <span>
            <span className={s.brandName} style={{ display: 'block' }}>
              {t('进项发票中台')}
            </span>
            <span className={s.brandSub}>Inbound Invoice Hub</span>
          </span>
        </Link>
        <nav aria-label={t('主菜单')}>
          {groups.map((g) => (
            <div key={g.group}>
              <div className={s.group}>{t(g.group)}</div>
              {g.items.map((it) => {
                const extra = it.match?.some((m) => pathname.startsWith(m));
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    className={({ isActive }) => cx(s.navLink, (isActive || extra) && s.active)}
                  >
                    <Icon d={it.icon} strokeWidth={1.6} />
                    <span>{t(it.label)}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className={s.main}>
        <div className={s.topbar}>
          <div className={s.env}>
            {config.dataMode === 'mock' ? <Chip tone="gray">{t('示例数据')}</Chip> : null}
            {scope ? (
              <span>
                {t('数据视角')} · {scope}
              </span>
            ) : null}
          </div>
          <LangSwitcher />
          {user ? (
            <Popover
              width={280}
              trigger={({ open, toggle }) => (
                <button type="button" className={s.userBtn} onClick={toggle} aria-expanded={open} aria-haspopup="menu">
                  <span className={s.avatar} aria-hidden="true">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span>{user.name}</span>
                  <Icon name="chevronDown" size={9} strokeWidth={2} />
                </button>
              )}
            >
              {({ close }) => (
                <div className={s.userMenu} role="menu">
                  <div className={s.userMeta}>
                    <strong>{user.name}</strong>
                    {user.email ? <span className="kick">{user.email}</span> : null}
                    <span className="kick">
                      {t('身份提供方')} · {user.providerId}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    className={s.menuItem}
                    onClick={() => {
                      close();
                      void logout();
                    }}
                  >
                    <Icon name="logout" />
                    {t('退出登录')}
                  </button>
                </div>
              )}
            </Popover>
          ) : null}
        </div>
        <div className={s.content}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
