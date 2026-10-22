import type { NameStatus, SpecStatus, TrainingName, TrainingSpec } from './types';

/** 终止学习的键：品名整体 'n:<id>'，单个规格 's:<sid>' */
export const nameKey = (id: string) => `n:${id}`;
export const specKey = (sid: string) => `s:${sid}`;

export function specStatus(s: TrainingSpec, stopped: Set<string>): SpecStatus {
  if (stopped.has(specKey(s.sid))) return 'stopped';
  return s.ok && s.invoices.length > 0 ? 'learned' : 'unlearned';
}

/** 品名学习率 = 已学习规格 / 未终止的规格（与设计稿 getNameStatus 一致） */
export function nameStatus(n: TrainingName, stopped: Set<string>): NameStatus {
  if (stopped.has(nameKey(n.id))) return { ok: false, stopped: true, learned: 0, total: n.specs.length };
  const active = n.specs.filter((s) => !stopped.has(specKey(s.sid)));
  const learned = active.filter((s) => specStatus(s, stopped) === 'learned').length;
  return { ok: active.length > 0 && learned === active.length, stopped: false, learned, total: active.length };
}

/** 「已终止学习」页签里的品名：品名整体终止，或有规格被终止 */
export interface StoppedItem {
  name: TrainingName;
  /** 品名整体终止，或全部规格都已终止 */
  isStopped: boolean;
  nameStopped: boolean;
  stoppedSpecs: number;
}

export function stoppedItems(items: TrainingName[], stopped: Set<string>): StoppedItem[] {
  const out: StoppedItem[] = [];
  items.forEach((n) => {
    const nameStopped = stopped.has(nameKey(n.id));
    const stoppedSpecs = n.specs.filter((s) => stopped.has(specKey(s.sid))).length;
    if (!nameStopped && !stoppedSpecs) return;
    const all = n.specs.length > 0 && stoppedSpecs === n.specs.length;
    out.push({ name: n, isStopped: nameStopped || all, nameStopped, stoppedSpecs });
  });
  return out;
}

/** 已终止的条目数（页签角标） */
export const stoppedCount = (stopped: Set<string>) => stopped.size;

/** 汇总：含规格数、已对上发票的规格数、未匹配规格数 */
export function detailKpis(items: TrainingName[]) {
  let specs = 0;
  let learned = 0;
  items.forEach((n) =>
    n.specs.forEach((s) => {
      specs++;
      if (s.ok && s.invoices.length) learned++;
    }),
  );
  return { specs, learned, unmatched: specs - learned };
}

export const ratioText = (r: number) => (Number.isInteger(r) ? String(r) : r.toFixed(2));
