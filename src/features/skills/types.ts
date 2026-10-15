/**
 * Skill 管理（统一 agent 平台）领域类型。接口约定见 docs/SKILLS.md。
 * agent 的运行、调度与记忆由平台管理；本项目只查看与编辑 Skill 文件。
 */
import type { Role } from '@/auth/types';

/** Skill 整体状态：从未发布的草稿 / 已发布（线上生效）/ 已停用（绑定的 agent 不再加载） */
export type SkillStatus = 'draft' | 'published' | 'disabled';

/** 版本状态：草稿 / 线上版本 / 历史版本（已被新版本取代） */
export type SkillVersionStatus = 'draft' | 'published' | 'archived';

/** Skill 文件夹中的一个文件，path 为相对 Skill 根目录的路径（SKILL.md、references/x.md …） */
export interface SkillFile {
  path: string;
  content: string;
  /** 字节数；缺省时按 UTF-8 编码计算 */
  size?: number;
}

export interface SkillVersion {
  /** 版本号：发布版为 1.2.0，草稿为 1.3.0-draft.2 */
  version: string;
  /** 变更说明 */
  note: string;
  author: string;
  /** ISO 8601 时间 */
  createdAt: string;
  status: SkillVersionStatus;
}

/** 某个版本的完整内容（用于对比与恢复） */
export interface SkillVersionDetail extends SkillVersion {
  files: SkillFile[];
}

/** 列表行 */
export interface SkillSummary {
  /** 唯一标识，等于 SKILL.md frontmatter 中的 name */
  id: string;
  name: string;
  description: string;
  status: SkillStatus;
  /** 状态说明（例如停用原因） */
  statusNote?: string;
  /** 当前工作版本（最新草稿或最新发布版本） */
  version: string;
  /** 线上生效的版本；从未发布时为空 */
  publishedVersion?: string;
  /** 是否有未发布的草稿 */
  hasDraft: boolean;
  /** 绑定的 agent（由统一 agent 平台维护） */
  agents: string[];
  owner: string;
  updatedBy: string;
  updatedAt: string;
}

export interface SkillPermissions {
  /** 可编辑此 Skill 的人员（另有 admin 角色全局可编辑） */
  editors: string[];
  /** 查看所需角色 */
  viewRoles: Role[];
  /** 编辑 / 发布所需角色 */
  editRoles: Role[];
}

export interface SkillPublishInfo {
  version: string;
  by: string;
  at: string;
  note: string;
}

/** 详情：当前草稿或最新发布版本的完整内容 */
export interface Skill extends SkillSummary {
  files: SkillFile[];
  permissions: SkillPermissions;
  lastPublished?: SkillPublishInfo;
  createdAt: string;
}

export interface SkillQuery {
  query?: string;
  status?: SkillStatus | '';
  agent?: string;
}

export type ValidationLevel = 'error' | 'warning';

export interface ValidationIssue {
  level: ValidationLevel;
  /** 机器可读的规则编号 */
  code:
    | 'skill-md-missing'
    | 'frontmatter-missing'
    | 'frontmatter-invalid'
    | 'name-required'
    | 'name-format'
    | 'name-length'
    | 'name-mismatch'
    | 'description-required'
    | 'description-length'
    | 'description-angle'
    | 'path-empty'
    | 'path-absolute'
    | 'path-parent'
    | 'path-invalid'
    | 'path-duplicate'
    | 'file-size'
    | 'total-size'
    | 'body-empty';
  /** 简体中文原文，显示时经 t() 翻译 */
  message: string;
  /** 相关文件 */
  path?: string;
  /** 附加信息（实际值、长度等），不翻译 */
  detail?: string;
}

/** 保存草稿时版本冲突（他人已在你打开之后保存了新版本） */
export class SkillConflictError extends Error {
  constructor(
    public baseVersion: string,
    public latestVersion?: string,
    public latestBy?: string,
  ) {
    super('版本冲突');
    this.name = 'SkillConflictError';
  }
}
