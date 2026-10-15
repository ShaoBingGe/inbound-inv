import { Card } from '@/components/ui';
import { useT } from '@/i18n';
import type { LocalCurrency, TaxTypeSlice } from '../types';
import { fmtLoc } from '../format';
import styles from '../TaxDashboardPage.module.css';

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

export function TaxTypePanel({
  byTax,
  scopeName,
  currency,
}: {
  byTax: TaxTypeSlice[];
  scopeName: string;
  currency: LocalCurrency | null;
}) {
  const t = useT();
  return (
    <Card padded={false} className={`${styles.colNarrow} ${styles.sectionPad}`} aria-label={t('税种构成')}>
      <h2 className={styles.h2}>
        {t('按税种 ·')} {t(scopeName)}
      </h2>
      <div className={styles.taxList}>
        {byTax.map((x) => (
          <div key={x.name} className={styles.taxRow}>
            <span>
              <span className={styles.taxName}>{t(x.name)}</span>
              <span className={styles.taxSub}>{t(x.sub)}</span>
            </span>
            <div className={styles.taxBar}>
              <span className={styles.barCredit} title={t('可抵扣')} style={{ width: pct(x.creditable) }} />
              <span className={styles.barNon} title={t('计入成本/不可抵扣')} style={{ width: pct(x.nonCreditable) }} />
              <span className={styles.barWithheld} title={t('代扣')} style={{ width: pct(x.withheld) }} />
            </div>
            <span className={`num ${styles.right}`}>{t(fmtLoc(x.amount, currency))}</span>
          </div>
        ))}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendBox} ${styles.barCredit}`} aria-hidden="true" />
          {t('可抵扣')}
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendBox} ${styles.barNon}`} aria-hidden="true" />
          {t('不可抵扣 / 计入成本')}
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendBox} ${styles.barWithheld}`} aria-hidden="true" />
          {t('代扣代缴')}
        </span>
      </div>
    </Card>
  );
}
