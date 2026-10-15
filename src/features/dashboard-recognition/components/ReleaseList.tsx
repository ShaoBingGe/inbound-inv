import { Link } from 'react-router-dom';
import { Section } from '@/components/ui';
import { PROTOTYPE_ROUTE } from '@/app/routes';
import { useI18n, useT } from '@/i18n';
import type { ModelRelease } from '../types';
import s from '../RecognitionDashboardPage.module.css';

/** 模型版本记录 */
export function ReleaseList({ releases }: { releases: ModelRelease[] }) {
  const t = useT();
  const { locale } = useI18n();
  const n = (v: number) => v.toLocaleString(locale);
  return (
    <Section padded={false} title={t('版本记录')} className={s.block}>
      <div className={s.releases}>
        {releases.map((r) => (
          <div key={r.version} className={s.releaseRow}>
            <span className={`mono ${s.strong}`}>{r.version}</span>
            <span className={`num ${s.ink2}`}>{r.releasedAt}</span>
            <div>
              <div>{t(r.note)}</div>
              <div className={s.releaseMeta}>
                {t('训练样本')} {n(r.trainingSamples)} {t('· 其中回流样本')} {n(r.feedbackSamples)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={s.releaseLink}>
        <Link to={PROTOTYPE_ROUTE['Dataset.dc.html']}>{t('调整各国数据集与回流策略')}</Link>
      </div>
    </Section>
  );
}
