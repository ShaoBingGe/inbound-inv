import { Button } from '@/components/ui';
import { cx } from '@/lib/sample';
import type { FooterView } from '../model';
import s from './SelectionFooter.module.css';

/** 底栏：已选数量、折算本位币合计、按国家拆分、拦截提示与导入 */
export function SelectionFooter({ v, onImport, busy }: { v: FooterView; onImport: () => void; busy?: boolean }) {
  return (
    <div className={s.footer}>
      <div>
        <div className="kick">{v.selectedLabel}</div>
        <div className={cx('num', s.selLine)}>{v.selLine}</div>
      </div>
      <div className={s.sep} aria-hidden="true" />
      <div className={s.total}>
        <div className="kick">{v.totalLabel}</div>
        <div className={s.totalLine}>
          <span className={cx('num', s.selTotal)}>{v.selTotal}</span>
          <span className={cx('num', s.breakdown)}>{v.selBreakdown}</span>
        </div>
      </div>
      {v.blockedNote ? <div className={s.blocked}>{v.blockedNote}</div> : null}
      <Button size="lg">{v.cancel}</Button>
      <Button size="lg" variant="primary" onClick={onImport} disabled={busy} className={s.importBtn}>
        {v.importLabel}
      </Button>
    </div>
  );
}
