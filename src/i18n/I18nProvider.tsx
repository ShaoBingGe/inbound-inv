import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { config } from '@/config/runtime';
import { createTranslator, type CharMap, type Dict, type Translator } from './engine';
import { dictLang, isLang, LANGS, LOCALE, type FullLang, type LangCode } from './languages';

/** 与设计稿原型共用同一个存储键：切换一次，所有页面、所有标签页同步 */
export const LANG_STORAGE_KEY = 'inboundHub.uiLang';

const loaders: Record<Exclude<FullLang, 'zh'>, () => Promise<{ default: Dict }>> = {
  en: () => import('./locales/en.json'),
  'zh-TW': () => import('./locales/zh-TW.json'),
  es: () => import('./locales/es.json'),
  ar: () => import('./locales/ar.json'),
};
const loadChars = () => import('./locales/zh-TW.chars.json') as Promise<{ default: CharMap }>;

const dictCache = new Map<FullLang, Translator>();

async function loadTranslator(lang: FullLang): Promise<Translator> {
  const cached = dictCache.get(lang);
  if (cached) return cached;
  if (lang === 'zh') {
    const tr = createTranslator('zh', null);
    dictCache.set(lang, tr);
    return tr;
  }
  const [{ default: dict }, chars] = await Promise.all([
    loaders[lang](),
    lang === 'zh-TW' ? loadChars().then((m) => m.default) : Promise.resolve(null),
  ]);
  const tr = createTranslator(lang, dict, chars);
  dictCache.set(lang, tr);
  return tr;
}

function readStored(): LangCode | null {
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

function writeStored(v: LangCode) {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, v);
  } catch {
    /* 隐私模式等场景下存储不可用：仅本页生效 */
  }
}

function initialLang(): LangCode {
  const stored = typeof window !== 'undefined' ? readStored() : null;
  if (stored) return stored;
  if (isLang(config.defaultLang)) return config.defaultLang;
  return 'zh';
}

export interface I18nValue {
  /** 用户选择的界面语言（可能是部分翻译语言，如 ja） */
  lang: LangCode;
  /** 实际词典语言 */
  dict: FullLang;
  locale: string;
  dir: 'ltr' | 'rtl';
  ready: boolean;
  setLang: (l: LangCode) => void;
  /** 翻译：传入设计稿中的简体中文原文（或其拼接结果） */
  t: (s: string | number | null | undefined) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children, initial }: { children: ReactNode; initial?: LangCode }) {
  const [lang, setLangState] = useState<LangCode>(initial ?? initialLang);
  const dl = dictLang(lang);
  const [translator, setTranslator] = useState<Translator>(
    () => dictCache.get(dl) ?? createTranslator('zh', null),
  );

  useEffect(() => {
    let alive = true;
    loadTranslator(dl).then((tr) => {
      if (alive) setTranslator(tr);
    });
    return () => {
      alive = false;
    };
  }, [dl]);

  // 其他标签页切换语言时同步
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LANG_STORAGE_KEY && isLang(e.newValue)) setLangState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const info = LANGS.find((l) => l.code === lang);
  const dir: 'ltr' | 'rtl' = info?.rtl ? 'rtl' : 'ltr';

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('lang', LOCALE[dl]);
    el.setAttribute('dir', dir);
  }, [dl, dir]);

  const setLang = useCallback((l: LangCode) => {
    writeStored(l);
    setLangState(l);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dict: dl,
      locale: LOCALE[dl],
      dir,
      ready: translator.lang === dl,
      setLang,
      t: translator.lang === dl ? translator.t : (s) => (s == null ? '' : String(s)),
    }),
    [lang, dl, dir, translator, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const v = useContext(I18nContext);
  if (!v) throw new Error('useI18n must be used inside <I18nProvider>');
  return v;
}

/** 最常用：const t = useT(); t('全球统一看板') */
export function useT() {
  return useI18n().t;
}
