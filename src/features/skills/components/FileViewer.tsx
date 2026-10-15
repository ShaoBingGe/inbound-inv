import { useMemo, type CSSProperties } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useT } from '@/i18n';
import { parseFrontmatter } from '../frontmatter';
import { splitLines } from '../diff';
import { isMarkdown } from './shared';
import s from './parts.module.css';

/** frontmatter 的值：字符串原样显示，列表显示为标签，其他结构显示为 JSON */
export function FmValue({ value }: { value: unknown }) {
  if (Array.isArray(value))
    return (
      <span className={s.fmList}>
        {value.map((v, i) => (
          <code key={i} className={s.fmTag}>
            {typeof v === 'string' ? v : JSON.stringify(v)}
          </code>
        ))}
      </span>
    );
  if (value !== null && typeof value === 'object')
    return (
      <dl className={s.fmNested}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className={s.fmNestedRow}>
            <dt className="mono">{k}</dt>
            <dd>
              <FmValue value={v} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return <span>{value === undefined || value === null ? '—' : String(value)}</span>;
}

/** Markdown 渲染：SKILL.md 的 frontmatter 单独以表格显示，不进入 Markdown 正文 */
export function MarkdownView({ content }: { content: string }) {
  const t = useT();
  const fm = useMemo(() => parseFrontmatter(content), [content]);
  return (
    <div className={s.mdWrap} translate="no">
      {fm.present ? (
        <div className={s.fmBox}>
          {fm.data ? (
            <dl className={s.fmGrid}>
              {Object.entries(fm.data).map(([k, v]) => (
                <div key={k} className={s.fmRow}>
                  <dt className="mono">{k}</dt>
                  <dd>
                    <FmValue value={v} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className={s.fmErr} translate="yes">
              {t('frontmatter 不是合法的 YAML 映射')}
              {fm.error ? <code className="mono">{fm.error}</code> : null}
            </div>
          )}
        </div>
      ) : null}
      <div className={s.markdown}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{fm.body}</ReactMarkdown>
      </div>
    </div>
  );
}

/** 等宽代码视图（带行号） */
export function CodeView({ content }: { content: string }) {
  const lines = useMemo(() => {
    const l = splitLines(content);
    return l.length ? l : [''];
  }, [content]);
  const w = String(lines.length).length;
  return (
    <div className={s.code} translate="no" style={{ '--ln-w': `${w + 1}ch` } as CSSProperties}>
      <pre>
        {lines.map((line, i) => (
          <div key={i} className={s.codeLine}>
            <span className={s.ln} aria-hidden="true">
              {i + 1}
            </span>
            <code>{line === '' ? ' ' : line}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}

export function FileView({ path, content }: { path: string; content: string }) {
  return isMarkdown(path) ? <MarkdownView content={content} /> : <CodeView content={content} />;
}
