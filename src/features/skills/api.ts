/**
 * Skill 管理接口。live 模式调用统一 agent 平台（target 'agent'，根地址 agentPlatformBaseUrl），
 * 路径见 docs/SKILLS.md；mock 模式使用内存仓库（刷新页面即恢复初始示例）。
 */
import { ApiError, http, isMock, mockDelay } from '@/lib/http';
import { buildSkillSeed, type SkillRecord } from './data';
import {
  hasErrors,
  parseFrontmatter,
  serializeFrontmatter,
  SKILL_MD,
  validateDescription,
  validateName,
  validateSkill,
} from './frontmatter';
import {
  SkillConflictError,
  type Skill,
  type SkillFile,
  type SkillQuery,
  type SkillStatus,
  type SkillSummary,
  type SkillVersion,
  type SkillVersionDetail,
} from './types';

export { SkillConflictError };

const AGENT = { target: 'agent' } as const;
const enc = encodeURIComponent;

/* ---------------- mock 内存仓库 ---------------- */

let store: SkillRecord[] | null = null;
function db(): SkillRecord[] {
  if (!store) store = buildSkillSeed();
  return store;
}
function clone<T>(v: T): T {
  return structuredClone(v);
}
function find(id: string): SkillRecord {
  const r = db().find((x) => x.skill.id === id);
  if (!r) throw new ApiError(404, 'Skill 不存在');
  return r;
}
/** mock 模式下的操作人：取开发登录的用户名 */
function actor(): string {
  try {
    const raw = window.sessionStorage.getItem('inboundHub.mockUser');
    const u: unknown = raw ? JSON.parse(raw) : null;
    if (u && typeof u === 'object' && 'name' in u && typeof u.name === 'string') return u.name;
  } catch {
    /* ignore */
  }
  return 'mock';
}
function nowIso(): string {
  return new Date().toISOString();
}
function toSummary(s: Skill): SkillSummary {
  const { files: _f, permissions: _p, lastPublished: _l, createdAt: _c, ...rest } = s;
  void _f;
  void _p;
  void _l;
  void _c;
  return rest;
}
function baseOf(version: string): string {
  return version.replace(/-draft\.\d+$/, '');
}
function nextDraftVersion(latest: SkillVersion | undefined): string {
  if (!latest) return '0.1.0-draft.1';
  const m = /^(.*)-draft\.(\d+)$/.exec(latest.version);
  if (latest.status === 'draft' && m) return `${m[1]}-draft.${Number(m[2]) + 1}`;
  const [maj = 0, min = 0] = baseOf(latest.version).split('.').map((n) => Number(n) || 0);
  return `${maj}.${min + 1}.0-draft.1`;
}
/** 自动生成草稿说明：改动了哪些文件 */
function changeNote(prev: SkillFile[], next: SkillFile[]): string {
  const before = new Map(prev.map((f) => [f.path, f.content]));
  const after = new Map(next.map((f) => [f.path, f.content]));
  const parts: string[] = [];
  const changed = next.filter((f) => before.has(f.path) && before.get(f.path) !== f.content).map((f) => f.path);
  const added = next.filter((f) => !before.has(f.path)).map((f) => f.path);
  const removed = prev.filter((f) => !after.has(f.path)).map((f) => f.path);
  if (changed.length) parts.push('修改 ' + changed.join('、'));
  if (added.length) parts.push('新增 ' + added.join('、'));
  if (removed.length) parts.push('删除 ' + removed.join('、'));
  return parts.length ? parts.join('；') : '保存草稿（无内容变化）';
}
function syncMeta(skill: Skill, files: SkillFile[]) {
  const md = files.find((f) => f.path === SKILL_MD);
  const fm = md ? parseFrontmatter(md.content).data : null;
  if (fm && typeof fm.description === 'string') skill.description = fm.description;
}
function plainFiles(files: SkillFile[]): SkillFile[] {
  return files.map((f) => ({ path: f.path, content: f.content }));
}

/* ---------------- 接口 ---------------- */

export async function listSkills(q: SkillQuery = {}): Promise<SkillSummary[]> {
  if (isMock()) {
    const kw = (q.query ?? '').trim().toLowerCase();
    const rows = db()
      .map((r) => r.skill)
      .filter((s) => !kw || s.name.toLowerCase().includes(kw) || s.description.toLowerCase().includes(kw))
      .filter((s) => !q.status || s.status === q.status)
      .filter((s) => !q.agent || s.agents.includes(q.agent))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(toSummary);
    return mockDelay(clone(rows));
  }
  return http.get<SkillSummary[]>('/v1/skills', { ...AGENT, query: { query: q.query, status: q.status, agent: q.agent } });
}

/** 列表筛选用：所有 Skill 绑定过的 agent */
export async function listBoundAgents(): Promise<string[]> {
  const all = await listSkills({});
  return [...new Set(all.flatMap((s) => s.agents))].sort((a, b) => a.localeCompare(b, 'zh'));
}

export async function getSkill(id: string): Promise<Skill> {
  if (isMock()) return mockDelay(clone(find(id).skill));
  return http.get<Skill>(`/v1/skills/${enc(id)}`, AGENT);
}

