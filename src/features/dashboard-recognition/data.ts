/** 识别效果看板 · 示例数据（mock，与设计稿一致的确定性生成） */
import { hs, rng } from '@/lib/sample';
import type { MetricKey, MetricValues, ModelRelease, RecognitionBoard } from './types';

export const VERS = ['v3.8', 'v3.9', 'v4.0', 'v4.1', 'v4.2-rc1'];
export const MONTHS = ['25-11', '25-12', '26-01', '26-02', '26-03', '26-04', '26-05', '26-06', '26-07', '26-08', '26-09', '26-10'];

/** 各国冻结测试集与各版本字段准确率 */
const CTRY: Record<string, { name: string; size: number; acc: number[] }> = {
  CN: { name: '中国大陆', size: 1800, acc: [97.9, 98.4, 98.8, 99.2, 99.3] },
  JP: { name: '日本', size: 1200, acc: [93.1, 94.0, 95.4, 96.6, 97.4] },
  DE: { name: '德国', size: 900, acc: [93.8, 94.6, 95.2, 95.9, 96.3] },
  US: { name: '美国', size: 1000, acc: [90.4, 91.6, 92.4, 93.0, 92.6] },
  VN: { name: '越南', size: 600, acc: [86.2, 88.0, 90.1, 91.6, 93.8] },
  MX: { name: '墨西哥', size: 450, acc: [96.0, 96.9, 97.5, 98.1, 98.3] },
  SA: { name: '沙特阿拉伯', size: 300, acc: [92.2, 93.9, 95.8, 97.0, 97.2] },
  BR: { name: '巴西', size: 300, acc: [95.4, 96.3, 97.1, 97.8, 98.0] },
};
const KEYS = Object.keys(CTRY);

/** 由字段准确率推导其他指标 */
const DERIVE: Record<MetricKey, (a: number, k: string) => number> = {
  acc: (a) => a,
  full: (a) => Math.max(0, 100 - (100 - a) * 7.2),
  dur: (a, k) => (k === 'CN' ? 0.4 : 1) * (1.2 + (100 - a) * 0.75),
  tout: (a) => Math.max(0.05, (100 - a) * 0.28),
};
const METRIC_KEYS = Object.keys(DERIVE) as MetricKey[];

const RELEASES: ModelRelease[] = [
  {
    version: 'v4.2-rc1',
    releasedAt: '2026-10-10',
    note: '加入日本手写追记与越南声调困难集；美国 Sales tax 拆分仍退化，暂不在美国灰度',
    trainingSamples: 64200,
    feedbackSamples: 14850,
  },
  {
    version: 'v4.1',
    releasedAt: '2026-07-22',
    note: '多页 PDF 版面分析重写，超时率下降；新增沙特阿英混排',
    trainingSamples: 58900,
    feedbackSamples: 11020,
  },
  {
    version: 'v4.0',
    releasedAt: '2026-04-08',
    note: '统一多语种骨干模型；各国字段头按国家模式微调',
    trainingSamples: 52400,
    feedbackSamples: 8310,
  },
  { version: 'v3.9', releasedAt: '2026-01-15', note: '税局真值回流上线，回流占比上限 25%', trainingSamples: 44100, feedbackSamples: 4980 },
  { version: 'v3.8', releasedAt: '2025-11-03', note: '基线版本', trainingSamples: 39700, feedbackSamples: 0 },
];

function versionSeries(k: string, metric: MetricKey): number[] {
  return CTRY[k].acc.map((a) => DERIVE[metric](a, k));
}

/** 近 12 个月线上版本：在版本准确率之间插值并加确定性抖动 */
function monthSeries(k: string, metric: MetricKey): number[] {
  const c = CTRY[k];
  const r = rng(hs(k + metric));
  return MONTHS.map((_, i) => {
    const pos = (i / 11) * 3;
    const lo = Math.floor(pos);
    const t = pos - lo;
    const a = c.acc[lo] + (c.acc[Math.min(3, lo + 1)] - c.acc[lo]) * t + (-0.35 + 0.7 * r());
    return DERIVE[metric](a, k);
  });
}

function buildValues(fn: (k: string, m: MetricKey) => number[]): MetricValues {
  const out = {} as MetricValues;
  for (const m of METRIC_KEYS) {
    const per: Record<string, number[]> = {};
    for (const k of KEYS) per[k] = fn(k, m);
    out[m] = per;
  }
  return out;
}

export function buildRecognitionBoard(): RecognitionBoard {
  return {
    versions: VERS.slice(),
    months: MONTHS.slice(),
    countries: KEYS.map((code) => ({ code, name: CTRY[code].name, testSetSize: CTRY[code].size })),
    byVersion: buildValues(versionSeries),
    byMonth: buildValues(monthSeries),
    releases: RELEASES.map((r) => ({ ...r })),
  };
}
