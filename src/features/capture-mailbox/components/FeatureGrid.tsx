import { Card, Switch } from '@/components/ui';
import { useT } from '@/i18n';
import type { EfficiencyFeature } from '../types';
import s from '../CaptureMailboxPage.module.css';

/** 提升采集效率的功能 */
export function FeatureGrid({
  feats,
  onToggle,
}: {
  feats: EfficiencyFeature[];
  onToggle: (key: string, on: boolean) => void;
}) {
  const t = useT();
  return (
    <Card padded={false} className={s.feats} aria-label={t('效率功能')}>
      <h2 className={s.h3}>{t('提升采集效率的功能')}</h2>
      <div className={s.featGrid}>
        {feats.map((f) => (
          <div key={f.key} className={s.featItem}>
            <div className={s.featText}>
              <div className={s.strong}>{t(f.label)}</div>
              <div className={s.featDesc}>{t(f.desc)}</div>
            </div>
            <Switch checked={f.on} onChange={(v) => onToggle(f.key, v)} label={<span className="sr-only">{t(f.label)}</span>} />
          </div>
        ))}
      </div>
    </Card>
  );
}
