import type { InvoiceOverride, InvoiceRoute, WalletInvoice } from './types';

/** 识别误差（%） */
export const errPct = (i: WalletInvoice) => (i.err[0] / i.err[1]) * 100;

/** 误差 ≥ 20% 标红 */
export const isHighErr = (pct: number) => pct >= 20;

/** 列表里的路由说明（简体中文原文） */
export function routeLabel(r: InvoiceRoute): string {
  return r === 'PO' ? '有 PO → 三单匹配' : r === '费控' ? '无 PO → 费控' : '合同 → 两单匹配';
}

/** 详情抬头里的路由简称（简体中文原文） */
export function routeShort(r: InvoiceRoute): string {
  return r === 'PO' ? '有 PO' : r === '费控' ? '无 PO · 费控' : '合同';
}

/** 叠加本页写操作结果后的状态 */
export function effective(inv: WalletInvoice, over: Record<string, InvoiceOverride>) {
  const o = over[inv.no] ?? {};
  return { m: o.m ?? inv.m, ap: o.ap ?? inv.ap, ex: o.ex ?? inv.ex };
}
