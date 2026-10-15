import { Card, Chip, Segmented, Table, type Tone } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { currentValue, hasPending } from '../rules';
import type { CorrectionInvoice, FieldChange } from '../types';
import s from '../DataCorrectionPage.module.css';

export type DiffView = 'all' | 'chg';

/** 修正前后对比：v1 OCR 快照 vs 当前生效版本 */
export function DiffPanel({
  inv,
  log,
  view,
  onView,
}: {
  inv: CorrectionInvoice;
  log: FieldChange[];
  view: DiffView;
  onView: (v: DiffView) => void;
}) {
  const t = useT();
  const applied = log.filter((l) => l.status === 'applied').length;
  const curVer = 'v' + (applied + 1);
  const rows = inv.fields.map((f) => {
    const cur = currentValue(f, log);
    const changed = cur !== f.ocr;
    const last = log.filter((l) => l.field === f.key && l.status === 'applied').pop();
    const pend = hasPending(f, log);
    const st = changed ? '已修正' : pend ? '待复核' : '未变化';
    const tone: Tone = changed ? 'green' : pend ? 'orange' : 'gray';
    return { f, cur, changed, last, pend, st, tone };
  });
  const shown = view === 'all' ? rows : rows.filter((d) => d.changed || d.pend);
  return (
    <Card className={s.workCard} aria-label={t('修正前后对比')}>
      <div className={s.headRowCenter}>
        <h2 className={s.h2}>{t('修正前后对比')}</h2>
        <Segmented<DiffView>
          ariaLabel={t('对比方式')}
          value={view}
          onChange={onView}
          options={[
            { value: 'all', label: t('全部字段') },
            { value: 'chg', label: t('仅看差异') },
          ]}
        />
        <span className={s.muted}>
          {t('v1 = OCR 首次识别快照；当前生效版本为 v')}
          {applied + 1}
        </span>
      </div>
      <div className={cx(s.tableBox, s.tableBoxGap)}>
        <Table wrapCells className={s.w620}>
          <thead>
            <tr>
              <th>{t('字段')}</th>
              <th>{t('修正前（v1 OCR）')}</th>
              <th>{t('修正后（' + curVer + '）')}</th>
              <th>{t('变化来源')}</th>
              <th>{t('状态')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((d) => (
              <tr key={d.f.key}>
                <td>{d.f.uiLabel ? t(d.f.label) : <span translate="no">{d.f.label}</span>}</td>
                <td className={cx('mono', d.changed && s.diffBefore)} translate="no">
                  {d.f.ocr}
                </td>
                <td className={cx('mono', d.changed && s.diffAfter)} translate="no">
                  {d.cur}
                </td>
                <td>{d.last ? t(d.last.source) + ' · ' + d.last.ver : d.pend ? t('人工更正（待复核）') : '—'}</td>
                <td>
                  <Chip tone={d.tone}>{t(d.st)}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
