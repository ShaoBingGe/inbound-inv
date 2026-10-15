import { Section, Segmented } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { psiLevel } from '../logic';
import type { CountryProfile, Distribution } from '../types';
import s from '../DataRulesPage.module.css';

export type DistView = 'before' | 'after';

function axisLabel(i: number): string {
  if (i % 2 !== 0) return '';
  const lo = Math.pow(10, i * 0.5);
  return lo >= 1e6 ? lo / 1e6 + 'M' : lo >= 1e3 ? lo / 1e3 + 'k' : String(lo);
}

/** 金额分布直方图 + 目标正态曲线（手绘 SVG） */
function DistributionChart({ dist }: { dist: Distribution }) {
  const t = useT();
  const mx = Math.max(...dist.actual, ...dist.expected);
  const curve = dist.expected.map((v, i) => `${5 + i * 10},${(170 - (v / mx) * 150).toFixed(1)}`).join(' ');
  return (
    <div className={s.chart}>
      <div className={s.plot}>
        <div className={s.bars}>
          {dist.actual.map((v, i) => {
            const e = dist.expected[i];
            const dev = Math.abs(v - e) / Math.max(e, 0.01);
            const lo = Math.pow(10, i * 0.5);
            const tip = t(
              '区间 ' +
                Math.round(lo) +
                '–' +
                Math.round(lo * 3.16) +
                ' · ' +
                (v * 100).toFixed(1) +
                '%（目标 ' +
                (e * 100).toFixed(1) +
                '%）',
            );
            return (
              <span
                key={i}
                className={s.bar}
                title={tip}
                style={{
                  height: `${((v / mx) * 150).toFixed(1)}px`,
                  background: dev > 0.3 && v > 0.01 ? 'var(--chart-3)' : 'var(--blue-mid)',
                }}
              />
            );
          })}
        </div>
        <svg viewBox="0 0 140 170" preserveAspectRatio="none" width="100%" height="170" className={s.curve} aria-hidden="true">
          <polyline
            points={curve}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="1.6"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className={cx('num', s.axis)} aria-hidden="true">
        {dist.actual.map((_, i) => (
          <span key={i}>{axisLabel(i)}</span>
        ))}
      </div>
    </div>
  );
}

/** 分布均衡检查 */
export function DistributionPanel({
  country,
  cap,
  view,
  onView,
  dist,
}: {
  country: CountryProfile;
  cap: number;
  view: DistView;
  onView: (v: DistView) => void;
  dist: Distribution;
}) {
  const t = useT();
  const psiCls = { ok: s.ok, warn: s.warn, bad: s.bad }[psiLevel(dist.psi)];
  const stats = [
    { k: 'PSI（与目标）', v: dist.psi.toFixed(3), rule: '< 0.10 合格', cls: psiCls },
    { k: 'KS 距离', v: dist.ks.toFixed(3), rule: '< 0.08 合格', cls: dist.ks < 0.08 ? s.ok : s.bad },
    { k: '偏度', v: dist.skew.toFixed(2), rule: '|偏度| < 0.5', cls: Math.abs(dist.skew) < 0.5 ? s.ok : s.bad },
    { k: '超额峰度', v: dist.kurt.toFixed(2), rule: '|峰度| < 1.0', cls: Math.abs(dist.kurt) < 1 ? s.ok : s.bad },
  ];
  const ok = dist.psi < 0.1 && dist.ks < 0.08;
  const verdict =
    view === 'before'
      ? {
          text:
            '未设上限时，高频修正样本（集中在少数供应商与金额区间）占 ' +
            Math.round(country.flood * 100) +
            '%，分布明显偏离目标；分布均衡 Agent 会按上限 ' +
            cap +
            '% 重采样。',
          good: false,
        }
      : ok
        ? { text: '按上限 ' + cap + '% 均衡后分布与目标一致，可进入标注质检。', good: true }
        : {
            text: '当前上限下仍偏离目标：建议把回流占比上限降到 ' + Math.max(5, cap - 10) + '%，或补充随机抽样样本。',
            good: false,
          };

  return (
    <Section
      className={s.colDist}
      title={t('分布均衡检查')}
      desc={t('按金额（log₁₀ 折算 CNY）对比目标正态分布')}
    >
      <Segmented<DistView>
        className={s.segRow}
        ariaLabel={t('分布均衡检查')}
        value={view}
        onChange={onView}
        options={[
          { value: 'before', label: t('均衡前（原始回流）') },
          { value: 'after', label: t('均衡后') },
        ]}
      />
      <DistributionChart dist={dist} />
      <div className={s.legend}>
        <span className={s.legendItem}>
          <span className={cx(s.swatch, s.swatch10)} style={{ background: 'var(--blue-mid)' }} aria-hidden="true" />
          {t('当前样本')}
        </span>
        <span className={s.legendItem}>
          <span className={cx(s.swatch, s.swatch10)} style={{ background: 'var(--chart-3)' }} aria-hidden="true" />
          {t('偏离目标 > 30%')}
        </span>
        <span className={s.legendItem}>
          <span className={s.dashSwatch} aria-hidden="true" />
          {t('目标正态 N(μ=')}
          {country.mu}, σ={country.sigma})
        </span>
      </div>
      <div className={s.statsGrid}>
        {stats.map((x) => (
          <div key={x.k} className={s.statBox}>
            <div className="kick">{t(x.k)}</div>
            <div className={cx('num', s.statVal, x.cls)}>{x.v}</div>
            <div className={s.statRule}>{t(x.rule)}</div>
          </div>
        ))}
      </div>
      <div className={cx('kick', s.subKick)}>{t('票种覆盖（当前 / 目标）')}</div>
      {country.types.map((v) => (
        <div key={v.label} className={s.covRow}>
          <span>{t(v.label)}</span>
          <div className={s.covTrack}>
            <div
              className={s.covFill}
              style={{ width: `${v.cur}%`, background: Math.abs(v.cur - v.tgt) > 4 ? 'var(--chart-3)' : 'var(--accent)' }}
            />
            <span className={s.covMark} style={{ insetInlineStart: `${v.tgt}%` }} aria-hidden="true" />
          </div>
          <span className={cx('num', s.covNum)}>
            {v.cur}% / {v.tgt}%
          </span>
        </div>
      ))}
      <div className={cx(s.verdict, verdict.good ? s.verdictOk : s.verdictWarn)} role="status">
        {t(verdict.text)}
      </div>
    </Section>
  );
}
