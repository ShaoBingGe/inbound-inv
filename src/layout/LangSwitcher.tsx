import { Icon, Popover } from '@/components/ui';
import { useI18n, LANGS } from '@/i18n';
import { MENU_TEXT, MENU_TITLE_PARTIAL } from '@/i18n/languages';
import { cx } from '@/lib/sample';
import s from './LangSwitcher.module.css';

/**
 * 全局语言切换。选择写入 localStorage，所有页面与标签页同步。
 * 菜单内文字按目标语言直接显示，不经过词典。
 */
export function LangSwitcher({ variant = 'light' }: { variant?: 'light' | 'dark' | 'compact' }) {
  const { lang, dict, setLang } = useI18n();
  const cur = LANGS.find((l) => l.code === lang) ?? LANGS[0];
  const text = MENU_TEXT[dict];
  const title = MENU_TITLE_PARTIAL[lang] ?? text.title;

  return (
    <div translate="no">
      <Popover
        width={variant === 'compact' ? 300 : 436}
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={`${text.aria} · ${cur.native}`}
            className={cx(s.trigger, open && s.open, variant === 'dark' && s.dark, variant === 'compact' && s.compact)}
          >
            <Icon name="globe" size={14} strokeWidth={1.5} />
            <span className={s.name}>{cur.native}</span>
            <Icon name="chevronDown" size={9} strokeWidth={2} />
          </button>
        )}
      >
        {({ close }) => (
          <div role="menu" aria-label={title} className={cx(s.menu, variant === 'compact' && s.menuCompact)}>
            <div className={s.head}>
              <span className={s.title}>{title}</span>
              <span className={s.count}>{text.count}</span>
            </div>
            <div className={s.grid}>
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={l.code === lang}
                  className={s.item}
                  onClick={() => {
                    setLang(l.code);
                    close();
                  }}
                >
                  <span className={s.native} lang={l.code}>
                    {l.native}
                  </span>
                  <span className={s.tag}>{l.tag}</span>
                </button>
              ))}
            </div>
            <div className={s.note}>{text.note}</div>
          </div>
        )}
      </Popover>
    </div>
  );
}
