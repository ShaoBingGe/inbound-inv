import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  ErrorState,
  Icon,
  PageBody,
  PageHeader,
  PageLoading,
  Select,
  useToast,
} from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/auth/AuthProvider';
import { hasRole } from '@/auth/types';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { useAsync } from '@/lib/useAsync';
import { getSkill, listSkills, publishSkill, saveDraft, setSkillStatus, SkillConflictError } from './api';
import { fileSize, formatBytes, hasErrors, parseFrontmatter, SKILL_MD, validateSkill } from './frontmatter';
import { ConfirmModal, ConflictModal, FileDialog, PublishModal } from './components/dialogs';
import { EditorLayoutSwitch, FileEditor, type EditorLayout } from './components/FileEditor';
import { FileTree } from './components/FileTree';
import { FileView } from './components/FileViewer';
import { MetaPanel } from './components/MetaPanel';
import { VersionDrawer } from './components/VersionDrawer';
import { isMarkdown, langOf, sameFiles, sortFiles, StatusChip, templateFor, useFmtTime } from './components/shared';
import type { Skill, SkillFile, SkillVersionDetail } from './types';
import s from './SkillDetailPage.module.css';

type Busy = null | 'save' | 'publish' | 'status';
type Confirm =
  | { kind: 'discard' }
  | { kind: 'delete'; path: string }
  | { kind: 'restore'; version: SkillVersionDetail }
  | { kind: 'disable' };

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function SkillDetailPage() {
  const { skillId = '' } = useParams<{ skillId: string }>();
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const fmt = useFmtTime();
  const { user } = useAuth();
  const canEdit = hasRole(user, ['skill_editor']);
  const [search] = useSearchParams();
  const wantEdit = search.get('edit') === '1';

  const { data: skill, error, loading, reload, setData } = useAsync(() => getSkill(skillId), [skillId]);
  const all = useAsync(() => listSkills({}), [skillId]);

  /* ---------- 工作副本 ---------- */
  const [files, setFiles] = useState<SkillFile[]>([]);
  const [saved, setSaved] = useState<SkillFile[]>([]);
  const [baseVersion, setBaseVersion] = useState('');
  const [loadedId, setLoadedId] = useState('');
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(SKILL_MD);
  const [layout, setLayout] = useState<EditorLayout>('split');
  const [busy, setBusy] = useState<Busy>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [fileDlg, setFileDlg] = useState<{ mode: 'add' | 'rename'; path: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conflict, setConflict] = useState<SkillConflictError | null>(null);
  /** 已确认离开（显式跳转时置位，避免路由拦截再问一次） */
  const allowLeave = useRef(false);

  // 载入 / 切换 Skill / 保存后：以服务端内容为准重置工作副本（同一版本的元数据更新不覆盖未保存修改）
  useEffect(() => {
    if (!skill) return;
    if (skill.id === loadedId && skill.version === baseVersion) return;
    const isNewSkill = skill.id !== loadedId;
    setFiles(sortFiles(skill.files));
    setSaved(sortFiles(skill.files));
    setBaseVersion(skill.version);
    setLoadedId(skill.id);
    if (isNewSkill) {
      setSelected(SKILL_MD);
      setEditing(wantEdit && canEdit);
      allowLeave.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill]);

  const dirty = useMemo(() => !sameFiles(files, saved), [files, saved]);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const { changed, added, deleted } = useMemo(() => {
    const before = new Map(saved.map((f) => [f.path, f.content]));
    const now = new Set(files.map((f) => f.path));
    return {
      changed: new Set(files.filter((f) => before.has(f.path) && before.get(f.path) !== f.content).map((f) => f.path)),
      added: new Set(files.filter((f) => !before.has(f.path)).map((f) => f.path)),
      deleted: saved.filter((f) => !now.has(f.path)).map((f) => f.path),
    };
  }, [files, saved]);

  const issues = useMemo(() => (skill ? validateSkill(files, { expectedName: skill.id }) : []), [files, skill]);
  const errorCount = issues.filter((i) => i.level === 'error').length;
  const skillMd = files.find((f) => f.path === SKILL_MD);
  const fm = useMemo(() => (skillMd ? parseFrontmatter(skillMd.content) : null), [skillMd]);

  const current = files.find((f) => f.path === selected) ?? files[0];
  useEffect(() => {
    if (files.length && !files.some((f) => f.path === selected)) setSelected(files[0].path);
  }, [files, selected]);

  /* ---------- 离开页面提示 ---------- */
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // 侧边菜单等其他应用内跳转：由路由拦截，弹出确认框
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
        dirtyRef.current && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname,
      [],
    ),
  );

  const leaveMsg = t('有未保存的修改，离开后这些修改将丢失。确定离开吗？');
  /** 页面内的显式跳转（返回列表、切换 Skill） */
  function confirmLeave(): boolean {
    if (!dirty) return true;
    if (!window.confirm(leaveMsg)) return false;
    allowLeave.current = true;
    return true;
  }
  function goSkill(id: string) {
    if (!id || id === skillId) return;
    if (!confirmLeave()) return;
    navigate(ROUTES.skillDetail(id));
  }

  /* ---------- 编辑操作 ---------- */
  function updateContent(v: string) {
    setFiles((fs) => fs.map((f) => (f.path === current?.path ? { path: f.path, content: v } : f)));
  }
  function startEdit() {
    setEditing(true);
  }
  function stopEdit() {
    if (dirty) setConfirm({ kind: 'discard' });
    else setEditing(false);
  }
  function discard() {
    setFiles(saved);
    setEditing(false);
    setConfirm(null);
    toast(t('已放弃未保存的修改'));
  }
  function addFile(path: string) {
    setFiles((fs) => sortFiles([...fs, { path, content: templateFor(path) }]));
    setSelected(path);
    setFileDlg(null);
  }
  function renameFile(from: string, to: string) {
    setFiles((fs) => sortFiles(fs.map((f) => (f.path === from ? { ...f, path: to } : f))));
    setSelected(to);
    setFileDlg(null);
  }
  function deleteFile(path: string) {
    setFiles((fs) => fs.filter((f) => f.path !== path));
    setSelected(SKILL_MD);
    setConfirm(null);
    toast(t('已删除 ' + path + '，保存草稿后生效'));
  }
  function applyRestore(v: SkillVersionDetail) {
    setFiles(sortFiles(v.files.map((f) => ({ path: f.path, content: f.content }))));
    setEditing(true);
    setSelected(SKILL_MD);
    setConfirm(null);
    setHistoryOpen(false);
    toast(t('已将 ' + v.version + ' 的内容载入编辑器，保存草稿后生效'));
  }
  function requestRestore(v: SkillVersionDetail) {
    if (dirty) setConfirm({ kind: 'restore', version: v });
    else applyRestore(v);
  }

  async function doSave(silent = false): Promise<Skill | null> {
    if (!skill) return null;
    setBusy('save');
    try {
      const next = await saveDraft(skill.id, files, baseVersion);
      setData(next);
      if (!silent) {
        toast(t('已保存草稿 ' + next.version));
        if (hasErrors(validateSkill(files, { expectedName: skill.id })))
          toast(t('草稿中还有校验错误，修正后才能发布'), { error: true, ms: 4000 });
      }
      return next;
    } catch (e) {
      if (e instanceof SkillConflictError) setConflict(e);
      else toast(t('保存失败') + '：' + t(errText(e)), { error: true });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function doPublish(note: string) {
    if (!skill) return;
    if (dirty) {
      const ok = await doSave(true);
      if (!ok) {
        setPublishing(false);
        return;
      }
    }
    setBusy('publish');
    try {
      const next = await publishSkill(skill.id, note);
      setData(next);
      setPublishing(false);
      setEditing(false);
      toast(t('已发布 ' + next.version + '，平台将按绑定关系下发到 agent'));
    } catch (e) {
      toast(t('发布失败') + '：' + t(errText(e)), { error: true });
    } finally {
      setBusy(null);
    }
  }

  async function doStatus(enable: boolean) {
    if (!skill) return;
    setBusy('status');
    try {
      const next = await setSkillStatus(skill.id, enable ? 'published' : 'disabled');
      setData(next);
      setConfirm(null);
      toast(enable ? t('已启用，绑定的 agent 将加载线上版本') : t('已停用，绑定的 agent 不再加载此 Skill'));
    } catch (e) {
      toast(t('操作失败') + '：' + t(errText(e)), { error: true });
    } finally {
      setBusy(null);
    }
  }

  /* ---------- 渲染 ---------- */
  if (loading && !skill) return <PageLoading />;
  if (error || !skill)
    return (
      <>
        <PageHeader crumb={`${t('设置')} / ${t('Skill 管理')}`} title={t('Skill 详情')} />
        <PageBody>
          <ErrorState error={error ?? new Error(t('Skill 不存在'))} onRetry={reload} />
          <div>
            <Link to={ROUTES.settingsSkills}>{t('返回 Skill 列表')}</Link>
          </div>
        </PageBody>
      </>
    );

  const canPublish = canEdit && (dirty || skill.hasDraft) && errorCount === 0;
  const publishTitle = !canEdit
    ? t('需要 skill_editor 角色')
    : errorCount > 0
      ? t('有校验错误，不能发布')
      : !dirty && !skill.hasDraft
        ? t('没有待发布的草稿')
        : undefined;
  const md = current ? isMarkdown(current.path) : false;
  const skillOptions = (all.data ?? []).map((x) => ({ value: x.id, label: x.name }));

  return (
    <>
      <PageHeader
        crumb={
          <>
            {t('设置')} /{' '}
            <Link
              to={ROUTES.settingsSkills}
              onClick={(e) => {
                if (!confirmLeave()) e.preventDefault();
              }}
            >
              {t('Skill 管理')}
            </Link>
          </>
        }
        title={
          <span className="mono" translate="no">
            {skill.name}
          </span>
        }
        badges={
          <div className={s.badges}>
            <StatusChip status={skill.status} />
            <Chip tone="blue" className="mono num" translate="no">
              {skill.version}
            </Chip>
            {skill.hasDraft && skill.publishedVersion ? <Chip tone="orange">{t('有未发布草稿')}</Chip> : null}
            {dirty ? <Chip tone="red">{t('未保存')}</Chip> : null}
          </div>
        }
        actions={
          <>
            {skillOptions.length > 1 ? (
              <Select aria-label={t('切换 Skill')} className="mono" value={skill.id} onChange={goSkill} options={skillOptions} />
            ) : null}
            <Button icon={<Icon name="history" />} onClick={() => setHistoryOpen(true)}>
              {t('版本历史')}
            </Button>
            {canEdit ? (
              skill.status === 'disabled' ? (
                <Button
                  onClick={() => void doStatus(true)}
                  disabled={busy !== null || !skill.publishedVersion}
                  title={!skill.publishedVersion ? t('尚未发布过的 Skill 不能启用') : undefined}
                >
                  {t('启用')}
                </Button>
              ) : (
                <Button
                  onClick={() => setConfirm({ kind: 'disable' })}
                  disabled={busy !== null || skill.status === 'draft'}
                  title={skill.status === 'draft' ? t('尚未发布，无需停用') : undefined}
                >
                  {t('停用')}
                </Button>
              )
            ) : null}
            {canEdit && !editing ? (
              <Button icon={<Icon name="edit" />} onClick={startEdit}>
                {t('编辑')}
              </Button>
            ) : null}
            {canEdit && editing ? (
              <>
                <Button onClick={stopEdit} disabled={busy !== null}>
                  {t('退出编辑')}
                </Button>
                <Button onClick={() => void doSave()} disabled={!dirty || busy !== null}>
                  {busy === 'save' ? t('保存中…') : t('保存草稿')}
                </Button>
              </>
            ) : null}
            {canEdit ? (
              <Button
                variant="primary"
                icon={<Icon name="upload" />}
                onClick={() => setPublishing(true)}
                disabled={!canPublish || busy !== null}
                title={publishTitle}
              >
                {t('发布')}
              </Button>
            ) : null}
          </>
        }
      />
      <PageBody>
        <div className={s.summary}>
          <p className={s.desc} translate="no">
            {skill.description}
          </p>
          <div className={s.summaryMeta}>
            <span>
              {t('负责人')} <b translate="no">{skill.owner}</b>
            </span>
            <span>
              {t('最近修改')} <b translate="no">{skill.updatedBy}</b> · <span className="num">{fmt(skill.updatedAt)}</span>
            </span>
          </div>
        </div>

        {!canEdit ? (
          <div className={cx(s.banner, s.bannerGray)} role="note">
            <Icon name="eye" />
            <span>{t('只读：编辑和发布 Skill 需要 skill_editor 或 admin 角色。')}</span>
          </div>
        ) : null}
        {skill.status === 'disabled' ? (
          <div className={cx(s.banner, s.bannerGray)} role="note">
            <Icon name="info" />
            <span>
              {t('已停用：绑定的 agent 不会加载此 Skill。')}
              {skill.statusNote ? <> {t(skill.statusNote)}</> : null}
            </span>
          </div>
        ) : null}
        {skill.hasDraft ? (
          <div className={cx(s.banner, s.bannerOrange)} role="note">
            <Icon name="warn" />
            <span>
              {skill.publishedVersion
                ? t('当前显示草稿 ' + skill.version + '，尚未发布；线上 agent 仍使用 ' + skill.publishedVersion + '。')
                : t('当前显示草稿 ' + skill.version + '，此 Skill 尚未发布，不会下发到任何 agent。')}
            </span>
          </div>
        ) : null}

        <div className={cx(s.layout, editing && s.layoutEditing)}>
          <Card padded={false} className={s.treeCard}>
            <FileTree
              files={files}
              selected={current?.path ?? ''}
              onSelect={setSelected}
              editing={editing}
              changed={changed}
              added={added}
              deletedCount={deleted.length}
              onAdd={() => setFileDlg({ mode: 'add', path: 'references/new-file.md' })}
              onRename={(p) => setFileDlg({ mode: 'rename', path: p })}
              onDelete={(p) => setConfirm({ kind: 'delete', path: p })}
            />
          </Card>

          <Card padded={false} className={s.center}>
            {current ? (
              <>
                <div className={s.fileBar}>
                  <Icon name={md ? 'file' : 'code'} />
                  <span className={cx('mono', s.filePath)} translate="no">
                    {current.path}
                  </span>
                  <span className={s.fileMeta}>
                    {langOf(current.path)} · <span className="num">{formatBytes(fileSize(current))}</span> ·{' '}
                    <span className="num">{t(current.content.split('\n').length + ' 行')}</span>
                  </span>
                  <div className={s.spacer} />
                  {editing && md ? <EditorLayoutSwitch value={layout} onChange={setLayout} /> : null}
                  {editing && issues.length ? (
                    <button
                      type="button"
                      className={s.issueBtn}
                      onClick={() => document.getElementById('skill-meta')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    >
                      <Chip tone={errorCount ? 'red' : 'orange'}>
                        <Icon name="warn" size={13} />
                        {errorCount ? t(errorCount + ' 个错误') : t(issues.length + ' 个提醒')}
                      </Chip>
                    </button>
                  ) : null}
                  {editing ? <Chip tone="blue">{t('编辑中')}</Chip> : null}
                </div>
                <div className={s.fileBody}>
                  {editing ? (
                    <FileEditor path={current.path} content={current.content} onChange={updateContent} markdown={md} layout={layout} />
                  ) : (
                    <FileView path={current.path} content={current.content} />
                  )}
                </div>
              </>
            ) : (
              <div className={s.emptyFile}>{t('没有文件')}</div>
            )}
          </Card>

          <Card padded={false} className={s.side} id="skill-meta">
            <MetaPanel
              skill={skill}
              files={files}
              fm={fm}
              issues={issues}
              canEdit={canEdit}
              onPickIssue={(p) => {
                if (files.some((f) => f.path === p)) setSelected(p);
              }}
            />
          </Card>
        </div>
      </PageBody>

      <VersionDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        skillId={skill.id}
        currentVersion={skill.version}
        canEdit={canEdit}
        onRestore={requestRestore}
      />

      <PublishModal
        open={publishing}
        skill={skill}
        dirty={dirty}
        errorCount={errorCount}
        busy={busy !== null}
        onSubmit={(note) => void doPublish(note)}
        onCancel={() => setPublishing(false)}
      />

      <FileDialog
        open={!!fileDlg}
        mode={fileDlg?.mode ?? 'add'}
        initial={fileDlg?.path ?? ''}
        existing={files.map((f) => f.path).filter((p) => p !== fileDlg?.path || fileDlg?.mode === 'add')}
        onCancel={() => setFileDlg(null)}
        onSubmit={(p) => (fileDlg?.mode === 'rename' ? renameFile(fileDlg.path, p) : addFile(p))}
      />

      <ConflictModal
        conflict={conflict}
        onKeep={() => setConflict(null)}
        onReload={() => {
          setConflict(null);
          setBaseVersion('');
          reload();
        }}
      />

      <ConfirmModal
        open={confirm?.kind === 'discard'}
        title={t('放弃未保存的修改？')}
        confirmLabel={t('放弃修改')}
        danger
        onConfirm={discard}
        onCancel={() => setConfirm(null)}
      >
        {t('退出编辑会丢弃所有未保存的修改，恢复到 ' + baseVersion + '。')}
      </ConfirmModal>
      <ConfirmModal
        open={confirm?.kind === 'delete'}
        title={t('删除文件')}
        confirmLabel={t('删除')}
        danger
        onConfirm={() => confirm?.kind === 'delete' && deleteFile(confirm.path)}
        onCancel={() => setConfirm(null)}
      >
        <>
          {t('确定删除')} <code className="mono">{confirm?.kind === 'delete' ? confirm.path : ''}</code>
          {t('？保存草稿后生效，在此之前可退出编辑撤销。')}
        </>
      </ConfirmModal>
      <ConfirmModal
        open={confirm?.kind === 'restore'}
        title={t('用历史版本覆盖当前修改？')}
        confirmLabel={t('覆盖并载入')}
        danger
        onConfirm={() => confirm?.kind === 'restore' && applyRestore(confirm.version)}
        onCancel={() => setConfirm(null)}
      >
        {t('编辑器中有未保存的修改，载入 ' + (confirm?.kind === 'restore' ? confirm.version.version : '') + ' 会覆盖这些修改。')}
      </ConfirmModal>
      <ConfirmModal
        open={confirm?.kind === 'disable'}
        title={t('停用 Skill')}
        confirmLabel={t('停用')}
        danger
        busy={busy === 'status'}
        onConfirm={() => void doStatus(false)}
        onCancel={() => setConfirm(null)}
      >
        {t('停用后，绑定的 agent 在下一次任务开始时不再加载此 Skill；版本与文件会保留，可随时重新启用。')}
      </ConfirmModal>
      <ConfirmModal
        open={blocker.state === 'blocked'}
        title={t('离开此页？')}
        confirmLabel={t('放弃修改并离开')}
        cancelLabel={t('留在此页')}
        danger
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        {leaveMsg}
      </ConfirmModal>
    </>
  );
}