export async function createSkill(name: string, description: string): Promise<Skill> {
  if (isMock()) {
    const issues = [...validateName(name), ...validateDescription(description)];
    if (hasErrors(issues)) throw new ApiError(422, issues[0].message);
    if (db().some((r) => r.skill.id === name)) throw new ApiError(409, '同名 Skill 已存在');
    const at = nowIso();
    const who = actor();
    const title = name
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const files: SkillFile[] = [
      {
        path: SKILL_MD,
        content: serializeFrontmatter({ name, description }, `\n# ${title}\n\n## 何时使用\n\n- \n\n## 步骤\n\n1. \n`),
      },
    ];
    const version: SkillVersionDetail = {
      version: '0.1.0-draft.1',
      note: '新建 Skill',
      author: who,
      createdAt: at,
      status: 'draft',
      files: clone(files),
    };
    const skill: Skill = {
      id: name,
      name,
      description,
      status: 'draft',
      version: version.version,
      hasDraft: true,
      agents: [],
      owner: who,
      updatedBy: who,
      updatedAt: at,
      createdAt: at,
      files,
      permissions: { editors: [who], viewRoles: ['skill_editor', 'data_ops'], editRoles: ['skill_editor'] },
    };
    db().unshift({ skill, versions: [version] });
    return mockDelay(clone(skill), 260);
  }
  return http.post<Skill>('/v1/skills', { name, description }, AGENT);
}

/** 保存草稿；baseVersion 为打开编辑时的版本号，平台已有更新的版本时返回 409 → SkillConflictError */
export async function saveDraft(id: string, files: SkillFile[], baseVersion: string): Promise<Skill> {
  if (isMock()) {
    const r = find(id);
    if (r.skill.version !== baseVersion) {
      await mockDelay(null);
      throw new SkillConflictError(baseVersion, r.skill.version, r.skill.updatedBy);
    }
    const latest = r.versions[0];
    const who = actor();
    const at = nowIso();
    const v: SkillVersionDetail = {
      version: nextDraftVersion(latest),
      note: changeNote(latest?.files ?? [], files),
      author: who,
      createdAt: at,
      status: 'draft',
      files: plainFiles(files),
    };
    r.versions.unshift(v);
    Object.assign(r.skill, { files: plainFiles(files), version: v.version, hasDraft: true, updatedBy: who, updatedAt: at });
    syncMeta(r.skill, files);
    return mockDelay(clone(r.skill), 320);
  }
  try {
    return await http.put<Skill>(`/v1/skills/${enc(id)}/draft`, { files, baseVersion }, AGENT);
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const b = e.body && typeof e.body === 'object' ? (e.body as Record<string, unknown>) : {};
      throw new SkillConflictError(
        baseVersion,
        typeof b.latestVersion === 'string' ? b.latestVersion : undefined,
        typeof b.latestBy === 'string' ? b.latestBy : undefined,
      );
    }
    throw e;
  }
}

/** 发布当前草稿：生成新版本，平台按绑定关系下发到 agent */
export async function publishSkill(id: string, note: string): Promise<Skill> {
  if (isMock()) {
    const r = find(id);
    const draft = r.versions[0];
    if (!draft || draft.status !== 'draft') throw new ApiError(409, '没有待发布的草稿');
    if (hasErrors(validateSkill(draft.files, { expectedName: id }))) throw new ApiError(422, 'Skill 校验未通过，不能发布');
    const who = actor();
    const at = nowIso();
    for (const v of r.versions) if (v.status !== 'archived') v.status = 'archived';
    const v: SkillVersionDetail = {
      version: baseOf(draft.version),
      note,
      author: who,
      createdAt: at,
      status: 'published',
      files: clone(draft.files),
    };
    r.versions.unshift(v);
    Object.assign(r.skill, {
      version: v.version,
      publishedVersion: v.version,
      hasDraft: false,
      status: r.skill.status === 'disabled' ? 'disabled' : 'published',
      files: clone(draft.files),
      updatedBy: who,
      updatedAt: at,
      lastPublished: { version: v.version, by: who, at, note },
    } satisfies Partial<Skill>);
    syncMeta(r.skill, draft.files);
    return mockDelay(clone(r.skill), 420);
  }
  return http.post<Skill>(`/v1/skills/${enc(id)}/publish`, { note }, AGENT);
}

export async function listVersions(id: string): Promise<SkillVersion[]> {
  if (isMock()) {
    const rows = find(id).versions.map(({ files: _f, ...v }) => {
      void _f;
      return v;
    });
    return mockDelay(clone(rows));
  }
  return http.get<SkillVersion[]>(`/v1/skills/${enc(id)}/versions`, AGENT);
}

export async function getVersion(id: string, version: string): Promise<SkillVersionDetail> {
  if (isMock()) {
    const v = find(id).versions.find((x) => x.version === version);
    if (!v) throw new ApiError(404, '版本不存在');
    return mockDelay(clone(v));
  }
  return http.get<SkillVersionDetail>(`/v1/skills/${enc(id)}/versions/${enc(version)}`, AGENT);
}

/** 启用（恢复为已发布）/ 停用 */
export async function setSkillStatus(id: string, status: Exclude<SkillStatus, 'draft'>): Promise<Skill> {
  if (isMock()) {
    const r = find(id);
    if (status === 'published' && !r.skill.publishedVersion) throw new ApiError(409, '尚未发布过的 Skill 不能启用');
    Object.assign(r.skill, {
      status,
      statusNote: undefined,
      updatedBy: actor(),
      updatedAt: nowIso(),
    } satisfies Partial<Skill>);
    return mockDelay(clone(r.skill), 240);
  }
  return http.patch<Skill>(`/v1/skills/${enc(id)}`, { status }, AGENT);
}
