import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import s from '../InvoiceViewerPage.module.css';

/** 左侧页面缩略图 */
export function PageThumbs({ count, page, onPick }: { count: number; page: number; onPick: (i: number) => void }) {
  const t = useT();
  return (
    <div className={s.thumbs}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={s.thumbItem}>
          <button
            type="button"
            className={cx(s.thumb, i === page && s.thumbActive)}
            onClick={() => onPick(i)}
            aria-label={t('第 ' + (i + 1) + ' 页')}
            aria-current={i === page ? 'page' : undefined}
            dir="ltr"
          >
            <span className={s.thumbBar} />
            <span className={s.thumbLine} />
            <span className={s.thumbLine} />
            <span className={cx(s.thumbLine, s.thumbLineShort)} />
          </button>
          <span className={cx('num', s.thumbNo)}>{i + 1}</span>
        </div>
      ))}
    </div>
  );
}
