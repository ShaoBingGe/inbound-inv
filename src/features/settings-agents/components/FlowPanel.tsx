import { Card } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { FlowStep } from '../types';
import s from '../AgentsPage.module.css';

/** 一张发票采集完成后，Agent 做了什么（第 6 步「决定级别」高亮） */
export function FlowPanel({ inv, steps }: { inv: string; steps: FlowStep[] }) {
  const t = useT();
  return (
    <Card padded={false} className={s.half} aria-label={t('作业流')}>
      <h2 className={s.h2sm}>{t('一张发票采集完成后，Agent 做了什么')}</h2>
      <div className={s.sub}>{t(inv)}</div>
      <ol className={s.flowList} style={{ listStyle: 'none', padding: 0, marginBottom: 0 }}>
        {steps.map((f, i) => (
          <li key={f.label} className={cx(s.flowStep, i === 5 && s.flowStepKey)}>
            <span className={'num ' + s.flowDot} aria-hidden="true">
              {i + 1}
            </span>
            <div className={s.flowMain}>
              <div className={s.flowLabel}>{t(f.label)}</div>
              <div className={s.flowSub}>{t(f.sub)}</div>
            </div>
            <span className={'mono num ' + s.flowTime}>{f.t}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
