import { Icon } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { UiText } from '../i18n';
import type { ChipTone, GroupKind, GroupView, RowView } from '../model';
import type { CheckState } from '../types';
import { ICON } from './icons';
import s from './InvoiceList.module.css';

const GROUP_CLASS: Record<GroupKind, string> = {
  todo: s.gTodo,
  check: s.gCheck,
  ready: s.gReady,
  blocked: s.gCheck,
};
const CHIP_CLASS: Record<ChipTone, string> = {
  missing: s.chipMissing,
  flag: s.chipFlag,
  matched: s.chipQuiet,
  unmatched: s.chipUnmatched,
  ok: s.chipQuiet,
};
export const CHECK_CLASS: Record<CheckState, string> = {
  pass: s.ckPass,
  fix: s.ckFix,
  fixed: s.ckFixed,
  warn: s.ckWarn,
  fail: s.ckFail,
  lock: s.ckFix,
};

export interface RowHandlers {
  onToggle: (id: number) => void;
  onEdit: (id: number) => void;
  onAssign: (id: number, code: string) => void;
  onMore: (id: number) => void;
}

/** 票据列表：按 待补全 / 需核查 / 可导入（或 已拦截）分组 */
export function InvoiceList({
  T,
  groups,
  isEmpty,
  emptyTitle,
  emptyHint,
  handlers,
}: {
  T: UiText;
  groups: GroupView[];
  isEmpty: boolean;
  emptyTitle: string;
  emptyHint: string;
  handlers: RowHandlers;
}) {
  return (
    <div className={s.list}>
      {groups.map((g) => (
        <section key={g.kind} className={cx(s.group, GROUP_CLASS[g.kind])} aria-label={g.title}>
          <div className={s.groupHead}>
            <h2 className={s.groupTitle}>{g.title}</h2>
            <span className={cx('num', s.groupSummary)}>{g.summary}</span>
            <div className={s.grow} />
            <span className={s.groupNote}>{g.note}</span>
          </div>
          {g.rows.map((r) => (
            <InvoiceRowItem key={r.id} T={T} r={r} handlers={handlers} />
          ))}
        </section>
      ))}

      {isEmpty ? (
        <div className={s.empty}>
          <div className={s.emptyTitle}>{emptyTitle}</div>
          <div className={s.emptyHint}>{emptyHint}</div>
        </div>
      ) : null}
    </div>
  );
}

function InvoiceRowItem({ T, r, handlers }: { T: UiText; r: RowView; handlers: RowHandlers }) {
  const t = useT();
  return (
    <div className={s.row}>
      <button
        type="button"
        role="checkbox"
        aria-checked={r.checked}
        aria-label={r.seller + ' ' + r.no}
        className={cx(s.box, r.checked && s.boxOn)}
        onClick={() => handlers.onToggle(r.id)}
      >
        {r.checked ? <Icon d={ICON.tick} size={10} strokeWidth={3} /> : null}
      </button>

      <div className={s.thumb} aria-hidden="true">
        <span className="num">{r.kind}</span>
      </div>

      <div className={s.rowMain}>
        <div className={s.rowTop} translate="no">
          <span className={cx(s.seller, r.sellerMissing && s.sellerMissing)} translate={r.sellerMissing ? 'yes' : 'no'}>
            {r.seller}
          </span>
          <span className={cx('num', s.meta)}>{r.no}</span>
          <span className={cx('num', s.meta)}>{r.date}</span>
        </div>
        <div className={s.chips}>
          {r.chips.map((ch, i) => (
            <button key={i} type="button" className={cx(s.chip, CHIP_CLASS[ch.tone])} onClick={() => handlers.onEdit(r.id)}>
              {ch.label}
            </button>
          ))}
        </div>
        <div className={s.checkLine}>
          {r.checkLine.map((k, i) => (
            <span key={i} className={cx(s.ck, CHECK_CLASS[k.st])}>
              <span className={cx('num', s.ckIcon)}>{k.icon}</span>
              {k.text}
            </span>
          ))}
        </div>
        {r.assign ? (
          <div className={s.assign}>
            <span className={cx('kick', s.assignKick)}>{T.reassign}</span>
            {r.assign.map((a) => (
              <button key={a.code} type="button" className={s.assignBtn} onClick={() => handlers.onAssign(r.id, a.code)}>
                {a.name}
              </button>
            ))}
            <button type="button" className={cx(s.assignBtn, s.assignMore)} onClick={() => handlers.onMore(r.id)}>
              {T.more}
            </button>
            <span className={s.keepFile}>{T.keepFile}</span>
          </div>
        ) : null}
      </div>

      <div className={s.amounts}>
        <div className={cx('num', s.orig)}>{r.orig}</div>
        {r.conv ? <div className={cx('num', s.conv)}>{r.conv}</div> : null}
      </div>

      <div className={s.rowActions}>
        <button
          type="button"
          className={cx(s.clip, !r.hasAttach && s.clipEmpty)}
          aria-label={t('附件') + ' ' + r.attach}
          onClick={() => handlers.onEdit(r.id)}
        >
          <Icon d={ICON.clip} size={13} strokeWidth={1.4} />
          <span className="num">{r.attach}</span>
        </button>
        <button type="button" className={s.editBtn} aria-label={t('编辑')} onClick={() => handlers.onEdit(r.id)}>
          <Icon name="edit" size={13} strokeWidth={1.4} />
        </button>
      </div>
    </div>
  );
}
