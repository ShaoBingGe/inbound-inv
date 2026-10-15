import { Card } from '@/components/ui';
import { useT } from '@/i18n';
import { signed } from '../model';
import type { Agg, TrendNow, TrendPoint } from '../types';
import s from '../GlobalDashboardPage.module.css';

/** 按月同比：数量/金额柱图 + 准确率/时长折线 */
export function YoyCharts({ name, stats, now, series }: { name: string; stats: Agg; now: TrendNow; series: TrendPoint[] }) {
  const t = useT();
  const maxAbs = Math.max(10, ...series.map((x) => Math.max(Math.abs(x.c), Math.abs(x.a))));
  const sc = 76 / maxAbs;
  const up = (v: number) => (v > 0 ? +(v * sc).toFixed(1) : 0);
  const dn = (v: number) => (v < 0 ? +(-v * sc).toFixed(1) : 0);

  const X = (i: number) => 30 + 22.5 + i * 45;
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const yAcc = (v: number) => (80 - (clamp(v, 4) / 4) * 65).toFixed(1);
  const yDur = (v: number) => (80 - (clamp(v, 50) / 50) * 65).toFixed(1);
  const accPts = series.map((x, i) => X(i) + ',' + yAcc(x.acc)).join(' ');
  const durPts = series.map((x, i) => X(i) + ',' + yDur(x.dur)).join(' ');

  return (
    <section className={s.charts} aria-label={t('按月同比')}>
      <Card padded={false} className={s.chartCard}>
        <div className={s.chartHead}>
          <h2 className={s.h2sm}>{t('按月同比 · 发票数量 / 金额')}</h2>
          <span className={s.muted}>
            {t(name)} {t('· 近 12 个月 · 同口径')}
          </span>
        </div>
        <div className={s.chartLegend}>
          <span className={s.legendItem}>
            <span className={`${s.swatchLg} ${s.barCount}`} aria-hidden="true" />
            {t('数量同比')}
          </span>
          <span className={s.legendItem}>
            <span className={`${s.swatchLg} ${s.barAmount}`} aria-hidden="true" />
            {t('金额同比')}
          </span>
          <span className={`num ${s.axisNote}`}>
            {t('纵轴 ±')}
            {maxAbs.toFixed(0) + '%'}
          </span>
        </div>
        <div className={s.bars} dir="ltr">
          {series.map((x) => {
            const cT = t('数量同比 ' + x.c.toFixed(1) + '%');
            const aT = t('金额同比 ' + x.a.toFixed(1) + '%');
            return (
              <div key={x.m} className={s.barCol}>
                <div className={s.barUp}>
                  <span title={cT} className={`${s.bar} ${s.barCount}`} style={{ height: up(x.c) }} />
                  <span title={aT} className={`${s.bar} ${s.barAmount}`} style={{ height: up(x.a) }} />
                </div>
                <div className={s.barDn}>
                  <span title={cT} className={`${s.bar} ${s.barCount}`} style={{ height: dn(x.c) }} />
                  <span title={aT} className={`${s.bar} ${s.barAmount}`} style={{ height: dn(x.a) }} />
                </div>
                <div className={`num ${s.barMonth}`}>{t(x.m)}</div>
              </div>
            );
          })}
        </div>
        <div className={`num ${s.chartFoot}`}>
          <span>
            {t('本月数量同比')} <b>{signed(now.c, 1) + '%'}</b>
          </span>
          <span>
            {t('本月金额同比')} <b>{signed(now.a, 1) + '%'}</b>
          </span>
        </div>
      </Card>

      <Card padded={false} className={s.chartCard}>
        <div className={s.chartHead}>
          <h2 className={s.h2sm}>{t('按月同比 · 识别准确率 / 平均识别时长')}</h2>
          <span className={s.muted}>{t(name)}</span>
        </div>
        <div className={s.chartLegend}>
          <span className={s.legendItem}>
            <span className={s.lineSwatch} aria-hidden="true" />
            {t('准确率同比 Δpp（左轴 ±4pp）')}
          </span>
          <span className={s.legendItem}>
            <span className={s.dashSwatch} aria-hidden="true" />
            {t('平均时长同比 Δ%（右轴 ±50%，越低越好）')}
          </span>
        </div>
        <svg
          viewBox="0 0 600 170"
          width="100%"
          height="170"
          role="img"
          aria-label={t('识别准确率与平均识别时长的月度同比折线')}
          direction="ltr"
          overflow="visible"
        >
          <line x1="30" y1="15" x2="570" y2="15" className={s.svgGrid} />
          <line x1="30" y1="80" x2="570" y2="80" className={s.svgAxis} />
          <line x1="30" y1="145" x2="570" y2="145" className={s.svgGrid} />
          <text x="2" y="19" className={s.svgText}>
            +4
          </text>
          <text x="8" y="84" className={s.svgText}>
            0
          </text>
          <text x="2" y="149" className={s.svgText}>
            −4
          </text>
          <text x="574" y="19" className={s.svgText}>
            +50%
          </text>
          <text x="574" y="149" className={s.svgText}>
            −50%
          </text>
          <polyline points={accPts} className={s.svgAcc} />
          <polyline points={durPts} className={s.svgDur} />
          <circle cx={X(11)} cy={yAcc(now.acc)} r="4" className={s.svgAccDot} />
          <circle cx={X(11)} cy={yDur(now.dur)} r="4" className={s.svgDurDot} />
        </svg>
        <div className={`num ${s.lineMonths}`} dir="ltr">
          {series.map((x) => (
            <span key={x.m}>{t(x.m)}</span>
          ))}
        </div>
        <div className={`num ${s.chartFoot}`}>
          <span>
            {t('本月准确率')} <b>{stats.acc.toFixed(2) + '%'}</b>
            {t('（')}
            {signed(now.acc, 2) + ' pp'}
            {t('）')}
          </span>
          <span>
            {t('本月平均时长')} <b>{t(stats.dur.toFixed(1) + ' 秒')}</b>
            {t('（')}
            {signed(now.dur, 1) + '%'}
            {t('）')}
          </span>
        </div>
      </Card>
    </section>
  );
}
