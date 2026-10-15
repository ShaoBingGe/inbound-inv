import { ButtonLink, PageBody, PageHeader } from '@/components/ui';
import { useT } from '@/i18n';
import { ROUTES } from './routes';

export function ForbiddenPage() {
  const t = useT();
  return (
    <>
      <PageHeader crumb="403" title={t('没有访问权限')} />
      <PageBody>
        <p>{t('当前账号的角色不能访问此页面。如需开通，请联系系统管理员。')}</p>
        <div>
          <ButtonLink to={ROUTES.dashboardGlobal}>{t('返回全球统一看板')}</ButtonLink>
        </div>
      </PageBody>
    </>
  );
}

export function NotFoundPage() {
  const t = useT();
  return (
    <>
      <PageHeader crumb="404" title={t('页面不存在')} />
      <PageBody>
        <p>{t('链接可能已失效，或页面已移动。')}</p>
        <div>
          <ButtonLink to={ROUTES.dashboardGlobal}>{t('返回全球统一看板')}</ButtonLink>
        </div>
      </PageBody>
    </>
  );
}
