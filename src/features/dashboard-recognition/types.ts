/** 识别效果看板 · 领域类型 */

export type MetricKey = 'acc' | 'full' | 'dur' | 'tout';
export type AxisKey = 'ver' | 'month';

export interface MetricMeta {
  key: MetricKey;
  /** 简体中文原文，显示时经 t() */
  label: string;
  /** '%' 或 ' 秒' */
  unit: '%' | ' 秒';
  better: 'up' | 'down';
  /** 纵轴下限 / 上限 */
  lo: number;
  hi: number;
}

export interface CountryEval {
  code: string;
  /** 简体中文原文，显示时经 t() */
  name: string;
  /** 冻结测试集规模（张） */
  testSetSize: number;
}

/** 指标值：values[metric][countryCode] = 各点数值 */
export type MetricValues = Record<MetricKey, Record<string, number[]>>;

export interface ModelRelease {
  version: string;
  releasedAt: string;
  /** 简体中文原文 */
  note: string;
  trainingSamples: number;
  feedbackSamples: number;
}

export interface RecognitionBoard {
  versions: string[];
  months: string[];
  countries: CountryEval[];
  /** 按模型版本（冻结测试集） */
  byVersion: MetricValues;
  /** 按月份（线上版本） */
  byMonth: MetricValues;
  releases: ModelRelease[];
}
