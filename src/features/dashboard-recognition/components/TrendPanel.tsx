import { Card } from '@/components/ui';
import { useT } from '@/i18n';
import { LINE_STYLES, METRICS } from '../metrics';
import { fmtDelta, fmtValue, isGood } from '../format';
import type { AxisKey, MetricKey, RecognitionBoard } from '../types';
import s from '../RecognitionDashboardPage.module.css';

const GRID_Y = [10, 65, 120, 175];

/** 趋势：最多 5 个国家的折线 + 图例卡片 */
export function TrendPanel({
  board,
  metric,
  axis,
  selected,
}: {
  board: RecognitionBoard;
  metric: MetricKey;
  axis: AxisKey;
  selected: string[];
}) {
  const t = useT();
  const m = METRICS[metric];
  const xs = axis === 'ver' ? board.versions : board.months;
  const values = axis === 'ver' ? board.byVersion[metric] : board.byMonth[metric];
  const nameOf = (k: string) => board.countries.find((c) => c.code === k)?.name ?? k;

  const yOf = (v: number) => (230 - ((Math.max(m.lo, Math.min(m.hi, v)) - m.lo) / (m.hi - m.lo)) * 220).toFixed(1);
  const xOf = (i: number) => (((i + 0.5) / xs.length) * 600).toFixed(1);

  const lines = selected.map((k, i) => {
    const series = values[k] ?? [];
    return {
      key: k,
      pts: series.map((v, j) => xOf(j) + ',' + yOf(v)).join(' '),
      color: LINE_STYLES[i].color,
      dash: LINE_STYLES[i].dash,
    };
  });

  const legend = selected.map((k, i) => {
    const series = values[k] ?? [];
    const last = series[series.length - 1] ?? 0;
    const prev = series[series.length - 2] ?? last;
    const first = series[0] ?? last;
    const d = last - prev;
    return {
      key: k,
      name: nameOf(k),
      color: LINE_STYLES[i].color,
      lineStyle: LINE_STYLES[i].dash ? 'dashed' : 'solid',
      last: fmtValue(last, m, t),
      delta: fmtDelta(d, m, t),
      good: isGood(d, m),
      note: `${axis === 'ver' ? t('较 v3.8') : t('较 12 个月前')} ${fmtDelta(last - first, m, t)}`,
    };
  });

  const ticks: string[] = [];
  for (let i = 0; i <= 4; i++) {
    const v = m.hi - ((m.hi - m.lo) * i) / 4;
    ticks.push(m.unit === '%' ? v.toFixed(0) + '%' : v.toFixed(0) + 's');
  }

  const title = `${t(m.label)} ${axis === 'ver' ? t('· 各版本') : t('· 近 12 个月')}`;

  return (
    <Card padded={false} aria-label={t('趋势')} className={s.block}>
      <div className={s.blockHead}>
        <h2 className={s.blockTitle}>{title}</h2>
        <span className={s.muted}>{m.better === 'up' ? t('越高越好') : t('越低越好')}</span>
      </div>
      {/* 图表坐标系固定从左到右，RTL 下也保持与横轴标签一致 */}
      <div className={s.chartRow} dir="ltr">
        <div className={`num ${s.yTicks}`} aria-hidden="true">
          {ticks.map((tk) => (
            <span key={tk}>{tk}</span>
          ))}
        </div>
        <div className={s.chartMain}>
          <svg viewBox="0 0 600 240" preserveAspectRatio="none" width="100%" height="240" role="img" aria-label={title}>
            {GRID_Y.map((y) => (
              <line key={y} x1="0" y1={y} x2="600" y2={y} className={s.gridLine} vectorEffect="non-scaling-stroke" />
            ))}
            <line x1="0" y1="230" x2="600" y2="230" className={s.axisLine} vectorEffect="non-scaling-stroke" />
            {lines.map((l) => (
              <polyline
                key={l.key}
                points={l.pts}
                fill="none"
                stroke={l.color}
                strokeWidth="2.4"
                strokeDasharray={l.dash || undefined}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <div className={`num ${s.xLabels}`} style={{ gridTemplateColumns: `repeat(${xs.length}, minmax(0, 1fr))` }}>
            {xs.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </div>
      </div>
      <div className={s.legendGrid}>
        {legend.map((l) => (
          <div key={l.key} className={s.legendCard}>
            <div className={s.legendHead}>
              <span className={s.legendSwatch} style={{ borderTop: `3px ${l.lineStyle} ${l.color}` }} aria-hidden="true" />
              <span className={s.strong}>{t(l.name)}</span>
            </div>
            <div className={`num ${s.legendValues}`}>
              <span className={s.legendLast}>{l.last}</span>
              <span style={{ color: l.good ? 'var(--green-ink)' : 'var(--red-ink)' }}>{l.delta}</span>
            </div>
            <div className={s.legendNote}>{l.note}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
