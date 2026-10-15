import { Card } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { LifecycleStep } from '../types';
import s from '../InvoiceLifecyclePage.module.css';

/** 生命周期时间线：采集 → 归档，每个节点记录时间、执行者；当前节点带「当前」标记 */
export function LifecycleTimeline({ labels, steps }: { labels: string[]; steps: LifecycleStep[] }) {
  const t = useT();
  return (
    <Card padded={false} className={cx(s.block, s.clip)} aria-label={t('生命周期时间线')}>
      <div className={s.blockHead}>
        <h2 className={s.blockTitle}>{t('生命周期时间线')}</h2>
        <span className={s.blockDesc}>{t('每个节点记录时间、执行者、所在数据中心与适用规则版本；灰色为尚未发生')}</span>
      </div>
      <div className={s.timelineScroll}>
        <ol
          className={s.timeline}
          style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(118px, 1fr))` }}
        >
          {labels.map((label, i) => {
            const st: LifecycleStep = steps[i] ?? { state: 'todo', at: '—', who: '—' };
            return (
              <li key={label} className={s.step} data-state={st.state}>
                <div className={s.stepRail} aria-hidden="true" />
                <div className={s.stepDot} aria-hidden="true" />
                <div className={s.stepLabel}>{t(label)}</div>
                <div className={cx('num', s.stepAt)}>{t(st.at)}</div>
                <div className={s.stepWho}>{t(st.who)}</div>
                {st.state === 'cur' ? <div className={s.stepNote}>{t('当前')}</div> : null}
              </li>
            );
          })}
        </ol>
      </div>
      <div className={s.legend}>
        <span className={s.legendItem}>
          <span className={cx(s.legendDot, s.legendDone)} aria-hidden="true" />
          {t('已完成')}
        </span>
        <span className={s.legendItem}>
          <span className={cx(s.legendDot, s.legendCur)} aria-hidden="true" />
          {t('当前 / 等待')}
        </span>
        <span className={s.legendItem}>
          <span className={cx(s.legendDot, s.legendTodo)} aria-hidden="true" />
          {t('未发生')}
        </span>
        <span className={s.legendItem}>
          <span className={cx(s.legendDot, s.legendRev)} aria-hidden="true" />
          {t('逆向事件')}
        </span>
      </div>
    </Card>
  );
}
