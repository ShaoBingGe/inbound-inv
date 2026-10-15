/** 全球统一看板 · 视图模型（口径定义、聚合、分级、格式化）。纯函数，不含示例数据。 */
import type { Tone } from '@/components/ui';
import type {
  Agg,
  FieldStatus,
  GroupKey,
  Leaf,
  LevelKey,
  PresetKey,
  Scope,
  StageKey,
  StageMap,
  TreeNode,
} from './types';
import { GLOBAL_SCOPE } from './types';

export interface StageDef {
  k: StageKey;
  label: string;
  group: GroupKey;
  /** CSS 颜色（局部令牌，见 GlobalDashboardPage.module.css .palette） */
  c: string;
}

export const STAGES: StageDef[] = [
  { k: 'collect', label: '采集中', group: 'pending', c: 'var(--gd-stage-collect)' },
  { k: 'taxsync', label: '税局票池同步中', group: 'pending', c: 'var(--gd-stage-taxsync)' },
  { k: 'ap', label: 'AP 单审核中', group: 'review', c: 'var(--gd-stage-ap)' },
  { k: 'exp', label: '费控单审核中', group: 'review', c: 'var(--gd-stage-exp)' },
  { k: 'posted', label: '已入账', group: 'posted', c: 'var(--gd-stage-posted)' },
  { k: 'paid', label: '已付款', group: 'paid', c: 'var(--gd-stage-paid)' },
];

export interface GroupDef {
  k: GroupKey;
  label: string;
  sub: string;
  hint: string;
}

export const GROUPS: GroupDef[] = [
  { k: 'pending', label: '待入账', sub: '采集中 / 税局票池同步中', hint: '未完成识别、查验或税局票池同步，不可生成单据' },
  { k: 'review', label: '审核中', sub: 'AP 单 / 费控单', hint: '已生成 AP 单（三单匹配）或费控报销单，等待审批' },
  { k: 'posted', label: '已入账', sub: '凭证已生成', hint: '已过账生成会计凭证，等待付款排程' },
  { k: 'paid', label: '已付款', sub: '付款已回执', hint: '银行回单已核销，发票生命周期结束' },
];

export const LEVEL_NAME: Record<LevelKey, string> = { region: '地区', country: '国家', prov: '省/州', ind: '行业' };

export interface LevelPreset {
  k: PresetKey;
  label: string;
  lv: LevelKey[];
}

export function levelPresets(scope: Scope): LevelPreset[] {
  return scope === GLOBAL_SCOPE
    ? [
        { k: 'geo', label: '地区 › 国家 › 省份 › 行业', lv: ['region', 'country', 'prov', 'ind'] },
        { k: 'ci', label: '国家 › 行业', lv: ['country', 'ind'] },
        { k: 'ind', label: '行业 › 地区 › 国家', lv: ['ind', 'region', 'country'] },
      ]
    : [
        { k: 'geo', label: '省份 › 行业', lv: ['prov', 'ind'] },
        { k: 'ind', label: '行业 › 省份', lv: ['ind', 'prov'] },
      ];
}

export const FIELD_STATUS: Record<FieldStatus, { label: string; tone: Tone }> = {
  fix: { label: '已人工更正', tone: 'orange' },
  tax: { label: '税局值覆盖', tone: 'blue' },
  ok: { label: '识别正确', tone: 'green' },
  lock: { label: '锁定不可改', tone: 'gray' },
};

/** 文字颜色：改善 / 恶化 / 中性 */
export const GOOD = 'var(--green-ink)';
export const BAD = 'var(--red-ink)';
export const INK = 'var(--ink)';

const zeroStages = (): StageMap => ({ collect: 0, taxsync: 0, ap: 0, exp: 0, posted: 0, paid: 0 });

export function agg(list: Leaf[]): Agg {
  const o = { n: 0, amt: 0, nly: 0, amtly: 0, cnt: zeroStages(), amtS: zeroStages(), timeout: 0, highErr: 0 };
  let accW = 0;
  let accLyW = 0;
  let durW = 0;
  let durLyW = 0;
  list.forEach((l) => {
    o.n += l.n;
    o.amt += l.amt;
    o.nly += l.nly;
    o.amtly += l.amtly;
    STAGES.forEach((s) => {
      o.cnt[s.k] += l.cnt[s.k];
      o.amtS[s.k] += l.amtS[s.k];
    });
    accW += l.acc * l.n;
    accLyW += l.accLy * l.nly;
    durW += l.dur * l.n;
    durLyW += l.durLy * l.nly;
    o.timeout += l.timeout;
    o.highErr += l.highErr;
  });
  return {
    ...o,
    acc: o.n ? accW / o.n : 0,
    accLy: o.nly ? accLyW / o.nly : 0,
    dur: o.n ? durW / o.n : 0,
    durLy: o.nly ? durLyW / o.nly : 0,
  };
}

const LV: Record<LevelKey, (l: Leaf) => [string, string]> = {
  region: (l) => [l.region, l.regionName],
  country: (l) => [l.country, l.countryName],
  prov: (l) => [l.prov, l.prov],
  ind: (l) => [l.ind, l.ind],
};

export function group(list: Leaf[], levels: LevelKey[], prefix = '', depth = 0): TreeNode[] {
  if (!levels.length) return [];
  const key = levels[0];
  const m = new Map<string, { id: string; name: string; items: Leaf[] }>();
  list.forEach((l) => {
    const [id, name] = LV[key](l);
    let g = m.get(id);
    if (!g) {
      g = { id, name, items: [] };
      m.set(id, g);
    }
    g.items.push(l);
  });
  return Array.from(m.values())
    .map((g) => {
      const path = prefix + '/' + g.id;
      return { path, name: g.name, level: key, depth, stats: agg(g.items), kids: group(g.items, levels.slice(1), path, depth + 1) };
    })
    .sort((a, b) => b.stats.amt - a.stats.amt);
}

export const fmtN = (n: number) => Math.round(n).toLocaleString('zh-CN');

/** 金额：≥1 亿用「亿」，≥1 万用「万」（显示时经 t()，按语言转成紧凑数字） */
export function fmtAmt(x: number): string {
  if (x >= 1e8) return (x / 1e8).toFixed(2) + ' 亿';
  if (x >= 1e4) return (x / 1e4).toFixed(1) + ' 万';
  return Math.round(x).toLocaleString('zh-CN');
}

export function yoy(cur: number, ly: number): { v: number; l: string } {
  if (!ly) return { v: 0, l: '—' };
  const v = (cur / ly - 1) * 100;
  return { v, l: (v >= 0 ? '▲ +' : '▼ ') + v.toFixed(1) + '%' };
}

export const signed = (v: number, digits: number) => (v >= 0 ? '+' : '') + v.toFixed(digits);
