import { Card, Chip } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { CorrectionInvoice } from '../types';
import s from '../DataCorrectionPage.module.css';

/** 待修正队列：采集页、门户、票夹与看板下钻的标注汇入这里 */
export function CorrectionQueue({
  invoices,
  activeId,
  stageNames,
  onPick,
}: {
  invoices: CorrectionInvoice[];
  activeId: string;
  stageNames: string[];
  onPick: (inv: CorrectionInvoice) => void;
}) {
  const t = useT();
  return (
    <Card padded={false} className={s.queue} aria-label={t('待修正队列')}>
      <div className={s.queueHead}>
        <h2 className={s.h2}>{t('待修正队列')}</h2>
        <span className="num kick">{t(invoices.length + ' 张')}</span>
      </div>
      {invoices.map((q) => {
        const rate = (q.errs.length / q.fields.length) * 100;
        const on = q.id === activeId;
        return (
          <button
            key={q.id}
            type="button"
            className={cx(s.queueItem, on && s.queueItemOn)}
            aria-pressed={on}
            onClick={() => onPick(q)}
          >
            <div className={s.queueTop}>
              <span className={s.strong} translate="no">
                {q.sup}
              </span>
              <span className={cx('num', rate >= 20 && s.bad)}>{rate.toFixed(1)}%</span>
            </div>
            <div className={cx('mono', s.queueId)}>{q.id}</div>
            <div className={s.chips}>
              <Chip tone="gray">{t(q.country)}</Chip>
              <Chip tone="blue">{t('来自' + q.from)}</Chip>
              <Chip tone="orange">{t(stageNames[q.stageIdx] ?? '')}</Chip>
            </div>
          </button>
        );
      })}
      <div className={s.queueFoot}>{t('来源：发票采集页、供应商门户、供应商票夹与看板下钻的标注都汇入这里。')}</div>
    </Card>
  );
}
