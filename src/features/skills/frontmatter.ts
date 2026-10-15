/**
 * SKILL.md frontmatter 解析 / 序列化与 Skill 校验（规则见 docs/SKILLS.md）。
 * 平台端会做同样的校验，前端校验只为及时反馈并阻止发布。
 */
import { parse, stringify } from 'yaml';
import type { SkillFile, ValidationIssue } from './types';

export const SKILL_MD = 'SKILL.md';
export const NAME_MAX = 64;
export const DESCRIPTION_MAX = 1024;
export const FILE_MAX_BYTES = 512 * 1024;
export const TOTAL_MAX_BYTES = 5 * 1024 * 1024;

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FM_RE = /^\uFEFF?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

export interface FrontmatterSplit {
  /** frontmatter 原文（不含 --- 分隔行）；没有 frontmatter 时为 null */
  raw: string | null;
  body: string;
}

/** 拆分 frontmatter 与正文 */
export function splitFrontmatter(src: string): FrontmatterSplit {
  const m = FM_RE.exec(src);
  if (!m) return { raw: null, body: src };
  return { raw: m[1] ?? '', body: src.slice(m[0].length) };
}

export type FrontmatterData = Record<string, unknown>;

export interface ParsedFrontmatter {
  data: FrontmatterData | null;
  body: string;
  /** 有 frontmatter 分隔行 */
  present: boolean;
  /** YAML 解析错误（原始信息，不翻译） */
  error?: string;
}

function isRecord(v: unknown): v is FrontmatterData {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 解析 frontmatter；YAML 语法错误或顶层不是映射时返回 error */
export function parseFrontmatter(src: string): ParsedFrontmatter {
  const { raw, body } = splitFrontmatter(src);
  if (raw === null) return { data: null, body, present: false };
  if (raw.trim() === '') return { data: {}, body, present: true };
  try {
    const v: unknown = parse(raw);
    if (v === null || v === undefined) return { data: {}, body, present: true };
    if (!isRecord(v)) return { data: null, body, present: true, error: 'frontmatter must be a mapping' };
    return { data: v, body, present: true };
  } catch (e) {
    return { data: null, body, present: true, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 由 frontmatter 数据与正文生成 SKILL.md 内容 */
export function serializeFrontmatter(data: FrontmatterData, body: string): string {
  const yaml = Object.keys(data).length ? stringify(data).replace(/\n*$/, '\n') : '';
  return `---\n${yaml}---\n${body}`;
}

/** 字符串的 UTF-8 字节数 */
export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function fileSize(f: SkillFile): number {
  return f.size ?? byteLength(f.content);
}

/* ---------- 单项校验 ---------- */

export function validateName(name: unknown, path = SKILL_MD): ValidationIssue[] {
  if (typeof name !== 'string' || name.trim() === '')
    return [{ level: 'error', code: 'name-required', message: 'name 为必填项', path }];
  const out: ValidationIssue[] = [];
  if (name.length > NAME_MAX)
    out.push({ level: 'error', code: 'name-length', message: 'name 不能超过 64 个字符', path, detail: String(name.length) });
  if (!NAME_RE.test(name))
    out.push({
      level: 'error',
      code: 'name-format',
      message: 'name 只能包含小写字母、数字和连字符（kebab-case）',
      path,
      detail: name,
    });
  return out;
}

export function validateDescription(desc: unknown, path = SKILL_MD): ValidationIssue[] {
  if (typeof desc !== 'string' || desc.trim() === '')
    return [{ level: 'error', code: 'description-required', message: 'description 为必填项', path }];
  const out: ValidationIssue[] = [];
  if (desc.length > DESCRIPTION_MAX)
    out.push({
      level: 'error',
      code: 'description-length',
      message: 'description 不能超过 1024 个字符',
      path,
      detail: String(desc.length),
    });
  if (/[<>]/.test(desc))
    out.push({ level: 'error', code: 'description-angle', message: 'description 不能包含尖括号 < >', path });
  return out;
}

/** 文件路径：相对路径，不含 ..，不以 / 开头 */
export function validatePath(path: string): ValidationIssue[] {
  if (path.trim() === '') return [{ level: 'error', code: 'path-empty', message: '文件路径不能为空', path }];
  if (/^[/\\]/.test(path) || /^[A-Za-z]:/.test(path))
    return [{ level: 'error', code: 'path-absolute', message: '文件路径必须是相对路径，不能以 / 开头', path }];
  const segs = path.split(/[/\\]/);
  if (segs.includes('..'))
    return [{ level: 'error', code: 'path-parent', message: '文件路径不能包含 ..', path }];
  // eslint-disable-next-line no-control-regex -- 有意拦截路径中的控制字符
  if (segs.some((s) => s === '' || s === '.') || /[\u0000-\u001f]/.test(path))
    return [{ level: 'error', code: 'path-invalid', message: '文件路径格式不正确', path }];
  return [];
}

export interface ValidateOptions {
  /** Skill 标识；frontmatter name 与之不同时给出警告 */
  expectedName?: string;
}

/** 校验整个 Skill（SKILL.md frontmatter、文件路径与大小） */
export function validateSkill(files: SkillFile[], opts: ValidateOptions = {}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const f of files) {
    issues.push(...validatePath(f.path));
    if (seen.has(f.path))
      issues.push({ level: 'error', code: 'path-duplicate', message: '文件路径重复', path: f.path });
    seen.add(f.path);
    const size = fileSize(f);
    total += size;
    if (size > FILE_MAX_BYTES)
      issues.push({
        level: 'error',
        code: 'file-size',
        message: '单个文件不能超过 512 KB',
        path: f.path,
        detail: formatBytes(size),
      });
  }
  if (total > TOTAL_MAX_BYTES)
    issues.push({ level: 'error', code: 'total-size', message: '整个 Skill 不能超过 5 MB', detail: formatBytes(total) });

  const md = files.find((f) => f.path === SKILL_MD);
  if (!md) {
    issues.unshift({ level: 'error', code: 'skill-md-missing', message: '缺少 SKILL.md', path: SKILL_MD });
    return issues;
  }
  const fm = parseFrontmatter(md.content);
  const head: ValidationIssue[] = [];
  if (!fm.present) {
    head.push({
      level: 'error',
      code: 'frontmatter-missing',
      message: 'SKILL.md 缺少 frontmatter（以 --- 开头和结尾的 YAML 块）',
      path: SKILL_MD,
    });
  } else if (!fm.data) {
    head.push({
      level: 'error',
      code: 'frontmatter-invalid',
      message: 'frontmatter 不是合法的 YAML 映射',
      path: SKILL_MD,
      detail: fm.error,
    });
  } else {
    head.push(...validateName(fm.data.name), ...validateDescription(fm.data.description));
    const name = fm.data.name;
    if (opts.expectedName && typeof name === 'string' && name !== '' && name !== opts.expectedName)
      head.push({
        level: 'warning',
        code: 'name-mismatch',
        message: 'name 与 Skill 标识不一致，发布时平台会按标识绑定',
        path: SKILL_MD,
        detail: `${name} ≠ ${opts.expectedName}`,
      });
  }
  if (fm.body.trim() === '')
    head.push({ level: 'warning', code: 'body-empty', message: 'SKILL.md 正文为空', path: SKILL_MD });
  return [...head, ...issues];
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.level === 'error');
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
