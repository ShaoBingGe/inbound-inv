import { useDeferredValue } from 'react';
import { Segmented, Textarea } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { MarkdownView } from './FileViewer';
import s from './parts.module.css';

export type EditorLayout = 'split' | 'edit' | 'preview';

export function EditorLayoutSwitch({ value, onChange }: { value: EditorLayout; onChange: (v: EditorLayout) => void }) {
  const t = useT();
  return (
    <Segmented
      className={s.segSm}
      ariaLabel={t('编辑布局')}
      value={value}
      onChange={onChange}
      options={[
        { value: 'split', label: t('分栏') },
        { value: 'edit', label: t('仅编辑') },
        { value: 'preview', label: t('预览') },
      ]}
    />
  );
}

/** 文本编辑器；Markdown 文件带实时预览分栏 */
export function FileEditor({
  path,
  content,
  onChange,
  markdown,
  layout,
}: {
  path: string;
  content: string;
  onChange: (v: string) => void;
  markdown: boolean;
  layout: EditorLayout;
}) {
  const t = useT();
  const preview = useDeferredValue(content);
  const mode = markdown ? layout : 'edit';
  return (
    <div className={cx(s.editor, mode === 'split' && s.editorSplit)}>
      {mode !== 'preview' ? (
        <Textarea
          className={s.editorText}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          wrap="off"
          translate="no"
          aria-label={t('编辑') + ' ' + path}
          data-testid="skill-editor"
        />
      ) : null}
      {markdown && mode !== 'edit' ? (
        <div className={s.editorPreview} aria-label={t('预览')}>
          <div className={s.previewLabel}>{t('实时预览')}</div>
          <MarkdownView content={preview} />
        </div>
      ) : null}
    </div>
  );
}
