import { Card } from '@/components/ui';
import { useT } from '@/i18n';
import type { TaxTrend } from '../types';
import { fmtW } from '../format';
import styles from '../TaxDashboardPage.module.css';

/** 进项税净额近 12 个月趋势（手绘 SVG，坐标与设计稿一致：viewBox 600×180，绘图区 x 40–580，基线 y=140） */
export function TrendChart({ trend, scopeName }: { trend: TaxTrend; scopeName: string }) {
  const t = useT();
  const hi = Math.max(...trend.current, ...trend.lastYear) * 1.1 || 1;
  const X = (i: number) => 40 + 22.5 + i * 45;
  const Y = (v: number) => (140 - (v / hi) * 120).toFixed(1);
  const pts = (vs: number[]) => vs.map((v, i) => `${X(i)},${Y(v)}`).join(' ');

  return (
    <Card padded={false} className={`${styles.colWide} ${styles.sectionPad}`} aria-label={t('月度趋势')}>
      <div className={styles.panelHead}>
        <h2 className={styles.h2}>
          {t('进项税净额 · 近 12 个月 ·')} {t(scopeName)}
        </h2>
        <span className={styles.desc}>{t('实线：本年；虚线：去年同期（同口径）')}</span>
      </div>
      <div dir="ltr">
        <svg viewBox="0 0 600 180" className={styles.chart} role="img" aria-label={t('进项税净额月度趋势')}>
          <line x1="40" y1="20" x2="580" y2="20" className={styles.gridLine} />
          <line x1="40" y1="80" x2="580" y2="80" className={styles.gridLine} />
          <line x1="40" y1="140" x2="580" y2="140" className={styles.baseLine} />
          <text x="4" y="24" className={styles.axisText}>
            {t(fmtW(hi))}
          </text>
          <text x="4" y="84" className={styles.axisText}>
            {t(fmtW(hi / 2))}
          </text>
          <text x="4" y="144" className={styles.axisText}>
            0
          </text>
          <polyline points={pts(trend.lastYear)} className={styles.lineLy} />
          <polyline points={pts(trend.current)} className={styles.lineCur} />
          {trend.reversed.map((v, i) => (
            <rect
              key={i}
              x={(X(i) - 5).toFixed(1)}
              y="140"
              width="10"
              height={Math.max(2, (v / hi) * 120).toFixed(1)}
              className={styles.revBar}
            />
          ))}
        </svg>
        <div className={`num ${styles.months}`}>
          {trend.months.map((m) => (
            <span key={m}>{t(m)}</span>
          ))}
        </div>
      </div>
      <div className={`${styles.legend} ${styles.legendTight}`}>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} aria-hidden="true" />
          {t('本年净额')}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDash} aria-hidden="true" />
          {t('去年同期')}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendRev} aria-hidden="true" />
          {t('逆向冲减（下方红柱）')}
        </span>
      </div>
    </Card>
  );
}
