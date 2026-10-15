import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { Button, Checkbox, Field, Icon, Input, Select } from '@/components/ui';
import { config } from '@/config/runtime';
import { useT } from '@/i18n';
import { LangSwitcher } from '@/layout/LangSwitcher';
import { useAuth } from './AuthProvider';
import type { Role } from './types';
import s from './LoginPage.module.css';

const ROLE_LABEL: Record<Role, string> = {
  viewer: '只读查看',
  ap_clerk: 'AP / 费控处理',
  tax_manager: '税务管理',
  data_ops: '数据运维',
  skill_editor: 'Skill 编辑',
  admin: '管理员',
};

const SCOPES = [
  { value: '*', label: '主数据中心 · 全球汇总' },
  { value: 'CN', label: '中国大陆 · CN-QD' },
  { value: 'JP', label: '日本 · JP-TYO' },
  { value: 'DE', label: '德国 · EU-FRA' },
  { value: 'US', label: '美国 · NA-IAD' },
];

function safeReturn(v: string | null): string {
  return v && v.startsWith('/') && !v.startsWith('//') ? v : ROUTES.dashboardGlobal;
}

export function LoginPage() {
  const t = useT();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturn(params.get('returnTo'));
  const { user, mode, login, loginMock, error } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [name, setName] = useState('李 敏');
  const [roles, setRoles] = useState<Role[]>(['admin']);
  const [scope, setScope] = useState('*');

  if (user) return <Navigate to={returnTo} replace />;

  const go = async (pid: string) => {
    setBusy(pid);
    setFailed(null);
    try {
      await login(pid, returnTo);
    } catch (e) {
      setFailed(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  return (
    <div className={s.page}>
      <section className={s.brand} aria-label={t('全球进项发票中台')}>
        <div className={s.logo}>
          <Icon name="invoice" size={22} strokeWidth={1.8} />
        </div>
        <h1 className={s.headline}>{t('全球进项发票中台')}</h1>
        <p className={s.lede}>
          {t('一个入口采集各国进项发票：税局同步、供应商门户、ERP 嵌入 H5、邮箱与 Peppol，统一校验、纠正、入账与付款追踪。')}
        </p>
        <ul className={s.points}>
          <li>
            <Icon name="shield" />
            {t('通过企业身份提供方登录，可叠加多因素认证')}
          </li>
          <li>
            <Icon name="globe" />
            {t('数据按国家驻留，每个国家只能看到本国数据')}
          </li>
        </ul>
      </section>

      <section className={s.panel}>
        <div className={s.top}>
          <LangSwitcher />
        </div>
        <div className={s.box}>
          <div>
            <h2 className={s.title}>{t('登录')}</h2>
            <p className={s.sub}>{t('请选择所在企业的身份提供方，完成认证后回到本系统。')}</p>
          </div>

          {error || failed ? (
            <div className={s.error} role="alert">
              {failed ?? error}
            </div>
          ) : null}

          {mode === 'oidc' ? (
            <div className={s.providers}>
              {config.auth.providers.map((p) => (
                <Button key={p.id} variant="primary" size="lg" block onClick={() => go(p.id)} disabled={busy !== null}>
                  <Icon name="shield" />
                  {busy === p.id ? t('正在跳转…') : `${t('使用')} ${t(p.name)} ${t('登录')}`}
                </Button>
              ))}
              {config.auth.providers.length === 0 ? (
                <div className={s.error}>{t('未配置身份提供方，请联系管理员。')}</div>
              ) : null}
            </div>
          ) : (
            <form
              className={s.mock}
              onSubmit={(e) => {
                e.preventDefault();
                loginMock({ name, roles: roles.length ? roles : ['viewer'], countries: [scope] });
                nav(returnTo, { replace: true });
              }}
            >
              <strong>{t('开发模式登录')}</strong>
              <span className={s.foot}>{t('当前为 mock 认证，仅用于本地开发与演示。生产环境把 auth.mode 设为 oidc。')}</span>
              <Field label={t('姓名')}>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
              <Field label={t('数据视角')}>
                {(id) => (
                  <Select id={id} value={scope} onChange={setScope} options={SCOPES.map((o) => ({ value: o.value, label: t(o.label) }))} />
                )}
              </Field>
              <div>
                <div className="kick" style={{ marginBottom: 6 }}>
                  {t('角色')}
                </div>
                <div className={s.roles}>
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                    <Checkbox
                      key={r}
                      checked={roles.includes(r)}
                      onChange={(v) => setRoles((xs) => (v ? [...xs, r] : xs.filter((x) => x !== r)))}
                      label={t(ROLE_LABEL[r])}
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" variant="primary" size="lg" block>
                {t('进入系统')}
              </Button>
            </form>
          )}

          <p className={s.foot}>{t('登录即表示同意遵守企业信息安全规范。会话令牌仅保存在当前浏览器标签页。')}</p>
        </div>
      </section>
    </div>
  );
}
