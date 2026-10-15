import { useEffect, useState, type ReactNode } from 'react';
import { Button, Field, Input, Modal, Textarea } from '@/components/ui';
import { useT } from '@/i18n';
import { validatePath } from '../frontmatter';
import type { Skill, SkillConflictError } from '../types';
import { AgentChips } from './shared';
import s from './parts.module.css';

/** 通用确认框 */
export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
  cancelLabel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width={460}
      footer={
        <>
          <Button onClick={onCancel} disabled={busy}>
            {cancelLabel ?? t('取消')}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={s.confirmBody}>{children}</div>
    </Modal>
  );
}

/** 新建 / 重命名文件 */
export function FileDialog({
  open,
  mode,
  initial,
  existing,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  mode: 'add' | 'rename';
  initial: string;
  /** 已存在的路径（重命名时不含自身） */
  existing: string[];
  onSubmit: (path: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [path, setPath] = useState(initial);
  useEffect(() => {
    if (open) setPath(initial);
  }, [open, initial]);

  const p = path.trim();
  const issues = validatePath(p);
  const dup = existing.includes(p);
  const reserved = p === 'SKILL.md';
  const error = issues[0] ? t(issues[0].message) : dup || reserved ? t('已存在同名文件') : undefined;
  const ok = !error && (mode === 'add' || p !== initial);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === 'add' ? t('新建文件') : t('重命名文件')}
      width={520}
      footer={
        <>
          <Button onClick={onCancel}>{t('取消')}</Button>
          <Button variant="primary" disabled={!ok} onClick={() => onSubmit(p)}>
            {mode === 'add' ? t('新建') : t('重命名')}
          </Button>
        </>
      }
    >
      <Field label={t('文件路径')} hint={t('相对 Skill 根目录，例如 references/country-rules.md、scripts/check.py、assets/schema.json')} error={p ? error : undefined}>
        {(id) => (
          <Input
            id={id}
            className="mono"
            value={path}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            invalid={!!p && !!error}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && ok) onSubmit(p);
            }}
          />
        )}
      </Field>
    </Modal>
  );
}

/** 发布：填写变更说明 */
export function PublishModal({
  open,
  skill,
  dirty,
  errorCount,
  busy,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  skill: Skill;
  dirty: boolean;
  errorCount: number;
  busy: boolean;
  onSubmit: (note: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open) setNote('');
  }, [open]);
  const n = note.trim();
  const blocked = errorCount > 0;
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onCancel}
      title={t('发布 Skill')}
      width={560}
      footer={
        <>
          <Button onClick={onCancel} disabled={busy}>
            {t('取消')}
          </Button>
          <Button variant="primary" disabled={busy || blocked || !n} onClick={() => onSubmit(n)}>
            {busy ? t('发布中…') : dirty ? t('保存并发布') : t('发布')}
          </Button>
        </>
      }
    >
      <div className={s.form}>
        <dl className={s.kv}>
          <div className={s.kvRow}>
            <dt>{t('Skill')}</dt>
            <dd className="mono" translate="no">
              {skill.name}
            </dd>
          </div>
          <div className={s.kvRow}>
            <dt>{t('线上版本')}</dt>
            <dd className="mono num">{skill.publishedVersion ?? '—'}</dd>
          </div>
          <div className={s.kvRow}>
            <dt>{t('下发到')}</dt>
            <dd>
              <AgentChips agents={skill.agents} />
            </dd>
          </div>
        </dl>
        {dirty ? <div className={s.note}>{t('有未保存的修改，将先保存为草稿再发布。')}</div> : null}
        {skill.status === 'disabled' ? <div className={s.note}>{t('此 Skill 已停用：发布会生成新版本，但启用后才会下发到 agent。')}</div> : null}
        {blocked ? (
          <div className={s.formError} role="alert">
            {t('还有 ' + errorCount + ' 个校验错误，修正后才能发布。')}
          </div>
        ) : null}
        <Field label={t('变更说明')} hint={t('写清楚改了什么、为什么改，会显示在版本历史中')}>
          {(id) => (
            <Textarea
              id={id}
              rows={4}
              value={note}
              maxLength={500}
              autoFocus
              placeholder={t('例如：JP 和历日期换算；金额改动超过 1% 一律转人工')}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
        <div className={s.metaMuted}>{t('发布后生成新版本，平台按绑定关系下发到 agent；线上 agent 在下一次任务开始时加载新版本。')}</div>
      </div>
    </Modal>
  );
}

/** 保存草稿时版本冲突 */
export function ConflictModal({
  conflict,
  onKeep,
  onReload,
}: {
  conflict: SkillConflictError | null;
  onKeep: () => void;
  onReload: () => void;
}) {
  const t = useT();
  return (
    <Modal
      open={!!conflict}
      onClose={onKeep}
      title={t('保存失败：版本冲突')}
      width={520}
      footer={
        <>
          <Button onClick={onKeep}>{t('继续编辑')}</Button>
          <Button variant="danger" onClick={onReload}>
            {t('加载最新版本（放弃我的修改）')}
          </Button>
        </>
      }
    >
      {conflict ? (
        <div className={s.confirmBody}>
          <p>
            {t('你打开编辑后，平台上已有更新的版本，为避免覆盖他人的修改，本次保存没有生效。')}
          </p>
          <dl className={s.kv}>
            <div className={s.kvRow}>
              <dt>{t('你基于的版本')}</dt>
              <dd className="mono num">{conflict.baseVersion}</dd>
            </div>
            <div className={s.kvRow}>
              <dt>{t('平台最新版本')}</dt>
              <dd className="mono num">
                {conflict.latestVersion ?? '—'}
                {conflict.latestBy ? (
                  <span translate="no" style={{ fontFamily: 'var(--font-sans)' }}>
                    {' · '}
                    {conflict.latestBy}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
          <p>{t('建议先复制你的修改，加载最新版本后再合并，或在版本历史中对比两个版本。')}</p>
        </div>
      ) : null}
    </Modal>
  );
}
