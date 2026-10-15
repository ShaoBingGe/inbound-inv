import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { CheckView, EditView } from '../model';
import { CHECK_CLASS } from './InvoiceList';
import s from './EditDrawer.module.css';

/** 校验与纠正（采纳自动纠正）+ 修正记录（修正前 → 修正后） */
export function ChecksPanel({ v, onFix }: { v: EditView; onFix: (c: CheckView) => void }) {
  const t = useT();
  return (
    <>
      <div className={s.sectionHeadSplit}>
        <span className="kick">{t('校验与纠正')}</span>
        <span className={cx('num', s.errRate, v.errHigh && s.errHigh)}>
          {t('字段识别误差')} {v.errRate}
        </span>
      </div>
      <div className={s.ruled}>
        {v.checks.map((k) => (
          <div key={k.key} className={cx(s.check, CHECK_CLASS[k.st])}>
            <div className={s.checkTop}>
              <span className={cx('num', s.checkIcon)}>{k.icon}</span>
              <span className={s.checkLabel}>{k.label}</span>
              <span className={s.checkMsg}>{k.msg}</span>
              <span className={s.checkRes}>{k.res}</span>
            </div>
            {k.hasFix ? (
              <div className={s.fixRow}>
                <span className="num" translate="no">
                  <span className={s.fixFrom}>{k.from}</span> → <span className={s.fixTo}>{k.to}</span>
                </span>
                <div className={s.grow} />
                {k.canFix ? (
                  <button type="button" className={s.fixBtn} onClick={() => onFix(k)}>
                    {t('采纳纠正')}
                  </button>
                ) : null}
                {k.done ? <span className={s.fixDone}>{t('已采纳 · 已记录')}</span> : null}
              </div>
            ) : null}
          </div>
        ))}
        <div className={s.smallNote}>{v.lockLine}</div>
      </div>

      {v.log.length ? (
        <>
          <div className={cx('kick', s.sectionHead)}>{t('修正记录（修正前 → 修正后）')}</div>
          <div className={s.ruled}>
            {v.log.map((l, i) => (
              <div key={i} className={s.logRow}>
                <span className={cx('num', s.logAt)}>{l.at}</span>
                <span className={s.logField}>{l.field}</span>
                <span className={cx('num', s.logChange)}>
                  <span className={s.fixFrom} translate={l.beforeUi ? 'yes' : 'no'}>
                    {l.before}
                  </span>{' '}
                  →{' '}
                  <span className={s.fixTo} translate={l.afterUi ? 'yes' : 'no'}>
                    {l.after}
                  </span>
                </span>
                <span className={s.logSrc}>{l.src}</span>
              </div>
            ))}
            <div className={s.smallNote}>
              {t('原件与影像不变；每次更正写入一条前后对比，同步到「发票数据修正」并进入识别样本回流。')}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
