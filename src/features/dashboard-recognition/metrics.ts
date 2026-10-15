import type { MetricKey, MetricMeta } from './types';

/** 指标定义（展示配置：名称、单位、好坏方向、纵轴范围） */
export const METRICS: Record<MetricKey, MetricMeta> = {
  acc: { key: 'acc', label: '字段准确率', unit: '%', better: 'up', lo: 85, hi: 100 },
  full: { key: 'full', label: '票级全对率', unit: '%', better: 'up', lo: 40, hi: 100 },
  dur: { key: 'dur', label: '平均识别时长', unit: ' 秒', better: 'down', lo: 0, hi: 12 },
  tout: { key: 'tout', label: '超时率（> 30 秒）', unit: '%', better: 'down', lo: 0, hi: 4 },
};
export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

/** 默认选中的国家 */
export const DEFAULT_SELECTED = ['JP', 'US', 'VN', 'CN'];
/** 最多同时对比的国家数 */
export const MAX_SELECTED = 5;

/** 折线颜色 + 虚线样式（按选中顺序分配；颜色变量定义在页面 CSS 模块） */
export const LINE_STYLES: Array<{ color: string; dash: string }> = [
  { color: 'var(--rb-line-1)', dash: '' },
  { color: 'var(--rb-line-2)', dash: '' },
  { color: 'var(--rb-line-3)', dash: '6 4' },
  { color: 'var(--rb-line-4)', dash: '6 4' },
  { color: 'var(--rb-line-5)', dash: '2 3' },
];
