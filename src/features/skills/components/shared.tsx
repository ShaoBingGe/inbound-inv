import { useCallback } from 'react';
import { Chip, type Tone } from '@/components/ui';
import { useI18n, useT } from '@/i18n';
import type { SkillFile, SkillStatus, SkillVersionStatus } from '../types';

export const STATUS_META: Record<SkillStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'orange', label: '草稿' },
  published: { tone: 'green', label: '已发布' },
  disabled: { tone: 'gray', label: '已停用' },
};

export const VERSION_STATUS_META: Record<SkillVersionStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'orange', label: '草稿' },
  published: { tone: 'green', label: '线上版本' },
  archived: { tone: 'gray', label: '历史版本' },
};

export function StatusChip({ status }: { status: SkillStatus }) {
  const t = useT();
  const m = STATUS_META[status];
  return <Chip tone={m.tone}>{t(m.label)}</Chip>;
}

export function VersionStatusChip({ status }: { status: SkillVersionStatus }) {
  const t = useT();
  const m = VERSION_STATUS_META[status];
  return <Chip tone={m.tone}>{t(m.label)}</Chip>;
}

export function AgentChips({ agents }: { agents: string[] }) {
  const t = useT();
  if (!agents.length) return <span style={{ color: 'var(--faint)' }}>{t('未绑定')}</span>;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
      {agents.map((a) => (
        <Chip key={a} tone="purple">
          {t(a)}
        </Chip>
      ))}
    </span>
  );
}

/** 日期时间：按界面语言格式化 ISO 时间 */
export function useFmtTime() {
  const { locale } = useI18n();
  return useCallback(
    (iso: string | undefined) => {
      if (!iso) return '—';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);
    },
    [locale],
  );
}

export function extOf(path: string): string {
  const name = path.split('/').pop() ?? path;
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function isMarkdown(path: string): boolean {
  const e = extOf(path);
  return e === 'md' || e === 'markdown';
}

const LANG_LABEL: Record<string, string> = {
  md: 'Markdown',
  markdown: 'Markdown',
  py: 'Python',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  sh: 'Shell',
  txt: 'Text',
  csv: 'CSV',
};
export function langOf(path: string): string {
  return LANG_LABEL[extOf(path)] ?? (extOf(path).toUpperCase() || 'Text');
}

export function sameFiles(a: SkillFile[], b: SkillFile[]): boolean {
  if (a.length !== b.length) return false;
  const m = new Map(b.map((f) => [f.path, f.content]));
  return a.every((f) => m.has(f.path) && m.get(f.path) === f.content);
}

/** 新文件的初始内容 */
export function templateFor(path: string): string {
  const name = path.split('/').pop() ?? path;
  switch (extOf(path)) {
    case 'md':
      return `# ${name.replace(/\.md$/i, '')}\n\n`;
    case 'json':
      return '{\n}\n';
    case 'py':
      return '"""说明"""\n';
    case 'ts':
    case 'js':
      return '/** 说明 */\n';
    default:
      return '';
  }
}

/** 文件排序：SKILL.md 在最前，其次根目录文件，再按路径 */
export function sortFiles(files: SkillFile[]): SkillFile[] {
  const rank = (p: string) => (p === 'SKILL.md' ? 0 : p.includes('/') ? 2 : 1);
  return [...files].sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path));
}
