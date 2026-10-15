import type { InvoiceRow, PoolFilters, StatusKey } from './types';

export const EMPTY_FILTERS: PoolFilters = {
  status: 'all',
  q: '',
  kind: '',
  review: '',
  channel: '',
  ind: '',
  amtMin: '',
  amtMax: '',
  dFrom: '',
  dTo: '',
  flag: '',
};

function num(s: string): number | null {
  const v = parseFloat(String(s).replace(/[^0-9.]/g, ''));
  return isNaN(v) ? null : v;
}

/** 除状态卡片外的全部筛选条件 */
export function applyFilters(rows: InvoiceRow[], f: PoolFilters): InvoiceRow[] {
  const q = f.q.trim().toLowerCase();
  const mn = num(f.amtMin);
  const mx = num(f.amtMax);
  return rows.filter(
    (r) =>
      (!q || (r.no + ' ' + r.sup + ' ' + r.supCode + ' ' + r.po + ' ' + r.doc).toLowerCase().indexOf(q) >= 0) &&
      (!f.kind || r.kind === f.kind) &&
      (!f.review || r.review === f.review) &&
      (!f.channel || r.channel === f.channel) &&
      (!f.ind || r.ind === f.ind) &&
      (mn === null || r.total >= mn) &&
      (mx === null || r.total <= mx) &&
      (!f.dFrom || r.date >= f.dFrom) &&
      (!f.dTo || r.date <= f.dTo) &&
      (!f.flag || (f.flag === 'any' ? !!r.flag : r.flagKey === f.flag)),
  );
}

export function byStatus(base: InvoiceRow[], s: StatusKey): InvoiceRow[] {
  if (s === 'all') return base;
  if (s === 'due') return base.filter((r) => r.flagKey === 'due');
  if (s === 'flag') return base.filter((r) => r.flag && r.flagKey !== 'due');
  return base.filter((r) => r.status === s);
}

export interface StatusCardDef {
  key: StatusKey;
  /** 简体中文原文 */
  label: string;
  /** 圆点颜色（CSS 变量） */
  dot: string;
  rows: InvoiceRow[];
  /** 简体中文原文（含数字拼接） */
  sub: string;
}

export function statusCards(base: InvoiceRow[]): StatusCardDef[] {
  const rv = base.filter((r) => r.status === 'review');
  return [
    { key: 'all', label: '全部', dot: 'var(--muted)', rows: base, sub: '审核中 + 已入账 + 已付款' },
    {
      key: 'review',
      label: '审核中',
      dot: 'var(--orange-soft)',
      rows: rv,
      sub: 'AP 单 ' + rv.filter((r) => r.review === 'AP单').length + ' · 费控单 ' + rv.filter((r) => r.review === '费控单').length,
    },
    { key: 'posted', label: '已入账', dot: 'var(--accent)', rows: base.filter((r) => r.status === 'posted'), sub: '凭证已生成，待付款' },
    { key: 'paid', label: '已付款', dot: 'var(--navy)', rows: base.filter((r) => r.status === 'paid'), sub: '银行回单已核销' },
    { key: 'due', label: '30 天内到期待付', dot: 'var(--amber)', rows: base.filter((r) => r.flagKey === 'due'), sub: '已入账 · 按付款条件计算' },
    { key: 'flag', label: '需关注', dot: 'var(--alert)', rows: base.filter((r) => r.flag && r.flagKey !== 'due'), sub: '差异、超标、红冲、更正' },
  ];
}

export const sortByDateDesc = (rows: InvoiceRow[]) => rows.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
