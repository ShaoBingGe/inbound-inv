import { Card } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { CorrectionSource } from '../types';
import s from '../DataRecognitionPage.module.css';

/** 修正来自谁 · 采纳率（采纳 / 待核验 / 驳回 堆叠条） */
export function SourceBreakdown({ sources }: { sources: CorrectionSource[] }) {
  const { t, locale } = useI18n();
  const fmt = new Intl.NumberFormat(locale);
  return (
    <Card padded={false} className={`${s.card} ${s.col420}`} aria-label={t('修正来源')}>
      <h2 className={s.h2sm}>{t('修正来自谁 · 采纳率')}</h2>
      <div className={s.desc}>{t('采纳 = 核验通过并进入数据集；驳回的修正也保留，作为「易混淆」负样本')}</div>
      <div className={s.sourceList}>
        {sources.map((x) => {
          const pend = 100 - x.acceptedPct - x.rejectedPct;
          return (
            <div key={x.name} className={s.sourceRow}>
              <div>
                <div className={s.sourceName}>{t(x.name)}</div>
                <div className={s.sourceSub}>{t(x.sub)}</div>
              </div>
              <div
                className={s.stackBar}
                role="img"
                aria-label={`${t('采纳')} ${x.acceptedPct}% · ${t('待核验')} ${pend}% · ${t('驳回')} ${x.rejectedPct}%`}
              >
                <span title={t('采纳')} className={s.segOk} style={{ width: `${x.acceptedPct}%` }} />
                <span title={t('待核验')} className={s.segPend} style={{ width: `${pend}%` }} />
                <span title={t('驳回')} className={s.segRej} style={{ width: `${x.rejectedPct}%` }} />
              </div>
              <div className={`num ${s.sourceNum}`}>
                {fmt.format(x.count)} {t('条 · 采纳')} {x.acceptedPct}%
              </div>
            </div>
          );
        })}
      </div>
      <div className={s.legend}>
        <span className={s.legendItem}>
          <span className={`${s.swatch} ${s.segOk}`} aria-hidden="true" />
          {t('采纳')}
        </span>
        <span className={s.legendItem}>
          <span className={`${s.swatch} ${s.segPend}`} aria-hidden="true" />
          {t('待核验')}
        </span>
        <span className={s.legendItem}>
          <span className={`${s.swatch} ${s.segRej}`} aria-hidden="true" />
          {t('驳回')}
        </span>
      </div>
    </Card>
  );
}
