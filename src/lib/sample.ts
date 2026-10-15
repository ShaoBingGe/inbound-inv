/** 示例数据用的确定性随机数（与设计稿原型一致，保证每次生成相同的数据） */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  if (!s) s = 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 字符串哈希（FNV-1a） */
export function hs(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
