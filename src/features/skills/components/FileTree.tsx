import { useMemo, useState } from 'react';
import { Button, Icon } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { fileSize, formatBytes, SKILL_MD } from '../frontmatter';
import type { SkillFile } from '../types';
import { extOf, sortFiles } from './shared';
import s from './parts.module.css';

interface Dir {
  name: string;
  path: string;
  dirs: Dir[];
  files: SkillFile[];
}

function buildTree(files: SkillFile[]): Dir {
  const root: Dir = { name: '', path: '', dirs: [], files: [] };
  for (const f of sortFiles(files)) {
    const segs = f.path.split('/');
    let cur = root;
    for (let i = 0; i < segs.length - 1; i++) {
      const p = segs.slice(0, i + 1).join('/');
      let d = cur.dirs.find((x) => x.path === p);
      if (!d) {
        d = { name: segs[i], path: p, dirs: [], files: [] };
        cur.dirs.push(d);
        cur.dirs.sort((a, b) => a.name.localeCompare(b.name));
      }
      cur = d;
    }
    cur.files.push(f);
  }
  return root;
}

export interface FileTreeProps {
  files: SkillFile[];
  selected: string;
  onSelect: (path: string) => void;
  editing: boolean;
  /** 相对上次保存有改动 / 新增的文件 */
  changed: Set<string>;
  added: Set<string>;
  deletedCount: number;
  onAdd: () => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
}

export function FileTree({
  files,
  selected,
  onSelect,
  editing,
  changed,
  added,
  deletedCount,
  onAdd,
  onRename,
  onDelete,
}: FileTreeProps) {
  const t = useT();
  const tree = useMemo(() => buildTree(files), [files]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggle = (p: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  const renderFile = (f: SkillFile, depth: number) => {
    const name = f.path.split('/').pop() ?? f.path;
    const isSel = f.path === selected;
    const ext = extOf(f.path);
    const mark = added.has(f.path) ? 'added' : changed.has(f.path) ? 'changed' : null;
    return (
      <li key={f.path}>
        <div className={cx(s.treeRow, isSel && s.treeRowSel)} style={{ paddingInlineStart: 8 + depth * 14 }}>
          <button
            type="button"
            className={s.treeBtn}
            onClick={() => onSelect(f.path)}
            aria-current={isSel ? 'true' : undefined}
            title={f.path}
          >
            <Icon name={ext === 'md' ? 'file' : 'code'} size={14} />
            <span className={cx('mono', s.treeName)} translate="no">
              {name}
            </span>
            {mark ? (
              <span className={cx(s.treeMark, mark === 'added' && s.treeMarkAdd)} title={mark === 'added' ? t('新增') : t('已修改')}>
                {mark === 'added' ? 'A' : 'M'}
                <span className="sr-only">{mark === 'added' ? t('新增') : t('已修改')}</span>
              </span>
            ) : null}
            <span className={cx(s.treeSize, 'num')}>{formatBytes(fileSize(f))}</span>
          </button>
          {editing && isSel && f.path !== SKILL_MD ? (
            <span className={s.treeOps}>
              <button type="button" className={s.iconBtn} onClick={() => onRename(f.path)} aria-label={t('重命名') + ' ' + f.path} title={t('重命名')}>
                <Icon name="edit" size={13} />
              </button>
              <button type="button" className={s.iconBtn} onClick={() => onDelete(f.path)} aria-label={t('删除') + ' ' + f.path} title={t('删除')}>
                <Icon name="trash" size={13} />
              </button>
            </span>
          ) : null}
        </div>
      </li>
    );
  };

  const renderDir = (d: Dir, depth: number) => {
    const open = !collapsed.has(d.path);
    return (
      <li key={'d:' + d.path}>
        <button
          type="button"
          className={s.treeDir}
          style={{ paddingInlineStart: 8 + depth * 14 }}
          onClick={() => toggle(d.path)}
          aria-expanded={open}
        >
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={13} />
          <Icon name="folder" size={14} />
          <span className="mono" translate="no">
            {d.name}
          </span>
          <span className={s.treeCount}>{d.files.length + d.dirs.length}</span>
        </button>
        {open ? <ul className={s.treeList}>{renderLevel(d, depth + 1)}</ul> : null}
      </li>
    );
  };

  const renderLevel = (d: Dir, depth: number) => [...d.files.map((f) => renderFile(f, depth)), ...d.dirs.map((x) => renderDir(x, depth))];

  return (
    <nav className={s.tree} aria-label={t('文件')}>
      <div className={s.treeHead}>
        <span className={s.panelTitle}>{t('文件')}</span>
        <span className={s.treeCount}>{files.length}</span>
        {editing ? (
          <Button size="sm" icon={<Icon name="plus" size={14} />} onClick={onAdd} className={s.treeAdd}>
            {t('新建文件')}
          </Button>
        ) : null}
      </div>
      <ul className={s.treeList}>{renderLevel(tree, 0)}</ul>
      {editing && deletedCount > 0 ? (
        <div className={s.treeFoot}>{t('已删除 ' + deletedCount + ' 个文件（保存草稿后生效）')}</div>
      ) : null}
      {editing ? <div className={s.treeFoot}>{t('支持 references/、scripts/、assets/ 等子目录；路径必须是相对路径。')}</div> : null}
    </nav>
  );
}
