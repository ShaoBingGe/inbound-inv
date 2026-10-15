import type { LocalCurrency } from './types';

/** CNY 万 → 「x 万 / x.xx 亿」（中文原文，显示时交给 t()，引擎按万·亿规则换算） */
export function fmtW(w: number): string {
  return w >= 10000 ? (w / 10000).toFixed(2) + ' 亿' : w.toFixed(0) + ' 万';
}

/** 按视角币种显示金额：全球为 CNY 万/亿，单国折算本币 */
export function fmtLoc(w: number, cur: LocalCurrency | null): string {
  if (!cur) return 'CNY ' + fmtW(w);
  return cur.symbol + ' ' + (w * 10000 * cur.scale).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** 同比箭头（符号依据 signOf，与设计稿一致） */
export function fmtDelta(value: number, signOf: number = value): string {
  return (signOf >= 0 ? '▲ +' : '▼ ') + value.toFixed(1) + '%';
}

export function fmtCount(n: number): string {
  return n.toLocaleString('zh-CN');
}
