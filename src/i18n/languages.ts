/** 界面语言。完整翻译：zh / zh-TW / en / es / ar；其余语言暂以英文词典展示（与设计稿 H5 采集页一致）。 */
export type FullLang = 'zh' | 'zh-TW' | 'en' | 'es' | 'ar';
export type LangCode =
  | FullLang
  | 'ja'
  | 'ko'
  | 'th'
  | 'vi'
  | 'id'
  | 'hi'
  | 'fr'
  | 'de'
  | 'pt'
  | 'it'
  | 'nl'
  | 'ru'
  | 'tr';

export interface LangInfo {
  code: LangCode;
  native: string;
  tag: string;
  rtl?: boolean;
}

export const LANGS: LangInfo[] = [
  { code: 'zh', native: '简体中文', tag: 'ZH' },
  { code: 'zh-TW', native: '繁體中文', tag: 'ZH-TW' },
  { code: 'en', native: 'English', tag: 'EN' },
  { code: 'ja', native: '日本語', tag: 'JA' },
  { code: 'ko', native: '한국어', tag: 'KO' },
  { code: 'th', native: 'ไทย', tag: 'TH' },
  { code: 'vi', native: 'Tiếng Việt', tag: 'VI' },
  { code: 'id', native: 'Bahasa Indonesia', tag: 'ID' },
  { code: 'hi', native: 'हिन्दी', tag: 'HI' },
  { code: 'fr', native: 'Français', tag: 'FR' },
  { code: 'de', native: 'Deutsch', tag: 'DE' },
  { code: 'es', native: 'Español', tag: 'ES' },
  { code: 'pt', native: 'Português', tag: 'PT' },
  { code: 'it', native: 'Italiano', tag: 'IT' },
  { code: 'nl', native: 'Nederlands', tag: 'NL' },
  { code: 'ru', native: 'Русский', tag: 'RU' },
  { code: 'tr', native: 'Türkçe', tag: 'TR' },
  { code: 'ar', native: 'العربية', tag: 'AR · RTL', rtl: true },
];

export const FULL_LANGS: FullLang[] = ['zh', 'zh-TW', 'en', 'es', 'ar'];

/** 实际使用的词典语言：未完整翻译的语言回落到英文 */
export function dictLang(code: LangCode): FullLang {
  return (FULL_LANGS as string[]).includes(code) ? (code as FullLang) : 'en';
}

export function isLang(v: unknown): v is LangCode {
  return typeof v === 'string' && LANGS.some((l) => l.code === v);
}

/** HTML lang 属性 / Intl 区域 */
export const LOCALE: Record<FullLang, string> = {
  zh: 'zh-CN',
  'zh-TW': 'zh-TW',
  en: 'en-US',
  es: 'es-ES',
  ar: 'ar',
};

/** 语言菜单本身的文案（菜单不经过词典，直接按目标语言显示） */
export const MENU_TEXT: Record<FullLang, { title: string; aria: string; count: string; note: string }> = {
  zh: {
    title: '界面语言',
    aria: '切换界面语言',
    count: '18 种语言 · 5 种完整翻译',
    note: '切换后所有页面都按所选语言展示。完整翻译：简体中文、繁體中文、English、Español、العربية；其余语言暂以英文展示。发票原件影像与票面原文保持原样。',
  },
  'zh-TW': {
    title: '介面語言',
    aria: '切換介面語言',
    count: '18 種語言 · 5 種完整翻譯',
    note: '切換後所有頁面都按所選語言顯示。完整翻譯：简体中文、繁體中文、English、Español、العربية；其餘語言暫以英文顯示。發票原件影像與票面原文保持原樣。',
  },
  en: {
    title: 'Interface language',
    aria: 'Change interface language',
    count: '18 languages · 5 fully translated',
    note: 'Every page follows the language you pick. Fully translated: Simplified Chinese, Traditional Chinese, English, Spanish and Arabic; other languages show English for now. Original invoice images and printed text stay as issued.',
  },
  es: {
    title: 'Idioma de la interfaz',
    aria: 'Cambiar idioma de la interfaz',
    count: '18 idiomas · 5 traducidos por completo',
    note: 'Todas las páginas siguen el idioma elegido. Traducidos por completo: chino simplificado, chino tradicional, inglés, español y árabe; los demás se muestran en inglés por ahora. Las imágenes y el texto original de las facturas no se modifican.',
  },
  ar: {
    title: 'لغة الواجهة',
    aria: 'تغيير لغة الواجهة',
    count: '18 لغة · 5 مترجمة بالكامل',
    note: 'تتبع جميع الصفحات اللغة التي تختارها. مترجمة بالكامل: الصينية المبسطة والتقليدية والإنجليزية والإسبانية والعربية؛ وتظهر بقية اللغات بالإنجليزية حاليًا. تبقى صور الفواتير الأصلية ونصوصها المطبوعة كما صدرت.',
  },
};

/** 部分翻译语言的菜单标题（其余文案用英文） */
export const MENU_TITLE_PARTIAL: Partial<Record<LangCode, string>> = {
  ja: '表示言語',
  ko: '표시 언어',
  th: 'ภาษาของอินเทอร์เฟซ',
  vi: 'Ngôn ngữ giao diện',
  id: 'Bahasa antarmuka',
  hi: 'इंटरफ़ेस भाषा',
  fr: 'Langue de l’interface',
  de: 'Oberflächensprache',
  pt: 'Idioma da interface',
  it: 'Lingua dell’interfaccia',
  nl: 'Interfacetaal',
  ru: 'Язык интерфейса',
  tr: 'Arayüz dili',
};
