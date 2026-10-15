import { Button, Chip } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { CaptureIssue, IssueKey, RecognizedField, RecognizedInvoice } from '../types';
import s from '../CaptureMobilePage.module.css';

export type DoneMap = Partial<Record<IssueKey, true>>;

/** 识别结果：发票概要、校验汇总、问题与纠正建议、字段置信度 */
export function ResultScreen({
  invoice,
  issues,
  fields,
  done,
  po,
  onPo,
  onApply,
}: {
  invoice: RecognizedInvoice;
  issues: CaptureIssue[];
  fields: RecognizedField[];
  done: DoneMap;
  po: string;
  onPo: (v: string) => void;
  onApply: (k: IssueKey) => void;
}) {
  const t = useT();
  const doneN = Object.keys(done).length;
  const left = issues.length - doneN;

  return (
    <div className={cx(s.scroll, s.resBody)}>
      <div className={s.card} style={{ padding: '14px 16px' }}>
        <div className={s.chipRow}>
          <Chip tone="blue">{t(invoice.country)}</Chip>
          <Chip tone="gray">{t(invoice.docType)}</Chip>
        </div>
        <div className={s.seller} translate="no">
          {invoice.seller}
        </div>
        <div className={cx('num', s.amountRow)}>
          <span className={s.amount}>{invoice.amount}</span>
          <span className={s.converted}>{invoice.converted}</span>
        </div>
        <div className={s.fxNote}>{t(invoice.fxNote)}</div>
      </div>

      <div className={cx(s.summary, left ? s.summaryWarn : s.summaryOk)} role="status">
        <div className={s.summaryTitle}>{left ? t('还有 ' + left + ' 项需要处理') : t('校验全部通过')}</div>
        <div className={s.summaryBody}>
          {left
            ? t('本票 14 个字段中 3 个识别存疑（字段误差率 21.4%）。处理后才能加入报销单。')
            : t('已记录 ' + doneN + ' 处更正，提交时随单回传前后对比。')}
        </div>
      </div>

      {issues.map((i) => {
        const d = !!done[i.k];
        return (
          <div key={i.k} className={s.card} style={{ padding: '12px 14px' }}>
            <div className={s.chipRow}>
              <Chip tone={d ? 'green' : i.tone}>{t(d ? '已处理' : i.tag)}</Chip>
              <span className={s.issueLabel}>{t(i.label)}</span>
            </div>
            <div className={s.issueMsg}>{t(i.msg)}</div>
            {i.from ? (
              <div className={cx('mono', s.fix)} translate="no">
                <span className={s.fixFrom}>{i.from}</span> → <span className={s.fixTo}>{i.to}</span>
              </div>
            ) : null}
            {i.editable && !d ? (
              <label className={s.confirmField}>
                <span className={s.confirmLabel}>{t('请对照票面确认')}</span>
                <input
                  className={cx('mono', s.confirmInput)}
                  value={po}
                  onChange={(e) => onPo(e.target.value)}
                  translate="no"
                />
              </label>
            ) : null}
            <div className={s.issueActions}>
              {!d ? (
                <Button className={s.smBtn} onClick={() => onApply(i.k)}>
                  {t(i.btn)}
                </Button>
              ) : (
                <span className={s.doneNote}>{t('✓ 已处理，更正已记录')}</span>
              )}
            </div>
          </div>
        );
      })}

      <div className={s.card} style={{ padding: '6px 14px' }}>
        {fields.map((f) => {
          const fixed = !!(f.fixKey && done[f.fixKey]);
          const val = fixed ? (f.fixedValue ?? po) : f.value;
          const conf = fixed ? 1 : f.conf;
          return (
            <div key={f.label} className={s.fieldRow}>
              <span className={s.fieldLabel}>{t(f.label)}</span>
              <span className={cx('mono', s.fieldVal)} translate="no">
                {val}
              </span>
              <span className={cx('num', s.fieldConf, conf < 0.7 && s.lowConf)}>{Math.round(conf * 100) + '%'}</span>
            </div>
          );
        })}
        <div className={s.fieldsNote}>{t('字段旁数字为识别置信度；低于 70% 的字段需确认')}</div>
      </div>
    </div>
  );
}
