import type { MetricMeta } from './types';

type T = (s: string) => string;

/** 指标值：百分比 → 97.4%；时长 → 2.3 秒 */
export function fmtValue(v: number, m: MetricMeta, t: T): string {
  return m.unit === '%' ? v.toFixed(1) + '%' : `${v.toFixed(1)} ${t('秒')}`;
}

/** 变化量（带符号）：百分比 → +0.8 pp；时长 → -0.3 秒 */
export function fmtDelta(d: number, m: MetricMeta, t: T): string {
  return (d >= 0 ? '+' : '') + (m.unit === '%' ? d.toFixed(1) + ' pp' : `${d.toFixed(1)} ${t('秒')}`);
}

/** 变化方向是否向好 */
export function isGood(d: number, m: MetricMeta): boolean {
  return m.better === 'up' ? d >= 0 : d <= 0;
}
