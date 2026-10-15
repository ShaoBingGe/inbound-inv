import { Button, Card, Chip, LinkButton, Table, type Tone } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { fmtMoney } from '../format';
import type { InvoiceRow } from '../types';
import { StatusChip } from './StatusChip';
import s from '../InvoicePoolPage.module.css';

function flagTone(r: InvoiceRow): Tone {
  if (r.flagKey === 'rev') return 'red';
  if (r.flagKey === 'due') return 'orange';
  if (r.flag === '识别已更正') return 'purple';
  return 'orange';
}

export function InvoiceTable({
  rows,
  total,
  money,
  onOpen,
  onMore,
}: {
  /** 当前显示的行 */
  rows: InvoiceRow[];
  /** 筛选结果总数 */
  total: number;
  money: { sym: string; dp: number };
  onOpen: (id: string) => void;
  onMore: () => void;
}) {
  const t = useT();
  return (
    <Card padded={false} aria-label={t('发票列表')}>
      <Table hoverRows className={s.listTable}>
        <thead>
          <tr>
            <th>{t('发票号码 / 票种')}</th>
            <th>{t('开票日期')}</th>
            <th>{t('供应商')}</th>
            <th className={s.end}>{t('不含税金额')}</th>
            <th className={s.end}>{t('税额')}</th>
            <th className={s.end}>{t('价税合计')}</th>
            <th>{t('状态')}</th>
            <th>{t('关联单据')}</th>
            <th>{t('采集渠道')}</th>
            <th>{t('标记')}</th>
            <th>
              <span className="sr-only">{t('明细')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <LinkButton className="mono" onClick={() => onOpen(r.id)} translate="no">
                  {r.no}
                </LinkButton>
                <div className={s.sub}>{t(r.kind)}</div>
              </td>
              <td className="num">{r.date}</td>
              <td>
                <div className={s.supName} translate="no">
                  {r.sup}
                </div>
                <div className={cx('mono', s.sub)}>
                  {r.supCode} · {t(r.ind)}
                </div>
              </td>
              <td className={cx('num', s.end)}>{fmtMoney(money, r.net)}</td>
              <td className={cx('num', s.end)}>{fmtMoney(money, r.tax)}</td>
              <td className={cx('num', s.end, s.totalCell)}>{fmtMoney(money, r.total)}</td>
              <td>
                <StatusChip row={r} />
              </td>
              <td className={cx('mono', s.docCell)}>{r.doc}</td>
              <td className={s.muted2}>{t(r.channel)}</td>
              <td>{r.flag ? <Chip tone={flagTone(r)}>{t(r.flag)}</Chip> : null}</td>
              <td>
                <Button size="sm" onClick={() => onOpen(r.id)}>
                  {t('明细')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {!total ? <div className={s.emptyList}>{t('没有符合条件的发票')}</div> : null}
      <div className={s.listFoot}>
        <span className={cx('num', s.muted2)}>
          {t('显示')} {Math.min(rows.length, total)} / {total}
        </span>
        <span className={s.grow} />
        <Button onClick={onMore} disabled={rows.length >= total}>
          {t('加载更多')}
        </Button>
      </div>
    </Card>
  );
}
