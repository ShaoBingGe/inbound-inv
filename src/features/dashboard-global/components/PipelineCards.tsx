import { Button, Card } from '@/components/ui';
import { useT } from '@/i18n';
import { fmtAmt, fmtN, GROUPS, STAGES } from '../model';
import type { Agg, FocusKey } from '../types';
import s from '../GlobalDashboardPage.module.css';

/** 发票状态视图：4 个状态组卡片，点选切换下方分级表口径 */
export function PipelineCards({
  total,
  focus,
  onFocus,
}: {
  total: Agg;
  focus: FocusKey;
  onFocus: (f: FocusKey) => void;
}) {
  const t = useT();
  return (
    <Card padded={false} className={s.cardPad} aria-label={t('全球购进发票状态视图')}>
      <div className={s.head}>
        <h2 className={s.h2}>{t('发票状态视图')}</h2>
        <span className={s.muted}>{t('点选一个状态，下方分级表的「发票量 / 金额」切换为该状态口径')}</span>
        <div className={s.spacer} />
        <Button onClick={() => onFocus('all')}>{t('显示全部状态')}</Button>
      </div>
      <div className={s.pipeline}>
        {GROUPS.map((g, i) => {
          const ks = STAGES.filter((x) => x.group === g.k);
          const n = ks.reduce((a, x) => a + total.cnt[x.k], 0);
          const amt = ks.reduce((a, x) => a + total.amtS[x.k], 0);
          const on = focus === g.k;
          return (
            <button
              key={g.k}
              type="button"
              className={s.pipeCard}
              aria-pressed={on}
              onClick={() => onFocus(on ? 'all' : g.k)}
            >
              <div className={s.pipeTop}>
                <span className={`num ${s.step}`}>{i + 1}</span>
                <span className={s.pipeLabel}>{t(g.label)}</span>
                <span className={s.pipeSub}>{t(g.sub)}</span>
              </div>
              <div className={s.pipeNums}>
                <span className={`num ${s.pipeN}`}>{fmtN(n)}</span>
                <span className={s.muted}>{t('张')}</span>
                <span className={`num ${s.pipeAmt}`}>{t(fmtAmt(amt) + ' CNY')}</span>
              </div>
              <div className={s.pipeSubs}>
                {ks.map((x) => (
                  <div key={x.k}>
                    <div className={s.subRow}>
                      <span className={s.subLabel}>
                        <span className={s.swatch} style={{ background: x.c }} aria-hidden="true" />
                        {t(x.label)}
                      </span>
                      <span className="num">
                        {fmtN(total.cnt[x.k])} · {((total.cnt[x.k] / Math.max(1, total.n)) * 100).toFixed(1) + '%'}
                      </span>
                    </div>
                    <div className={s.track}>
                      <div
                        className={s.trackFill}
                        style={{ width: `${((total.cnt[x.k] / Math.max(1, n)) * 100).toFixed(1)}%`, background: x.c }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className={s.pipeHint}>{t(g.hint)}</div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
