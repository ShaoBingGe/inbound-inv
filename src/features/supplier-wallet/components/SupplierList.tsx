import { Card, Chip } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { effective } from '../helpers';
import type { InvoiceOverride, WalletSupplier } from '../types';
import styles from '../SupplierWalletPage.module.css';

export function SupplierList({
  suppliers,
  selected,
  over,
  onPick,
}: {
  suppliers: WalletSupplier[];
  selected: string;
  over: Record<string, InvoiceOverride>;
  onPick: (code: string) => void;
}) {
  const t = useT();
  return (
    <Card padded={false} className={styles.supCard} aria-label={t('供应商')}>
      <div className={styles.cardHead}>
        <h2 className={styles.h2}>{t('供应商')}</h2>
        <span className="kick">{t('按待处理排序')}</span>
      </div>
      {suppliers.map((s) => {
        const errs = s.invs.reduce((a, i) => a + i.err[0], 0);
        const tot = s.invs.reduce((a, i) => a + i.err[1], 0);
        const exc = s.invs.filter((i) => {
          const e = effective(i, over);
          return e.m === 'diff' || e.ap === 'blocked';
        }).length;
        const joined = s.invs.map((i) => i.amt).join(' + ');
        const amt = joined.length > 28 ? t(s.invs[0].amt + ' 等') : joined;
        const groups = s.invs.filter((i) => i.mg).length;
        const on = s.code === selected;
        return (
          <button
            key={s.code}
            type="button"
            className={cx(styles.supRow, on && styles.supRowOn)}
            aria-pressed={on}
            onClick={() => onPick(s.code)}
          >
            <div className={styles.supName}>{t(s.name)}</div>
            <div className={styles.supMeta}>
              <span className="mono">{s.code}</span> · {t(s.ind)}
            </div>
            <div className={cx('num', styles.supNums)}>
              <span>
                {s.invs.length} {t('张')}
              </span>
              <span>{amt}</span>
              <span className={errs / tot >= 0.2 ? styles.bad : undefined}>
                {t('误差')} {((errs / tot) * 100).toFixed(1)}%
              </span>
              {exc > 0 ? <Chip tone="orange">{t(exc + ' 张待处理')}</Chip> : null}
              {groups > 0 ? (
                <Chip tone="purple">
                  {t('匹配组')} {groups}
                </Chip>
              ) : null}
            </div>
          </button>
        );
      })}
    </Card>
  );
}
