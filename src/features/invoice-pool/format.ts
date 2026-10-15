import type { Tone } from '@/components/ui';
import type { DocLang, InvoiceStatus } from './types';

/** 按小数位四舍五入 */
export function rnd2(v: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}

/** 票面金额格式（与设计稿一致：币种符号 + en-US 千分位） */
export function fmtMoney(cc: { sym: string; dp: number }, v: number): string {
  return cc.sym + ' ' + Number(v).toLocaleString('en-US', { minimumFractionDigits: cc.dp, maximumFractionDigits: cc.dp });
}

/** 语言自称（不翻译） */
export const LANG_NAME: Record<DocLang, string> = {
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  vi: 'Tiếng Việt',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
};

/** 状态：中文标签、标签色调（navy 为本模块扩展色）、圆点色 CSS 变量 */
export const ST: Record<InvoiceStatus, { label: string; tone: Tone | 'navy' }> = {
  review: { label: '审核中', tone: 'orange' },
  posted: { label: '已入账', tone: 'blue' },
  paid: { label: '已付款', tone: 'navy' },
};
