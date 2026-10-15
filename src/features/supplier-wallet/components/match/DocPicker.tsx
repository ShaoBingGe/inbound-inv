import { useState, type ReactNode } from 'react';
import { Button, Checkbox, Icon } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import s from './match.module.css';

export interface PickerDoc {
  id: string;
  /** 抬头下方的说明（主数据，不翻译） */
  sub: ReactNode;
  amt: ReactNode;
  badge?: ReactNode;
  lines: ReactNode[];
}

/** 可勾选、可展开明细的单据列表（新增匹配组、未匹配明细共用） */
export function DocPicker({
  docs,
  selected,
  onToggle,
  forceOpen,
}: {
  docs: PickerDoc[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  /** 搜索时自动展开 */
  forceOpen?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState<Record<string, boolean | undefined>>({});
  return (
    <div>
      {docs.map((d) => {
        const on = !!selected[d.id];
        const expanded = open[d.id] ?? (!!forceOpen || on);
        return (
          <div key={d.id} className={s.doc}>
            <div className={cx(s.docHead, on && s.docOn)}>
              <Checkbox checked={on} onChange={() => onToggle(d.id)} label={<span className="sr-only">{d.id}</span>} />
              <div className={s.docMain}>
                <div className={s.docTitle}>
                  <span className="mono">{d.id}</span>
                  {d.badge}
                </div>
                <div className={cx(s.docSub, s.ellipsis)}>{d.sub}</div>
              </div>
              <span className={cx('num', s.docAmt)}>{d.amt}</span>
              <Button
                size="sm"
                variant="ghost"
                iconOnly
                aria-expanded={expanded}
                aria-label={t(expanded ? '收起明细' : '展开明细')}
                onClick={() => setOpen((o) => ({ ...o, [d.id]: !expanded }))}
              >
                <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={14} />
              </Button>
            </div>
            {expanded ? <div className={s.docLines}>{d.lines}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
