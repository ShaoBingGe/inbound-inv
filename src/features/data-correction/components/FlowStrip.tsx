import { Card } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { FlowStep } from '../types';
import s from '../DataCorrectionPage.module.css';

/** 修正流程：标注 → 更正 → … → 样本回流（前两步为页面内操作，高亮） */
export function FlowStrip({ steps }: { steps: FlowStep[] }) {
  const t = useT();
  return (
    <Card aria-label={t('修正流程')}>
      <ol className={s.flow}>
        {steps.map((st, i) => (
          <li key={st.label} className={s.flowStep}>
            <span className={cx('num', s.flowNum, i < 2 ? s.flowNumOn : s.flowNumOff)}>{i + 1}</span>
            <div>
              <div className={s.strong}>{t(st.label)}</div>
              <div className={cx(s.small, s.muted)}>{t(st.sub)}</div>
            </div>
            {i < steps.length - 1 ? (
              <svg
                className={s.flowArrow}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}
