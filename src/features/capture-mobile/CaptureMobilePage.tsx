import { Link, useLocation } from 'react-router-dom';
import { ButtonLink, Card, Icon, PageBody, PageHeader } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { PhoneApp } from './components/PhoneApp';
import s from './CaptureMobilePage.module.css';

/**
 * 移动端采集。两个入口共用本组件：
 * - /capture/mobile：应用框架内，在 390×844 设备框中预览手机流程；
 * - /m/capture：员工扫码打开的独立页面，铺满手机屏幕。
 */
export default function CaptureMobilePage() {
  const t = useT();
  const { pathname } = useLocation();

  if (pathname.startsWith('/m/')) {
    return (
      <div className={s.standalone}>
        <PhoneApp framed={false} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        crumb={`${t('采集')} / ${t('移动端采集')}`}
        title={t('移动端采集')}
        actions={
          <ButtonLink
            to={ROUTES.mobileStandalone}
            target="_blank"
            rel="noopener"
            icon={<Icon name="external" size={14} />}
          >
            {t('新窗口打开')}
          </ButtonLink>
        }
      />
      <PageBody>
        <div className={s.previewWrap}>
          <div className={s.device}>
            <PhoneApp framed />
          </div>
          <Card as="aside" className={s.sideNote}>
            <div className="kick">{t('预览移动端采集')}</div>
            <p className={s.sideText}>
              {t('员工')} · {t('扫码在手机上打开（10 分钟有效）')}
            </p>
            <div className={s.sideLinks}>
              <Link to={ROUTES.captureH5}>{t('打开 H5页面采集')}</Link>
              <a href={ROUTES.mobileStandalone} target="_blank" rel="noopener">
                {t('新窗口打开')} <span className="mono">{ROUTES.mobileStandalone}</span>
              </a>
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
