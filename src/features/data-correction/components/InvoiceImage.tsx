import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { currentValue } from '../rules';
import type { CorrectionInvoice, FieldChange } from '../types';
import s from '../DataCorrectionPage.module.css';

const LINES = [44, 48, 52, 56];

/** 票面影像（原件只读示意）+ 字段框选：点框选中字段 */
export function InvoiceImage({
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
    <div className={s.imageCol}>
      <div className={cx('kick', s.kickGap)}>{t('票面影像（原件只读 · SHA-256 ' + inv.hash + '）')}</div>
      <div className={s.paper} translate="no" dir="ltr">
        <div className={s.pTitle} />
        <div className={s.pSub} />
        <div className={s.pStamp} />
        <div className={s.pRule} />
        {LINES.map((y) => (
          <div key={y} className={s.pLine} style={{ top: `${y}%` }} />
        ))}
        <div className={s.pFoot} />
        {inv.fields.map((f) => {
          const sel = f.key === selectedKey;
          const bad = inv.errs.includes(f.key) && currentValue(f, log) === f.ocr;
          const label = f.uiLabel ? t(f.label) : f.label;
          const [x, y, w, h] = f.box;
          return (
            <button
              key={f.key}
              type="button"
              aria-label={label}
              aria-pressed={sel}
              title={label}
              className={cx(s.box, sel ? s.boxSel : bad && s.boxBad)}
              style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
              onClick={() => onPick(f.key)}
            />
          );
        })}
      </div>
      <div className={s.legend}>
        <span className={s.legendItem}>
          <span className={cx(s.swatch, s.swatchBad)} />
          {t('识别有误')}
        </span>
        <span className={s.legendItem}>
          <span className={cx(s.swatch, s.swatchSel)} />
          {t('当前选中')}
        </span>
        <span className={s.legendItem}>
          <span className={s.swatch} />
          {t('识别正确')}
        </span>
      </div>
    </div>
  );
}
