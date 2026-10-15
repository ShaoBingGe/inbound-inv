/** 逐行 diff（最长公共子序列）。用于版本历史对比。 */

export type DiffType = 'same' | 'add' | 'del';

export interface DiffLine {
  type: DiffType;
  text: string;
  /** 旧版本中的行号（1 起），新增行为空 */
  oldNo?: number;
  /** 新版本中的行号（1 起），删除行为空 */
  newNo?: number;
}

/** 超过该规模（行数乘积）时不做 LCS，退化为整段删除 + 新增，避免卡住页面 */
const MAX_CELLS = 4_000_000;

export function splitLines(s: string): string[] {
  if (s === '') return [];
  const lines = s.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = splitLines(oldText);
  const b = splitLines(newText);
  const out: DiffLine[] = [];

  // 公共前缀 / 后缀不进入 DP
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;

  for (let i = 0; i < pre; i++) out.push({ type: 'same', text: a[i], oldNo: i + 1, newNo: i + 1 });

  const am = a.slice(pre, a.length - suf);
  const bm = b.slice(pre, b.length - suf);
  const n = am.length;
  const m = bm.length;

  if (n * m > MAX_CELLS) {
    am.forEach((text, i) => out.push({ type: 'del', text, oldNo: pre + i + 1 }));
    bm.forEach((text, j) => out.push({ type: 'add', text, newNo: pre + j + 1 }));
  } else if (n > 0 || m > 0) {
    // dp[i][j] = am[i..] 与 bm[j..] 的 LCS 长度
    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] = am[i] === bm[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && am[i] === bm[j]) {
        out.push({ type: 'same', text: am[i], oldNo: pre + i + 1, newNo: pre + j + 1 });
        i++;
        j++;
      } else if (i < n && (j >= m || dp[(i + 1) * w + j] >= dp[i * w + j + 1])) {
        // 同等长度时先删后增，读起来是「旧行 → 新行」
        out.push({ type: 'del', text: am[i], oldNo: pre + i + 1 });
        i++;
      } else {
        out.push({ type: 'add', text: bm[j], newNo: pre + j + 1 });
        j++;
      }
    }
  }

  for (let k = 0; k < suf; k++) {
    const ai = a.length - suf + k;
    const bi = b.length - suf + k;
    out.push({ type: 'same', text: a[ai], oldNo: ai + 1, newNo: bi + 1 });
  }
  return out;
}

export function diffStats(lines: DiffLine[]): { add: number; del: number } {
  let add = 0;
  let del = 0;
  for (const l of lines) {
    if (l.type === 'add') add++;
    else if (l.type === 'del') del++;
  }
  return { add, del };
}

export type DiffRow = DiffLine | { type: 'gap'; count: number };

/** 折叠未改动的长段落，只保留改动前后 context 行 */
export function collapseSame(lines: DiffLine[], context = 3): DiffRow[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((l, i) => {
    if (l.type === 'same') return;
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) keep[k] = true;
  });
  const out: DiffRow[] = [];
  let gap = 0;
  lines.forEach((l, i) => {
    if (keep[i]) {
      if (gap) out.push({ type: 'gap', count: gap });
      gap = 0;
      out.push(l);
    } else gap++;
  });
  if (gap) out.push({ type: 'gap', count: gap });
  return out;
}
