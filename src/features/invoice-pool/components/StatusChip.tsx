import { Chip } from '@/components/ui';
import { useT } from '@/i18n';
import { ST } from '../format';
import type { InvoiceRow } from '../types';
import pal from '../palette.module.css';

/** 状态标签：审核中会带上审核单据类型 */
export function StatusChip({ row }: { row: Pick<InvoiceRow, 'status' | 'review'> }) {
  const t = useT();
  const st = ST[row.status];
  const text = t(st.label + (row.status === 'review' ? ' · ' + row.review : ''));
  if (st.tone === 'navy') return <Chip className={pal.chipNavy}>{text}</Chip>;
  return <Chip tone={st.tone}>{text}</Chip>;
}
