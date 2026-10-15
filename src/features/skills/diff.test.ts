import { describe, expect, it } from 'vitest';
import { collapseSame, diffLines, diffStats } from './diff';

describe('diffLines', () => {
  it('returns all same for identical text', () => {
    const d = diffLines('a\nb\nc\n', 'a\nb\nc\n');
    expect(d.map((l) => l.type)).toEqual(['same', 'same', 'same']);
  });

  it('detects added, deleted and changed lines', () => {
    const d = diffLines('a\nb\nc\nd', 'a\nB\nc\nd\ne');
    expect(d.map((l) => `${l.type}:${l.text}`)).toEqual(['same:a', 'del:b', 'add:B', 'same:c', 'same:d', 'add:e']);
    expect(diffStats(d)).toEqual({ add: 2, del: 1 });
  });

  it('numbers lines on both sides', () => {
    const d = diffLines('x\ny', 'y');
    expect(d).toEqual([
      { type: 'del', text: 'x', oldNo: 1 },
      { type: 'same', text: 'y', oldNo: 2, newNo: 1 },
    ]);
  });

  it('handles empty inputs', () => {
    expect(diffLines('', '')).toEqual([]);
    expect(diffLines('', 'a').map((l) => l.type)).toEqual(['add']);
    expect(diffLines('a', '').map((l) => l.type)).toEqual(['del']);
  });

  it('keeps the LCS (minimal edit)', () => {
    const d = diffLines('a\nb\nc\nd\ne', 'a\nc\ne\nf');
    const same = d.filter((l) => l.type === 'same').map((l) => l.text);
    expect(same).toEqual(['a', 'c', 'e']);
  });
});

describe('collapseSame', () => {
  it('folds long unchanged runs', () => {
    const old = Array.from({ length: 20 }, (_, i) => `l${i}`).join('\n');
    const next = old.replace('l10', 'L10');
    const rows = collapseSame(diffLines(old, next), 2);
    expect(rows[0]).toEqual({ type: 'gap', count: 8 });
    expect(rows[rows.length - 1]).toEqual({ type: 'gap', count: 7 });
  });
});
