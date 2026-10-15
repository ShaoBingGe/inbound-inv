import { Button, Icon, Modal } from '@/components/ui';
import { cx } from '@/lib/sample';
import type { UiText } from '../i18n';
import type { PickerView } from '../model';
import s from './CountryPicker.module.css';

/** 选择国家/地区：拼音首字母索引 + 搜索（国家 / 币种 / 税种）。也用于改判发生地 */
export function CountryPicker({
  T,
  v,
  onClose,
  onQuery,
  onClear,
  onLetter,
  onAdd,
}: {
  T: UiText;
  v: PickerView | null;
  onClose: () => void;
  onQuery: (q: string) => void;
  onClear: () => void;
  onLetter: (letter: string) => void;
  onAdd: (code: string) => void;
}) {
  return (
    <Modal
      open={!!v}
      onClose={onClose}
      width={616}
      bodyStyle={{ padding: 0 }}
      title={
        <div>
          <div className={s.title}>{T.pickTitle}</div>
          <div className={s.sub}>{T.pickSub}</div>
        </div>
      }
      footer={
        v ? (
          <>
            <span className={cx('num', s.foot)}>{v.foot}</span>
            <Button onClick={onClose}>{T.close}</Button>
          </>
        ) : null
      }
    >
      {v ? (
        <div className={s.body}>
          <div className={s.searchWrap}>
            <label className={cx(s.search, v.hasQ && s.searchOn)}>
              <Icon name="search" size={15} strokeWidth={1.5} />
              <input
                className={s.input}
                value={v.q}
                onChange={(e) => onQuery(e.target.value)}
                placeholder={T.searchPh}
                aria-label={T.searchPh}
              />
              {v.hasQ ? (
                <button type="button" className={s.clear} onClick={onClear} aria-label={T.close}>
                  <Icon name="close" size={13} strokeWidth={1.6} />
                </button>
              ) : null}
            </label>
          </div>

          {v.showIndex ? (
            <div className={s.index} role="group" aria-label={T.pickSub}>
              {v.index.map((i) => (
                <button
                  key={i.key}
                  type="button"
                  className={cx(s.letter, i.all && s.letterAll, i.on && s.letterOn, !i.has && s.letterOff)}
                  aria-pressed={i.on}
                  disabled={!i.has}
                  onClick={() => onLetter(i.all ? '' : i.ch)}
                >
                  {i.ch}
                </button>
              ))}
            </div>
          ) : null}

          <div className={s.scroll}>
            {v.groups.map((g) => (
              <div key={g.letter} className={s.group}>
                <div className={cx('kick', s.groupHead)}>{g.letter}</div>
                {g.rows.map((p) => (
                  <button key={p.code} type="button" className={s.row} onClick={() => onAdd(p.code)}>
                    <span className={s.name}>{p.name}</span>
                    <span className={cx('num', s.tax)}>{p.tax}</span>
                    <span className={cx('num', s.currency)}>{p.currency}</span>
                  </button>
                ))}
              </div>
            ))}
            {v.empty ? <div className={s.noMatch}>{T.noMatch}</div> : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
