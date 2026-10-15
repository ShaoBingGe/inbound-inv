import { Chip, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { CLS, currentValue, fieldRule, hasPending } from '../rules';
import type { CorrectionInvoice, FieldChange } from '../types';
import s from '../DataCorrectionPage.module.css';

/** 字段表：OCR 原值 / 当前值 / 置信度 / 更正等级 */
export function FieldTable({
  inv,
  log,
  selectedKey,
  onPick,
}: {
  inv: CorrectionInvoice;
  log: FieldChange[];
  selectedKey: string;
  onPick: (key: string) => void;
}) {
  const t = useT();
  return (
    <div className={s.tableBox}>
      <Table hoverRows wrapCells className={s.w640}>
        <thead>
          <tr>
            <th>{t('字段')}</th>
            <th>{t('OCR 原值')}</th>
            <th>{t('当前值')}</th>
            <th className={s.right}>{t('置信度')}</th>
            <th>{t('更正等级')}</th>
          </tr>
        </thead>
        <tbody>
          {inv.fields.map((f) => {
            const r = CLS[fieldRule(inv, f).cls];
            const cur = currentValue(f, log);
            const changed = cur !== f.ocr;
            const sel = f.key === selectedKey;
            return (
              <tr key={f.key} className={cx(sel && s.rowSel)}>
                <td>
                  <button
                    type="button"
                    className={cx(s.rowBtn, sel && s.rowBtnSel)}
                    aria-pressed={sel}
                    onClick={() => onPick(f.key)}
                  >
                    {f.uiLabel ? t(f.label) : <span translate="no">{f.label}</span>}
                    <span className={s.srcLabel}>{t('来源 ' + f.src)}</span>
                  </button>
                </td>
                <td className={cx('mono', changed && s.strike)} translate="no">
                  {f.ocr}
                </td>
                <td className="mono">
                  <span translate="no">{cur}</span>
                  {hasPending(f, log) ? t('（待复核）') : null}
                </td>
                <td className={cx('num', s.right, f.conf < 0.7 && s.bad)}>
                  {f.conf ? (f.conf * 100).toFixed(0) + '%' : t('漏识')}
                </td>
                <td>
                  <Chip tone={r.tone}>{t(r.label)}</Chip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
