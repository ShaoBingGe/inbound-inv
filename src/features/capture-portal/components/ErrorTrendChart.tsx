import { Card } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import s from './portal.module.css';

/** 近 6 个月识别错误率柱图：高于同国平均的月份用橙色 */
export function ErrorTrendChart({
  trend,
  months,
  avg,
  note,
}: {
  trend: number[];
  months: string[];
  /** 平台同国家平均错误率（%） */
  avg: number;
  note: string;
}) {
  const t = useT();
  const mx = Math.max(...trend, 5);
  return (
    <Card padded={false} className={s.panel} aria-label={t('识别错误率趋势')}>
      <h2 className={s.panelTitle}>{t('您的发票识别错误率 · 近 6 个月')}</h2>
      <div className={s.bars}>
        {trend.map((v, i) => (
          <div key={months[i] ?? i} className={s.barCol}>
            <span className={cx('num', s.barValue)}>{v.toFixed(1) + '%'}</span>
            <span
              className={cx(s.bar, v > avg && s.barOver)}
              style={{ height: `${Math.round((v / mx) * 110)}px` }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <div className={s.barLabels}>
        {months.map((m) => (
          <span key={m}>{t(m)}</span>
        ))}
      </div>
      <div className={s.trendNote}>{t(note)}</div>
    </Card>
  );
}
