import { Card } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { LoopStage } from '../types';
import s from '../DataRecognitionPage.module.css';

/** 闭环流程 · 近 30 天：点一个阶段看它的规则与当前积压 */
export function LoopStages({
  stages,
  active,
  onPick,
}: {
  stages: LoopStage[];
  active: number;
  onPick: (i: number) => void;
}) {
  const { t, locale } = useI18n();
  const max = stages[0]?.value || 1;
  const cur = stages[active];
  const fmt = new Intl.NumberFormat(locale);
  return (
    <Card padded={false} className={s.card} aria-label={t('闭环流程')}>
      <div className={s.headLine}>
        <h2 className={s.h2}>{t('闭环流程 · 近 30 天')}</h2>
        <span className={s.muted}>{t('点一个阶段看它的规则与当前积压')}</span>
      </div>
      <div className={s.stages}>
        {stages.map((st, i) => {
          const on = i === active;
          return (
            <button key={st.label} type="button" className={s.stageBtn} aria-pressed={on} onClick={() => onPick(i)}>
              <div className="kick">
                {i + 1} · {t(st.label)}
              </div>
              <div className={`num ${s.stageValue}`}>{fmt.format(st.value)}</div>
              <div className={s.stageSub}>{t(st.sub)}</div>
              <div className={s.track} aria-hidden="true">
                <div
                  className={s.trackFill}
                  style={{
                    width: `${Math.min(100, (st.value / max) * 100).toFixed(0)}%`,
                    background: on ? 'var(--accent)' : 'var(--chart-2)',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
      {cur ? (
        <div className={s.stageDetail} aria-live="polite">
          <div className={s.stageTitle}>{t(cur.label)}</div>
          <div className={s.stageDesc}>{t(cur.desc)}</div>
          <ul className={s.ruleList}>
            {cur.rules.map((r) => (
              <li key={r} className={s.ruleItem}>
                <span className={s.bullet} aria-hidden="true">
                  •
                </span>
                <span>{t(r)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
