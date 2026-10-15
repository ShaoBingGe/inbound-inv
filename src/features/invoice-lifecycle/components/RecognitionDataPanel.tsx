import { Button, Chip, Icon, Select } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { InvoiceDocument, TargetLang } from '../types';
import s from '../InvoiceLifecyclePage.module.css';

const TRANSLATE_ICON = 'M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 3-3 7-7 8M13 21l4-10 4 10M14.5 17h5';
const TARGET_NAME: Record<TargetLang, string> = { zh: '中文', en: 'English' };

/** 识别数据：票面原文字段 + 可选智能翻译（只用于阅读，不改原始数据） */
export function RecognitionDataPanel({
  doc,
  on,
  target,
  onToggle,
  onTarget,
}: {
  doc: InvoiceDocument;
  on: boolean;
  target: TargetLang;
  onToggle: () => void;
  onTarget: (v: TargetLang) => void;
}) {
  const t = useT();
  const same = doc.lang === target;
  const ti = target === 'zh' ? 0 : 1;
  const tLang = target === 'zh' ? 'zh-CN' : 'en';
  const note = same
    ? '原文即为' + doc.langName + '，无需翻译；可切换目标语言'
    : 'AI 翻译 · ' + doc.langName + ' → ' + TARGET_NAME[target] + ' · 仅供阅读，不改变原始票面数据与存证；金额、税号、日期保持原文';
  return (
    <div className={s.dataCol}>
      <div className={s.dataHead}>
        <span className={s.dataTitle}>{t('识别数据')}</span>
        <Chip tone="gray">
          {t('原文：')}
          {t(doc.langName)}
        </Chip>
        <div className={s.spacer} />
        <Button
          aria-pressed={on}
          className={cx(on && s.trOn)}
          onClick={onToggle}
          icon={<Icon d={TRANSLATE_ICON} size={15} />}
        >
          {on ? t('关闭智能翻译') : t('智能翻译')}
        </Button>
        <Select
          aria-label={t('翻译目标语言')}
          value={target}
          onChange={(v) => onTarget(v === 'zh' ? 'zh' : 'en')}
          options={[
            { value: 'zh', label: t('译为 中文') },
            { value: 'en', label: t('译为 English') },
          ]}
        />
      </div>
      {on ? <div className={s.trNote}>{t(note)}</div> : null}
      <div className={s.dataBody}>
        {doc.sections.map((sec) => (
          <div key={sec.title} className={s.dataSection}>
            <div className={cx('kick', s.dataSectionTitle)}>{t(sec.title)}</div>
            {sec.rows.map((r, i) => {
              const showT = on && !same && !!r.tk;
              const tv = r.tv?.[ti];
              const showTV = on && !same && !!tv;
              return (
                <div key={i} className={s.dataRow}>
                  <div className={s.dataKey}>
                    {r.uiKey ? <span>{t(r.k)}</span> : <span translate="no">{r.k}</span>}
                    {showT && r.tk ? (
                      <div className={s.dataKeyT} translate="no" lang={tLang}>
                        {r.tk[ti]}
                      </div>
                    ) : null}
                  </div>
                  <div className={s.dataVal}>
                    <div translate="no" className={cx(r.cls, s.wrapAny)}>
                      {r.v}
                    </div>
                    {showTV ? (
                      <div className={s.dataValT}>
                        <Chip tone="purple" className={s.trChip}>
                          {t('译')}
                        </Chip>
                        <span translate="no" lang={tLang}>
                          {tv}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
