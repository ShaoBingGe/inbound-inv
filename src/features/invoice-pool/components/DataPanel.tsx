import { useState } from 'react';
import { Button, Chip, ErrorState, Icon, Select, Spinner } from '@/components/ui';
import { useI18n, useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { cx } from '@/lib/sample';
import { fetchRecognizedData } from '../api';
import { LANG_NAME } from '../format';
import type { DocLang, TranslateTarget } from '../types';
import d from './detail.module.css';

const TRANSLATE_ICON = 'M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 3-3 7-7 8M13 21l4-10 4 10M14.5 17h5';

/** 识别数据 + 智能翻译（仅供阅读，不改变原始票面数据与存证） */
export function DataPanel({ invoiceId, srcLang }: { invoiceId: string; srcLang: DocLang }) {
  const t = useT();
  const { dict } = useI18n();
  const [on, setOn] = useState(false);
  const [target, setTarget] = useState<TranslateTarget>(dict === 'zh' || dict === 'en' ? dict : 'en');
  const { data, error, loading, reload } = useAsync(() => fetchRecognizedData(invoiceId, target), [invoiceId, target]);
  const same = srcLang === target;
  const show = on && !same;

  return (
    <div className={d.dataPanel}>
      <div className={d.dataHead}>
        <span className={d.strong}>{t('识别数据')}</span>
        <Chip tone="gray">{t('原文：' + LANG_NAME[srcLang])}</Chip>
        <span className={d.grow} />
        <Button
          aria-pressed={on}
          className={cx(on && d.trOn)}
          onClick={() => setOn((v) => !v)}
          icon={<Icon d={TRANSLATE_ICON} size={15} />}
        >
          {on ? t('关闭智能翻译') : t('智能翻译')}
        </Button>
        <Select
          className={d.trSelect}
          value={target}
          aria-label={t('翻译目标语言')}
          onChange={(v) => {
            setTarget(v === 'zh' ? 'zh' : 'en');
            setOn(true);
          }}
          options={[
            { value: 'zh', label: t('译为 中文') },
            { value: 'en', label: t('译为 English') },
          ]}
        />
      </div>
      {on ? (
        <div className={d.trNote}>
          {same
            ? t('原文即为' + LANG_NAME[srcLang] + '，无需翻译；可切换目标语言')
            : t('AI 翻译 · ' + LANG_NAME[srcLang] + ' → ' + LANG_NAME[target] + ' · 仅供阅读，不改变原始票面数据与存证；金额、税号、日期保持原文')}
        </div>
      ) : null}
      <div className={d.dataBody} aria-busy={loading || undefined}>
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data ? (
          <div className={d.dataLoading}>
            <Spinner label={t('加载中')} />
          </div>
        ) : (
          data.sections.map((sec) => (
            <div key={sec.title} className={d.dataSec}>
              <div className={cx('kick', d.dataSecTitle)}>{t(sec.title)}</div>
              {sec.rows.map((r, i) => (
                <div key={i} className={d.dataRow}>
                  <div className={d.dataK}>
                    {r.kind === 'system' ? t(r.k) : <span translate="no">{r.k}</span>}
                    {show && r.tk ? (
                      <div className={d.trK} translate="no">
                        {r.tk}
                      </div>
                    ) : null}
                  </div>
                  <div className={d.dataV}>
                    {r.kind === 'system' ? (
                      <div className={cx(r.cls, d.wrapAny)}>{t(r.v)}</div>
                    ) : (
                      <div translate="no" className={cx(r.cls, d.wrapAny)}>
                        {r.v}
                      </div>
                    )}
                    {show && r.tv ? (
                      <div className={d.trV}>
                        <Chip tone="purple" className={d.trTag}>
                          {t('译')}
                        </Chip>
                        <span translate="no">{r.tv}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
