/**
 * 翻译引擎。源语言为简体中文，词典以「中文原文 → 译文」存储（natural-language keys）。
 *
 * 查找顺序：
 * 1. 整串精确命中（去首尾空白、合并空白后匹配）
 * 2. 未命中时：日期 / 万·亿 数字规则 → 按词典最长优先做片段替换（动态拼接的字符串靠这一步）
 *    单字片段（如 张、页）只在两侧都不是汉字时替换，避免误伤人名、公司名
 * 3. 繁体：片段替换后再用字表把剩余简体字逐字转换
 *
 * 词典里没有的文字保持原样，`npm run i18n:check` 会列出代码里未入词典的 t('…')。
 */
import type { FullLang } from './languages';
import { LOCALE } from './languages';

export type Dict = Record<string, string>;
export interface CharMap {
  s: string;
  t: string;
}

const HAN = /[㐀-鿿]/;
const HAN_G = /[㐀-鿿]/g;
const MARK = '\u0001';
const PUNCT: Record<string, string> = {
  '，': ', ',
  '、': ', ',
  '。': '. ',
  '：': ': ',
  '；': '; ',
  '（': ' (',
  '）': ') ',
  '「': '“',
  '」': '”',
  '『': '“',
  '』': '”',
  '《': '“',
  '》': '”',
  '！': '! ',
  '？': '? ',
  '　': ' ',
  '～': '–',
};

export interface Translator {
  lang: FullLang;
  t: (source: string | number | null | undefined) => string;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function numCompact(n: number, lang: FullLang): string {
  try {
    return new Intl.NumberFormat(LOCALE[lang], { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  } catch {
    return String(n);
  }
}

function monthName(y: number, m: number, lang: FullLang): string {
  try {
    const d = new Date(Date.UTC(y || 2026, m - 1, 1));
    const opts: Intl.DateTimeFormatOptions = y
      ? { year: 'numeric', month: 'short', timeZone: 'UTC' }
      : { month: 'short', timeZone: 'UTC' };
    return new Intl.DateTimeFormat(LOCALE[lang], opts).format(d);
  } catch {
    return (y ? `${y}-` : '') + m;
  }
}

function applyRules(s: string, lang: FullLang): string {
  return s
    .replace(/(\d{4})\s?年\s?(\d{1,2})\s?月(?:\s?(\d{1,2})\s?日)?/g, (_a, y: string, m: string, d?: string) =>
      MARK +
      (d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : monthName(+y, +m, lang)) +
      MARK,
    )
    .replace(/(^|[^\d.])(\d{1,2})\s?月(?!份?度|\d)/g, (all, pre: string, m: string) =>
      +m >= 1 && +m <= 12 ? pre + MARK + monthName(0, +m, lang) + MARK : all,
    )
    .replace(/(\d+(?:\.\d+)?)\s?亿/g, (_a, n: string) => MARK + numCompact(parseFloat(n) * 1e8, lang) + MARK)
    .replace(/(\d+(?:\.\d+)?)\s?万/g, (_a, n: string) => MARK + numCompact(parseFloat(n) * 1e4, lang) + MARK);
}

function tidy(v: string, lang: FullLang): string {
  if (lang === 'zh-TW') return v.split(MARK).join('');
  return v
    .replace(/[，、。：；（）「」『』《》！？～\u3000]/g, (c) => PUNCT[c] ?? c)
    .split(MARK)
    .join(' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ([,.;:!?)\]%”])/g, '$1')
    .replace(/([([“]) /g, '$1')
    .trim();
}

export function createTranslator(lang: FullLang, dict: Dict | null, chars?: CharMap | null): Translator {
  if (lang === 'zh' || !dict) {
    return { lang, t: (s) => (s == null ? '' : String(s)) };
  }
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  const re = keys.length ? new RegExp(keys.map(escapeRe).join('|'), 'g') : null;
  const tw: Record<string, string> | null =
    lang === 'zh-TW' && chars ? Object.fromEntries([...chars.s].map((c, i) => [c, [...chars.t][i]])) : null;
  const cache = new Map<string, string>();

  const t = (input: string | number | null | undefined): string => {
    if (input == null) return '';
    const s = String(input);
    if (!HAN.test(s)) return s;
    const hit = cache.get(s);
    if (hit !== undefined) return hit;

    const lead = /^\s*/.exec(s)?.[0] ?? '';
    const trail = /\s*$/.exec(s)?.[0] ?? '';
    const k = s.replace(/\s+/g, ' ').trim();
    let v = dict[k];
    if (v === undefined) {
      v = lang === 'zh-TW' ? k : applyRules(k, lang);
      if (re) {
        v = v.replace(re, (m: string, off: number, str: string) => {
          if (m.length === 1 && (HAN.test(str[off - 1] ?? '') || HAN.test(str[off + 1] ?? ''))) return m;
          return MARK + dict[m] + MARK;
        });
      }
      v = tidy(v, lang);
      if (tw) v = v.replace(HAN_G, (c) => tw[c] ?? c);
    }
    // 「渠道：」这类以全角标点结尾的标签，译文补一个空格，避免与后面的值粘连（Channel:ERP）
    if (lang !== 'zh-TW' && /[：，；]$/.test(k) && /[:,;]$/.test(v) && !trail) v += ' ';
    const out = v === '' ? '' : lead + v + trail;
    cache.set(s, out);
    return out;
  };
  return { lang, t };
}
