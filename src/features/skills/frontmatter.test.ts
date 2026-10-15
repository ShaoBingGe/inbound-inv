import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  parseFrontmatter,
  serializeFrontmatter,
  splitFrontmatter,
  validateDescription,
  validateName,
  validatePath,
  validateSkill,
} from './frontmatter';
import type { SkillFile } from './types';

const md = (fm: string, body = '# 标题\n\n正文\n') => `---\n${fm}\n---\n${body}`;
const codes = (files: SkillFile[], expectedName?: string) => validateSkill(files, { expectedName }).map((i) => i.code);

describe('splitFrontmatter / parseFrontmatter', () => {
  it('splits frontmatter and body', () => {
    const s = splitFrontmatter(md('name: a\ndescription: b'));
    expect(s.raw).toBe('name: a\ndescription: b');
    expect(s.body).toBe('# 标题\n\n正文\n');
  });

  it('returns null raw when there is no frontmatter', () => {
    expect(splitFrontmatter('# 只有正文').raw).toBeNull();
    expect(parseFrontmatter('# 只有正文').present).toBe(false);
  });

  it('does not end frontmatter at --- inside a value', () => {
    const s = splitFrontmatter('---\ndescription: a---b\nname: x\n---\nbody');
    expect(s.raw).toBe('description: a---b\nname: x');
    expect(s.body).toBe('body');
  });

  it('accepts CRLF and empty frontmatter', () => {
    expect(splitFrontmatter('---\r\nname: a\r\n---\r\nbody').raw).toBe('name: a');
    const empty = parseFrontmatter('---\n---\nbody');
    expect(empty.present).toBe(true);
    expect(empty.data).toEqual({});
  });

  it('parses YAML into data', () => {
    const p = parseFrontmatter(md('name: invoice-ocr-review\ndescription: 复核识别结果\ntags:\n  - ocr\n  - review'));
    expect(p.data).toEqual({ name: 'invoice-ocr-review', description: '复核识别结果', tags: ['ocr', 'review'] });
    expect(p.error).toBeUndefined();
  });

  it('reports a non-mapping frontmatter', () => {
    const p = parseFrontmatter(md('- a\n- b'));
    expect(p.data).toBeNull();
    expect(p.error).toBeTruthy();
  });

  it('round-trips through serializeFrontmatter', () => {
    const src = serializeFrontmatter({ name: 'tax-rule-check', description: '按国家税务规则校验' }, '# 税务规则\n');
    expect(src.startsWith('---\n')).toBe(true);
    const p = parseFrontmatter(src);
    expect(p.data).toEqual({ name: 'tax-rule-check', description: '按国家税务规则校验' });
    expect(p.body).toBe('# 税务规则\n');
  });
});

describe('field validation', () => {
  it('validates name', () => {
    expect(validateName('invoice-ocr-review')).toEqual([]);
    expect(validateName('a1-b2')).toEqual([]);
    expect(validateName('')[0].code).toBe('name-required');
    expect(validateName(undefined)[0].code).toBe('name-required');
    expect(validateName('Invoice_OCR').map((i) => i.code)).toEqual(['name-format']);
    expect(validateName('-a').map((i) => i.code)).toEqual(['name-format']);
    expect(validateName('a--b').map((i) => i.code)).toEqual(['name-format']);
    expect(validateName('a'.repeat(64))).toEqual([]);
    expect(validateName('a'.repeat(65)).map((i) => i.code)).toEqual(['name-length']);
  });

  it('validates description', () => {
    expect(validateDescription('识别结果低置信度时复核')).toEqual([]);
    expect(validateDescription('  ')[0].code).toBe('description-required');
    expect(validateDescription('x'.repeat(1024))).toEqual([]);
    expect(validateDescription('x'.repeat(1025)).map((i) => i.code)).toEqual(['description-length']);
    expect(validateDescription('包含 <b> 标签').map((i) => i.code)).toEqual(['description-angle']);
    expect(validateDescription('金额 > 1000').map((i) => i.code)).toEqual(['description-angle']);
  });

  it('validates paths', () => {
    expect(validatePath('references/rules.md')).toEqual([]);
    expect(validatePath('scripts/check.py')).toEqual([]);
    expect(validatePath('')[0].code).toBe('path-empty');
    expect(validatePath('/etc/passwd')[0].code).toBe('path-absolute');
    expect(validatePath('C:/x.md')[0].code).toBe('path-absolute');
    expect(validatePath('../secret.md')[0].code).toBe('path-parent');
    expect(validatePath('references/../../x.md')[0].code).toBe('path-parent');
    expect(validatePath('references//x.md')[0].code).toBe('path-invalid');
    expect(validatePath('references/')[0].code).toBe('path-invalid');
  });
});

describe('validateSkill', () => {
  const good: SkillFile[] = [
    { path: 'SKILL.md', content: md('name: invoice-ocr-review\ndescription: 复核识别结果') },
    { path: 'references/rules.md', content: '# rules' },
  ];

  it('passes a valid skill', () => {
    expect(validateSkill(good, { expectedName: 'invoice-ocr-review' })).toEqual([]);
  });

  it('requires SKILL.md and frontmatter', () => {
    expect(codes([{ path: 'README.md', content: 'x' }])).toContain('skill-md-missing');
    expect(codes([{ path: 'SKILL.md', content: '# 无 frontmatter' }])).toContain('frontmatter-missing');
    expect(codes([{ path: 'SKILL.md', content: md('- a') }])).toContain('frontmatter-invalid');
  });

  it('checks name and description from frontmatter', () => {
    const c = codes([{ path: 'SKILL.md', content: md('name: Bad Name\ndescription: a <b>') }]);
    expect(c).toEqual(expect.arrayContaining(['name-format', 'description-angle']));
    expect(hasErrors(validateSkill([{ path: 'SKILL.md', content: md('name: a\ndescription: b') }]))).toBe(false);
  });

  it('warns when name differs from the skill id and body is empty', () => {
    const issues = validateSkill([{ path: 'SKILL.md', content: md('name: other\ndescription: d', '') }], {
      expectedName: 'invoice-ocr-review',
    });
    expect(issues.map((i) => [i.code, i.level])).toEqual([
      ['name-mismatch', 'warning'],
      ['body-empty', 'warning'],
    ]);
    expect(hasErrors(issues)).toBe(false);
  });

  it('checks paths, duplicates and sizes', () => {
    const c = codes([
      ...good,
      { path: '../x.md', content: '' },
      { path: 'references/rules.md', content: 'dup' },
      { path: 'assets/big.json', content: '', size: 512 * 1024 + 1 },
    ]);
    expect(c).toEqual(expect.arrayContaining(['path-parent', 'path-duplicate', 'file-size']));
    expect(codes([...good, { path: 'assets/ok.json', content: '', size: 512 * 1024 }])).toEqual([]);
  });

  it('limits total size to 5 MB', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ path: `assets/f${i}.bin`, content: '', size: 500 * 1024 }));
    expect(codes([...good, ...many])).toContain('total-size');
    expect(codes([...good, ...many.slice(0, 10)])).not.toContain('total-size');
  });

  it('counts UTF-8 bytes, not characters', () => {
    // 175 000 个汉字 ≈ 525 000 字节 > 512 KB
    const c = codes([...good, { path: 'references/long.md', content: '票'.repeat(175_000) }]);
    expect(c).toContain('file-size');
  });
});
