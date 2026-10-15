#!/usr/bin/env node
/**
 * 词典覆盖检查：扫描 src 下所有含汉字的字符串字面量与 JSX 文本，列出 4 个词典里缺失的条目。
 *
 *   npm run i18n:check                 # 打印缺失条目
 *   npm run i18n:check -- --json out.json   # 导出待翻译清单（键 + 出现位置）
 *
 * 说明：动态拼接的字符串由翻译引擎按片段匹配，这里检查的是源码里出现的每个片段。
 * 以下内容是业务数据而非界面文案，不参与检查：Skill 文件正文、H5 采集页自带的多语言词典。
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(root, 'src');
const LOCALES = ['en', 'zh-TW', 'es', 'ar'];
const EXCLUDE = [
  /src\/i18n\//,
  /src\/features\/capture-h5\/i18n\.ts$/,
  /src\/features\/skills\/data\.ts$/,
  /\.test\.tsx?$/,
];
const HAN = /[㐀-鿿]/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 简易 TS 词法扫描：跳过注释，取出字符串字面量（模板字符串按 ${} 切分） */
function strings(code) {
  const res = [];
  let i = 0;
  const n = code.length;
  while (i < n) {
    const c = code[i];
    const d = code[i + 1];
    if (c === '/' && d === '/') {
      i = code.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (c === '/' && d === '*') {
      i = code.indexOf('*/', i + 2);
      if (i < 0) break;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let buf = '';
      while (j < n && code[j] !== c && code[j] !== '\n') {
        if (code[j] === '\\') {
          const x = code[j + 1];
          buf += x === 'n' ? '\n' : x;
          j += 2;
          continue;
        }
        buf += code[j++];
      }
      res.push([buf, i]);
      i = j + 1;
      continue;
    }
    if (c === '`') {
      let j = i + 1;
      let buf = '';
      while (j < n && code[j] !== '`') {
        if (code[j] === '\\') {
          buf += code[j + 1];
          j += 2;
          continue;
        }
        if (code[j] === '$' && code[j + 1] === '{') {
          res.push([buf, i]);
          buf = '';
          let depth = 1;
          j += 2;
          while (j < n && depth) {
            if (code[j] === '{') depth++;
            else if (code[j] === '}') depth--;
            j++;
          }
          continue;
        }
        buf += code[j++];
      }
      res.push([buf, i]);
      i = j + 1;
      continue;
    }
    i++;
  }
  return res;
}

function jsxText(code) {
  const res = [];
  const re = />([^<>{}]*[㐀-鿿][^<>{}]*)</g;
  let m;
  while ((m = re.exec(code))) {
    // 排除 TS 泛型等误匹配（如 useState<string | null>(…)）
    if (/[;=]|\bconst\b|=>/.test(m[1])) continue;
    res.push([m[1], m.index]);
  }
  return res;
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const dicts = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(fs.readFileSync(path.join(SRC, 'i18n/locales', `${l}.json`), 'utf8'))]),
);

const found = new Map();
for (const file of walk(SRC)) {
  const rel = path.relative(root, file);
  if (EXCLUDE.some((r) => r.test(rel))) continue;
  const code = fs.readFileSync(file, 'utf8');
  const items = [...strings(code), ...(file.endsWith('.tsx') ? jsxText(code) : [])];
  for (const [raw, off] of items) {
    const k = norm(raw);
    if (!k || !HAN.test(k)) continue;
    const line = code.slice(0, off).split('\n').length;
    if (!found.has(k)) found.set(k, []);
    if (found.get(k).length < 3) found.get(k).push(`${rel}:${line}`);
  }
}

const missing = [...found.entries()].filter(([k]) => LOCALES.some((l) => dicts[l][k] === undefined));
const jsonIdx = process.argv.indexOf('--json');
if (jsonIdx > 0) {
  const out = process.argv[jsonIdx + 1] || 'i18n-missing.json';
  fs.writeFileSync(out, JSON.stringify(missing.map(([k, at]) => ({ k, at })), null, 1));
  console.log(`wrote ${missing.length} entries to ${out}`);
} else {
  for (const [k, at] of missing) console.log(`${JSON.stringify(k)}  ← ${at.join(', ')}`);
  console.log(`\n${found.size} strings scanned, ${missing.length} missing in at least one dictionary.`);
}
process.exitCode = missing.length ? 1 : 0;
