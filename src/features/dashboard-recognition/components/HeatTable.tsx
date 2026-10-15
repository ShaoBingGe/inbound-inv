import { Card, Table } from '@/components/ui';
import { useI18n, useT } from '@/i18n';
import { METRICS } from '../metrics';
import { fmtValue } from '../format';
import type { MetricKey, RecognitionBoard } from '../types';
import s from '../RecognitionDashboardPage.module.css';

/** 国家 × 模型版本 热力表：颜色越深越好，退化单元标红 */
export function HeatTable({ board, metric }: { board: RecognitionBoard; metric: MetricKey }) {
  const t = useT();
  const { locale } = useI18n();
  const m = METRICS[metric];
  const values = board.byVersion[metric];

  const all = board.countries.flatMap((c) => values[c.code] ?? []);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;

  return (
    <Card padded={false} aria-label={t('国家 × 版本')}>
      <div className={s.heatHead}>
        <h2 className={s.blockTitle}>
          {t('国家 × 模型版本 ·')} {t(m.label)}
        </h2>
        <span className={s.muted}>{t('颜色越深越好；括号内为相对上一版本的变化')}</span>
      </div>
      <div className={s.heatBody}>
        <Table className={s.heatTable}>
          <thead>
            <tr>
              <th>{t('国家')}</th>
              <th className={s.end}>{t('测试集规模')}</th>
              {board.versions.map((v) => (
                <th key={v} className={s.end}>
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {board.countries.map((c) => {
              const row = values[c.code] ?? [];
              return (
                <tr key={c.code}>
                  <td className={s.medium}>{t(c.name)}</td>
                  <td className={`num ${s.end} ${s.ink2}`}>
                    {c.testSetSize.toLocaleString(locale)} {t('张')}
                  </td>
                  {row.map((v, i) => {
                    const p = m.better === 'up' ? (v - lo) / span : (hi - v) / span;
                    const pv = i ? row[i - 1] : null;
                    const d = pv === null ? '' : '(' + (v - pv >= 0 ? '+' : '') + (v - pv).toFixed(1) + ')';
                    const bad = pv !== null && (m.better === 'up' ? v < pv - 0.05 : v > pv + 0.05);
                    const pct = Math.round((0.06 + p * 0.5) * 100);
                    return (
                      <td
                        key={board.versions[i] ?? i}
                        className={`num ${s.end}`}
                        style={{
                          background: bad ? 'var(--red-bg)' : `color-mix(in srgb, var(--accent) ${pct}%, transparent)`,
                          color: bad ? 'var(--red-ink)' : p > 0.7 ? 'var(--rb-heat-deep-ink)' : 'var(--ink)',
                        }}
                      >
                        {fmtValue(v, m, t)}
                        <span className={s.cellDelta}> {d}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
