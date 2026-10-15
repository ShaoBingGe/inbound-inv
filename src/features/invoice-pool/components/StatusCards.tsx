import { useI18n, useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { fmtMoney, rnd2 } from '../format';
import type { StatusCardDef } from '../filter';
import type { StatusKey } from '../types';
import s from '../InvoicePoolPage.module.css';

export function StatusCards({
  cards,
  value,
  money,
  onPick,
}: {
  cards: StatusCardDef[];
  value: StatusKey;
  money: { sym: string; dp: number };
  onPick: (k: StatusKey) => void;
}) {
  const t = useT();
  const { locale } = useI18n();
  return (
    <section aria-label={t('状态统计')} className={s.cards}>
      {cards.map((k) => {
        const on = value === k.key;
        const amt = fmtMoney(money, rnd2(k.rows.reduce((a, r) => a + r.total, 0), money.dp));
        return (
          <button key={k.key} type="button" className={cx(s.statusCard, on && s.statusCardOn)} aria-pressed={on} onClick={() => onPick(k.key)}>
            <span className={s.cardHead}>
              <span className={s.cardDot} style={{ background: k.dot }} aria-hidden="true" />
              <span className="kick">{t(k.label)}</span>
            </span>
            <span className={cx('num', s.cardN)}>
              {k.rows.length.toLocaleString(locale)}
              <span className={s.cardUnit}> {t('张')}</span>
            </span>
            <span className={cx('num', s.cardAmt)}>{amt}</span>
            <span className={s.cardSub}>{t(k.sub)}</span>
          </button>
        );
      })}
    </section>
  );
}
