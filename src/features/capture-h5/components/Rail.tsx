import { Icon } from '@/components/ui';
import { cx } from '@/lib/sample';
import type { UiText } from '../i18n';
import type { RailItem } from '../model';
import s from './Rail.module.css';

/** 左侧：票据发生地（待归属 + 各国分组 + 添加发生地） */
export function Rail({
  T,
  items,
  unk,
  onPick,
  onAdd,
}: {
  T: UiText;
  items: RailItem[];
  unk: { show: boolean; count: string; on: boolean };
  onPick: (code: string) => void;
  onAdd: () => void;
}) {
  return (
    <nav className={s.rail} aria-label={T.railHead}>
      <div className={cx('kick', s.head)}>{T.railHead}</div>

      {unk.show ? (
        <button type="button" className={cx(s.item, s.unk, unk.on && s.unkOn)} aria-pressed={unk.on} onClick={() => onPick('UNK')}>
          <div className={s.itemTop}>
            <span className={cx(s.name, s.unkName)}>{T.unattributed}</span>
            <span className={cx('num', s.count, s.unkCount)}>{unk.count}</span>
          </div>
          <div className={s.unkSub}>{T.unkSub}</div>
        </button>
      ) : null}

      {items.map((c) => (
        <button key={c.code} type="button" className={cx(s.item, c.on && s.on)} aria-pressed={c.on} onClick={() => onPick(c.code)}>
          <div className={s.itemTop}>
            <span className={s.name}>{c.name}</span>
            <span className={cx('num', s.count)}>{c.count}</span>
          </div>
          <div className={cx('num', s.money)}>
            <span>{c.money}</span>
            <span className={s.dot} aria-hidden="true">
              ·
            </span>
            <span className={s.tax}>{c.tax}</span>
          </div>
          <div className={s.note}>{c.note}</div>
          {c.needs ? <div className={s.needs}>{c.needs}</div> : null}
        </button>
      ))}

      <div className={s.addWrap}>
        <button type="button" className={s.add} onClick={onAdd}>
          <Icon name="plus" size={14} strokeWidth={1.5} />
          {T.addGeo}
        </button>
      </div>

      <div className={s.foot}>{T.railFoot}</div>
    </nav>
  );
}
