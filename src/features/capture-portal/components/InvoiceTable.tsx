import { Button, Chip, LinkButton, Table, type Tone } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { PortalInvoice } from '../types';
import s from './portal.module.css';

/** 字段误差率（%） */
export const errRate = (i: PortalInvoice) => (i.err[0] / i.err[1]) * 100;

function statusOf(i: PortalInvoice): [string, Tone] {
  if (i.stage >= 5) return ['已付款', 'green'];
  return i.err[0] ? ['有识别问题', 'orange'] : ['处理中', 'blue'];
}

/** 进度条：每个环节一段，已到达的环节为强调色 */
function StageBar({ steps, stage }: { steps: string[]; stage: number }) {
  const t = useT();
  const label = t(steps[stage]);
  return (
    <div className={s.steps} aria-label={label}>
      {steps.map((p, k) => (
        <span key={p} title={t(p)} className={cx(s.step, k <= stage && s.stepOn)} />
      ))}
      <span className={s.stepLabel}>{label}</span>
    </div>
  );
}

export function InvoiceTable({
  invs,
  steps,
  selected,
  onPick,
}: {
  invs: PortalInvoice[];
  steps: string[];
  selected: string | undefined;
  onPick: (no: string) => void;
}) {
  const t = useT();
  return (
    <div className={s.tableTop}>
      <Table hoverRows className={s.invTable}>
        <thead>
          <tr>
            <th>{t('发票号')}</th>
            <th>{t('开票日期')}</th>
            <th className={s.right}>{t('金额')}</th>
            <th>{t('关联 PO')}</th>
            <th>{t('进度')}</th>
            <th className={s.right}>{t('识别字段误差')}</th>
            <th>{t('状态')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {invs.map((i) => {
            const e = errRate(i);
            const [st, tone] = statusOf(i);
            const on = i.no === selected;
            return (
              <tr key={i.no} className={cx(on && s.selectedRow)}>
                <td className="mono" translate="no">
                  <LinkButton className="mono" onClick={() => onPick(i.no)}>
                    {i.no}
                  </LinkButton>
                </td>
                <td className="num">{i.date}</td>
                <td className={cx('num', s.right)} translate="no">
                  {i.amt}
                </td>
                <td className="mono" translate="no">
                  {i.po}
                </td>
                <td>
                  <StageBar steps={steps} stage={i.stage} />
                </td>
                <td className={cx('num', s.right)} style={{ color: e >= 20 ? 'var(--red-ink)' : 'var(--ink)' }}>
                  {i.err[0] + ' / ' + i.err[1] + ' · ' + e.toFixed(1) + '%'}
                </td>
                <td>
                  <Chip tone={tone}>{t(st)}</Chip>
                </td>
                <td>
                  <Button onClick={() => onPick(i.no)}>{t('查看')}</Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
