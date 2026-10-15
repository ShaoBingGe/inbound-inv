import { Button, Card, Chip } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { DocType, SourceRule } from '../types';
import s from '../CaptureMailboxPage.module.css';

/** 来源规则列表（当前选中的员工邮箱） */
export function RuleList({
  boxName,
  rules,
  docTypes,
  selected,
  onPick,
  onAdd,
}: {
  boxName: string;
  rules: SourceRule[];
  docTypes: DocType[];
  selected: number;
  onPick: (i: number) => void;
  onAdd: () => void;
}) {
  const t = useT();
  return (
    <Card padded={false} className={s.ruleList} aria-label={t('来源规则')}>
      <div className={s.ruleListHead}>
        <h2 className={s.h3}>
          {t('来源规则')} · <span translate="no">{boxName}</span>
        </h2>
        <div className={s.descSm}>{t('按来源邮箱匹配，命中后套用识别特征与供应商')}</div>
      </div>
      {rules.map((r, i) => (
        <button
          key={i}
          type="button"
          className={cx(s.ruleRow, i === selected && s.ruleRowOn)}
          aria-pressed={i === selected}
          onClick={() => onPick(i)}
        >
          <div className={cx('mono', s.ruleFrom)} translate="no">
            {r.from}
          </div>
          <div className={s.ruleSup} translate="no">
            {r.supName} · <span className="mono">{r.supCode}</span>
          </div>
          <div className={s.ruleChips}>
            <Chip tone="blue">{t(r.country)}</Chip>
            <Chip tone="gray">{t(r.lang)}</Chip>
            <Chip tone="gray">
              {docTypes
                .filter((d) => r.docs[d.key])
                .map((d) => t(d.label))
                .join(' / ')}
            </Chip>
            <span className={cx('num', s.sub)}>
              {t('命中')} {r.hits}
            </span>
          </div>
        </button>
      ))}
      <div className={s.ruleListFoot}>
        <Button onClick={onAdd}>{t('添加来源规则')}</Button>
      </div>
    </Card>
  );
}
