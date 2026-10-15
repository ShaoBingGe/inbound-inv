import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Chip, Drawer, Empty, ErrorState, PageLoading, Select, Table, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { useAsync } from '@/lib/useAsync';
import { getVersion, listVersions } from '../api';
import { collapseSame, diffLines, diffStats } from '../diff';
import { SKILL_MD } from '../frontmatter';
import type { SkillVersion, SkillVersionDetail } from '../types';
import { sortFiles, useFmtTime, VersionStatusChip } from './shared';
import s from './parts.module.css';

/** 版本历史：列出版本，任选两个对比差异，可将历史版本恢复为草稿 */
export function VersionDrawer({
  open,
  onClose,
  skillId,
  currentVersion,
  canEdit,
  onRestore,
}: {
  open: boolean;
  onClose: () => void;
  skillId: string;
  /** 用于在保存 / 发布后刷新列表 */
  currentVersion: string;
  canEdit: boolean;
  onRestore: (v: SkillVersionDetail) => void;
}) {
  const t = useT();
  const toast = useToast();
  const fmt = useFmtTime();
  const versions = useAsync(() => (open ? listVersions(skillId) : Promise.resolve<SkillVersion[]>([])), [open, skillId, currentVersion]);
  const [picked, setPicked] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, SkillVersionDetail>>({});
  const [loadErr, setLoadErr] = useState<Error | null>(null);
  const [filePath, setFilePath] = useState(SKILL_MD);
  const [showAll, setShowAll] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const list = useMemo(() => (open ? versions.data ?? [] : []), [open, versions.data]);

  // 默认选中最近两个版本
  useEffect(() => {
    if (!list.length) return;
    setPicked((p) => {
      const valid = p.filter((v) => list.some((x) => x.version === v));
      if (valid.length === 2) return valid;
      return list.slice(0, 2).map((x) => x.version);
    });
  }, [list]);

  // 按版本顺序：older → newer
  const [older, newer] = useMemo(() => {
    const idx = (v: string) => list.findIndex((x) => x.version === v);
    const sorted = [...picked].sort((a, b) => idx(b) - idx(a));
    return [sorted[0], sorted[1]] as [string | undefined, string | undefined];
  }, [picked, list]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const need = [older, newer].filter((v): v is string => !!v && !details[v]);
    if (!need.length) return;
    setLoadErr(null);
    Promise.all(need.map((v) => getVersion(skillId, v)))
      .then((ds) => {
        if (!alive) return;
        setDetails((prev) => {
          const n = { ...prev };
          for (const d of ds) n[d.version] = d;
          return n;
        });
      })
      .catch((e: unknown) => alive && setLoadErr(e instanceof Error ? e : new Error(String(e))));
    return () => {
      alive = false;
    };
  }, [open, older, newer, skillId, details]);

  // 每次打开都默认对比最近两个版本
  useEffect(() => {
    if (!open) setPicked([]);
  }, [open]);

  // 切换 Skill 时清空缓存
  useEffect(() => {
    setDetails({});
    setPicked([]);
    setFilePath(SKILL_MD);
  }, [skillId]);

  const a = older ? details[older] : undefined;
  const b = newer ? details[newer] : undefined;

  const fileRows = useMemo(() => {
    if (!a || !b) return [];
    const paths = new Set([...a.files.map((f) => f.path), ...b.files.map((f) => f.path)]);
    return sortFiles([...paths].map((p) => ({ path: p, content: '' }))).map(({ path }) => {
      const fa = a.files.find((f) => f.path === path);
      const fb = b.files.find((f) => f.path === path);
      const st = diffStats(diffLines(fa?.content ?? '', fb?.content ?? ''));
      const kind: 'added' | 'removed' | 'changed' | 'same' = !fa ? 'added' : !fb ? 'removed' : st.add || st.del ? 'changed' : 'same';
      return { path, kind, ...st };
    });
  }, [a, b]);

  const lines = useMemo(() => {
    if (!a || !b) return [];
    const fa = a.files.find((f) => f.path === filePath)?.content ?? '';
    const fb = b.files.find((f) => f.path === filePath)?.content ?? '';
    return diffLines(fa, fb);
  }, [a, b, filePath]);
  const rows = useMemo(() => (showAll ? lines : collapseSame(lines, 3)), [lines, showAll]);
  const stats = diffStats(lines);

  function toggle(v: string, on: boolean) {
    setPicked((p) => {
      if (!on) return p.filter((x) => x !== v);
      const next = [...p.filter((x) => x !== v), v];
      return next.length > 2 ? next.slice(next.length - 2) : next;
    });
  }

  async function restore(version: string) {
    setRestoring(version);
    try {
      const d = details[version] ?? (await getVersion(skillId, version));
      onRestore(d);
    } catch (e) {
      toast(t('读取版本失败') + '：' + (e instanceof Error ? t(e.message) : String(e)), { error: true });
    } finally {
      setRestoring(null);
    }
  }

  const KIND_LABEL = { added: '新增', removed: '删除', changed: '修改', same: '无变化' } as const;

  return (
    <Drawer open={open} onClose={onClose} title={t('版本历史')} width={860}>
      {versions.error ? (
        <ErrorState error={versions.error} onRetry={versions.reload} />
      ) : versions.loading && !versions.data?.length ? (
        <PageLoading />
      ) : !list.length ? (
        <Empty title={t('暂无版本')} />
      ) : (
        <div className={s.vWrap}>
          <div className={s.metaMuted}>{t('勾选两个版本对比差异；「恢复为草稿」会把该版本的文件载入编辑器，保存草稿后生成新的草稿版本。')}</div>
          <Table className={s.vTable} aria-label={t('版本列表')}>
            <thead>
              <tr>
                <th>
                  <span className="sr-only">{t('选择')}</span>
                </th>
                <th>{t('版本')}</th>
                <th>{t('状态')}</th>
                <th>{t('说明')}</th>
                <th>{t('作者')}</th>
                <th>{t('时间')}</th>
                {canEdit ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {list.map((v) => {
                const on = picked.includes(v.version);
                return (
                  <tr key={v.version} className={cx(on && s.vRowOn)}>
                    <td>
                      <Checkbox checked={on} onChange={(x) => toggle(v.version, x)} label={<span className="sr-only">{t('对比') + ' ' + v.version}</span>} />
                    </td>
                    <td className="mono num">
                      {v.version}
                      {v.version === newer ? <span className={s.vTag}>B</span> : v.version === older ? <span className={s.vTag}>A</span> : null}
                    </td>
                    <td>
                      <VersionStatusChip status={v.status} />
                    </td>
                    <td className={s.vNote} translate="no">
                      {v.note || '—'}
                    </td>
                    <td translate="no">{v.author}</td>
                    <td className="num">{fmt(v.createdAt)}</td>
                    {canEdit ? (
                      <td>
                        <Button size="sm" onClick={() => void restore(v.version)} disabled={restoring !== null}>
                          {restoring === v.version ? t('载入中…') : t('恢复为草稿')}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </Table>

          <section className={s.diffBox} aria-label={t('版本对比')}>
            <div className={s.diffHead}>
              <h3 className={s.panelTitle}>{t('版本对比')}</h3>
              {older && newer ? (
                <span className="mono num">
                  A {older} → B {newer}
                </span>
              ) : null}
              <div className={s.spacer} />
              {a && b ? (
                <>
                  <Select
                    aria-label={t('对比文件')}
                    value={filePath}
                    onChange={setFilePath}
                    options={fileRows.map((r) => ({
                      value: r.path,
                      label: `${r.path}${r.kind === 'same' ? '' : ` · ${t(KIND_LABEL[r.kind])}`}`,
                    }))}
                  />
                  <Checkbox checked={showAll} onChange={setShowAll} label={t('显示全部行')} />
                </>
              ) : null}
            </div>

            {!older || !newer ? (
              <Empty title={t('请勾选两个版本')} />
            ) : loadErr ? (
              <ErrorState error={loadErr} />
            ) : !a || !b ? (
              <PageLoading />
            ) : (
              <>
                <div className={s.diffFiles}>
                  {fileRows.map((r) => (
                    <button
                      key={r.path}
                      type="button"
                      className={cx(s.diffFile, r.path === filePath && s.diffFileOn)}
                      onClick={() => setFilePath(r.path)}
                      aria-pressed={r.path === filePath}
                    >
                      <span className="mono" translate="no">
                        {r.path}
                      </span>
                      {r.kind === 'same' ? (
                        <span className={s.metaMuted}>{t('无变化')}</span>
                      ) : (
                        <>
                          {r.kind !== 'changed' ? <Chip tone={r.kind === 'added' ? 'green' : 'red'}>{t(KIND_LABEL[r.kind])}</Chip> : null}
                          <span className={cx(s.plus, 'num')}>+{r.add}</span>
                          <span className={cx(s.minus, 'num')}>−{r.del}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
                <div className={s.diffStat}>
                  <span className="mono" translate="no">
                    {filePath}
                  </span>
                  <span className={cx(s.plus, 'num')}>{t('+' + stats.add + ' 行')}</span>
                  <span className={cx(s.minus, 'num')}>{t('−' + stats.del + ' 行')}</span>
                </div>
                {stats.add === 0 && stats.del === 0 ? (
                  <Empty title={t('两个版本中此文件内容相同')} />
                ) : (
                  <div className={s.diff} translate="no" role="table" aria-label={t('逐行差异')}>
                    {rows.map((r, i) =>
                      r.type === 'gap' ? (
                        <div key={i} className={s.diffGap} role="row">
                          <span role="cell">{t('… 省略 ' + r.count + ' 行未改动 …')}</span>
                        </div>
                      ) : (
                        <div key={i} role="row" className={cx(s.diffLine, r.type === 'add' && s.diffAdd, r.type === 'del' && s.diffDel)}>
                          <span role="cell" className={s.dn}>
                            {r.oldNo ?? ''}
                          </span>
                          <span role="cell" className={s.dn}>
                            {r.newNo ?? ''}
                          </span>
                          <span role="cell" className={s.dsign} aria-label={r.type === 'add' ? t('新增') : r.type === 'del' ? t('删除') : undefined}>
                            {r.type === 'add' ? '+' : r.type === 'del' ? '−' : ' '}
                          </span>
                          <code role="cell">{r.text === '' ? ' ' : r.text}</code>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
