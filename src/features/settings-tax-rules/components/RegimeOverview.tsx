import { Button, Card, Chip } from '@/components/ui';
import { useT } from '@/i18n';
import type { TaxRegime } from '../types';
import s from '../TaxRulesPage.module.css';

/** 税制概览：国家 · 税制、当前版本、关键事实 */
export function RegimeOverview({
  regime: c,
  canEdit,
  creating,
  onCreateDraft,
}: {
  regime: TaxRegime;
  canEdit: boolean;
  creating: boolean;
  onCreateDraft: () => void;
}) {
  const t = useT();
  return (
    <Card padded={false} className={s.overview} aria-label={t('税制概览')}>
      <div className={s.overviewHead}>
        <h2 className={s.h2}>
          {t(c.name)} · {t(c.regime)}
        </h2>
        <Chip tone="purple">
          {t('当前版本')} {c.ver}
        </Chip>
        <span className={s.desc}>
          {t('生效')} <span className="num">{c.eff}</span> {t('· 维护：')}
          <span className={s.owner}>{t(c.owner)}</span>
        </span>
        <div className={s.spacer} />
        {canEdit ? (
          <Button onClick={onCreateDraft} disabled={creating}>
            {t('新建草稿版本')}
          </Button>
        ) : null}
      </div>
      <div className={s.facts}>
        {c.facts.map((f) => (
          <div key={f.k} className={s.fact}>
            <div className="kick">{t(f.k)}</div>
            <div className={s.factValue}>{t(f.v)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
