import { Button, Chip, Field, Input, Select } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { CLS } from '../rules';
import type { CompensationOption, FieldRule, InvoiceField } from '../types';
import s from '../DataCorrectionPage.module.css';

/**
 * 字段更正面板。按规则分三种：
 * - 可直接更正：保存即生效
 * - 复核后生效：提交后进入四眼复核
 * - 不得更正：不显示输入框，只列出可用的补偿方式
 */
export function FieldEditor({
  field,
  rule,
  value,
  etype,
  errorTypes,
  busy,
  onValue,
  onType,
  onSubmit,
  onCompensate,
}: {
  field: InvoiceField;
  rule: FieldRule;
  value: string;
  etype: string;
  errorTypes: string[];
  busy: boolean;
  onValue: (v: string) => void;
  onType: (v: string) => void;
  onSubmit: () => void;
  onCompensate: (c: CompensationOption) => void;
}) {
  const t = useT();
  const cls = CLS[rule.cls];
  const locked = rule.cls === 'lock';
  const review = rule.cls === 'review';
  return (
    <div className={cx(s.editor, locked && s.editorLock)}>
      <div className={s.editorHead}>
        <span className={s.editorTitle}>
          {t('更正「')}
          {field.uiLabel ? t(field.label) : <span translate="no">{field.label}</span>}
          {t('」')}
        </span>
        <Chip tone={cls.tone}>{t(cls.label)}</Chip>
      </div>
      <div className={s.why}>{t(rule.why)}</div>

      {!locked ? (
        <>
          <div className={s.editGrid}>
            <Field label={t('更正为')}>
              {(id) => (
                <Input
                  id={id}
                  className="mono"
                  translate="no"
                  value={value}
                  onChange={(e) => onValue(e.target.value)}
                />
              )}
            </Field>
            <Field label={t('错误类型（用于样本标注）')}>
              {(id) => (
                <Select
                  id={id}
                  value={etype}
                  onChange={onType}
                  options={errorTypes.map((x) => ({ value: x, label: t(x) }))}
                />
              )}
            </Field>
          </div>
          <div className={s.editActions}>
            <Button variant="primary" disabled={busy} onClick={onSubmit}>
              {review ? t('提交复核') : t('保存更正')}
            </Button>
            <span className={s.afterNote}>
              {review ? t('提交后进入四眼复核，生效前当前值不变') : t('保存即生效，并写入一条前后对比记录')}
            </span>
          </div>
        </>
      ) : (
        <div className={s.mt12}>
          <div className={cx('kick', s.kickGap)}>{t('不得更正 · 可用的补偿方式')}</div>
          <div className={s.compList}>
            {rule.comps.map((c) => (
              <div key={c.title} className={s.compItem}>
                <div className={s.compText}>
                  <div className={s.strong}>{t(c.title)}</div>
                  <div className={s.desc}>{t(c.desc)}</div>
                </div>
                <Button disabled={busy} onClick={() => onCompensate(c)}>
                  {t(c.btn)}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
