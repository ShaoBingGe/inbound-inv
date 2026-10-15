import { Card } from '@/components/ui';
import { useT } from '@/i18n';
import type { LocalCurrency, TaxStateId, TaxStateSlice } from '../types';
import { fmtCount, fmtLoc } from '../format';
import styles from '../TaxDashboardPage.module.css';

/** 阶段色（按顺序：待采集 → 逆向冲减） */
export const STATE_COLOR: Record<TaxStateId, string> = {
  capture: 'var(--blue-light)',
  pending: 'var(--blue-mid)',
  creditable: 'var(--accent)',
  filed: 'var(--navy)',
  nonCreditable: 'var(--axis)',
  reversed: 'var(--red-ink)',
};

export function TaxStatusPanel({
  states,
  scopeName,
  currency,
  active,
  onPick,
}: {
  states: TaxStateSlice[];
  scopeName: string;
  currency: LocalCurrency | null;
  active: TaxStateId | null;
  onPick: (id: TaxStateId) => void;
}) {
  const t = useT();
  return (
    <Card padded={false} className={`${styles.colWide} ${styles.sectionPad}`} aria-label={t('进项税状态')}>
      <div className={styles.panelHead}>
        <h2 className={styles.h2}>
          {t('进项税额状态 ·')} {t(scopeName)}
        </h2>
        <span className={styles.desc}>{t('按处理阶段；点状态可下钻到发票')}</span>
      </div>
      <div className={styles.stateBar}>
        {states.map((s) => {
          const label = `${t(s.label)} ${t(fmtLoc(s.amount, currency))}`;
          return (
            <button
              key={s.id}
              type="button"
              className={styles.stateSeg}
              title={label}
              aria-label={label}
              aria-pressed={active === s.id}
              onClick={() => onPick(s.id)}
              style={{ width: `${(s.share * 100).toFixed(1)}%`, background: STATE_COLOR[s.id] }}
            />
          );
        })}
      </div>
      <div className={styles.stateGrid}>
        {states.map((s) => (
          <button
            key={s.id}
            type="button"
            className={styles.stateItem}
            aria-pressed={active === s.id}
            onClick={() => onPick(s.id)}
          >
            <span className={styles.swatch} style={{ background: STATE_COLOR[s.id] }} aria-hidden="true" />
            <span>
              <span className={styles.stateLabel}>{t(s.label)}</span>
              <span className={`num ${styles.stateMeta}`}>
                {t(fmtLoc(s.amount, currency))} · {fmtCount(s.count)} {t('张 ·')} {(s.share * 100).toFixed(0) + '%'}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
