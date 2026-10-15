import { useEffect, useMemo, useState } from 'react';
import { Card, Chip, ErrorState, Input, LinkButton, Modal, Select, Spinner, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { useAsync } from '@/lib/useAsync';
import type { CountryCode } from '../../types';
import { fetchPayables } from '../../match/api';
import { ADJ_LABEL, DATE_RANGES, DEFAULT_RANGE, PAYABLE_STATUS } from '../../match/data';
import { cny } from '../../match/logic';
import type { Payable, PayableStatus } from '../../match/types';
import { NoMatchData } from '../match/NoMatchData';
import s from './ap.module.css';

const STATUS_ORDER: PayableStatus[] = ['pushed', 'posted', 'unpaid', 'paid'];

/** 应付单查询：三单匹配确认 / 下推生成的应付单，仅查询不可修改 */
export function PayablesView({
  country,
  initialQuery,
  onPickCountry,
}: {
  country: CountryCode;
  initialQuery: string;
  onPickCountry?: () => void;
}) {
  const t = useT();
  const list = useAsync(() => fetchPayables(country), [country]);
  const [q, setQ] = useState(initialQuery);
  const [st, setSt] = useState<'all' | PayableStatus>('all');
  const [sup, setSup] = useState('all');
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [detail, setDetail] = useState<Payable | null>(null);
  useEffect(() => setQ(initialQuery), [initialQuery]);

  const rows = useMemo(() => list.data ?? [], [list.data]);
  const sups = useMemo(() => [...new Set(rows.map((r) => r.sup))], [rows]);
  const query = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (st === 'all' || r.st === st) &&
      (sup === 'all' || r.sup === sup) &&
      (!query || `${r.id} ${r.mg} ${r.sup} ${r.buyer}`.toLowerCase().includes(query)),
  );

  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!list.data) return <Spinner label={t('加载中')} />;
  if (!rows.length) return <NoMatchData onPickCountry={onPickCountry} />;

  return (
    <div className={s.wrap}>
      <div className={s.toolbar} role="group" aria-label={t('过滤条件')}>
        <Input
          className={s.search}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('搜索应付单号 / 匹配组 / 供应商')}
          aria-label={t('搜索应付单号 / 匹配组 / 供应商')}
        />
        <Select
          aria-label={t('状态')}
          value={st}
          onChange={(v) => setSt(v as 'all' | PayableStatus)}
          options={[
            { value: 'all', label: t('全部状态') },
            ...STATUS_ORDER.map((k) => ({
              value: k,
              label: t(PAYABLE_STATUS[k].label),
            })),
          ]}
        />
        <Select aria-label={t('供应商')} value={sup} onChange={setSup}>
          <option value="all">{t('全部供应商')}</option>
          {sups.map((x) => (
            <option key={x} value={x} translate="no">
              {x}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('时间区间')}
          value={range}
          onChange={setRange}
          options={DATE_RANGES.map((r) => ({ value: r, label: t(r) }))}
        />
        <Chip tone="purple">{t('仅查询 · 不可修改')}</Chip>
        <span className={cx('num', s.total)}>
          {t('共 ' + shown.length + ' 张 · 合计')} {cny(shown.reduce((a, r) => a + r.amt, 0))}
        </span>
      </div>

      <Card padded={false}>
        <Table hoverRows className={s.table}>
          <thead>
            <tr>
              <th>{t('应付单号')}</th>
              <th>{t('匹配组')}</th>
              <th>{t('供应商')}</th>
              <th>{t('购买入库组织')}</th>
              <th className={s.r}>{t('明细数量')}</th>
              <th className={s.r}>{t('应付金额')}</th>
              <th>{t('状态')}</th>
              <th>{t('创建人')}</th>
              <th className={s.r}>{t('创建时间')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const meta = PAYABLE_STATUS[r.st];
              return (
                <tr key={r.id}>
                  <td>
                    <LinkButton className="mono" onClick={() => setDetail(r)}>
                      {r.id}
                    </LinkButton>
                  </td>
                  <td className="mono">{r.mg}</td>
                  <td translate="no">{r.sup}</td>
                  <td translate="no">{r.buyer}</td>
                  <td className={cx('num', s.r)}>
                    {r.lines.length} {t('明细行')}
                  </td>
                  <td className={cx('num', s.r, s.strong)}>{cny(r.amt)}</td>
                  <td>
                    <Chip tone={meta.tone}>{t(meta.label)}</Chip>
                  </td>
                  <td translate={r.creator ? 'no' : undefined}>{r.creator ?? t('系统·自动下推')}</td>
                  <td className={cx('num', s.r)}>{r.at}</td>
                </tr>
              );
            })}
            {!shown.length ? (
              <tr>
                <td colSpan={9} className={s.empty}>
                  {t('无符合条件的应付单')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </Card>

      <PayableDetail p={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function PayableDetail({ p, onClose }: { p: Payable | null; onClose: () => void }) {
  const t = useT();
  if (!p) return null;
  const meta = PAYABLE_STATUS[p.st];
  const total = p.lines.reduce((a, l) => a + l.qty * l.price, 0);
  return (
    <Modal
      open
      onClose={onClose}
      width={880}
      title={
        <div>
          <div className={s.detTitle}>
            <span className="mono">{p.id}</span>
            <Chip tone={meta.tone}>{t(meta.label)}</Chip>
            <span className={s.muted}>{t('仅查询')}</span>
          </div>
          <div className={s.detSub}>
            <span className="mono">{p.mg}</span> · <span translate="no">{p.sup}</span> →{' '}
            <span translate="no">{p.buyer}</span> ·{' '}
            <span translate={p.creator ? 'no' : undefined}>{p.creator ?? t('系统·自动下推')}</span> ·{' '}
            <span className="num">{p.at}</span>
          </div>
        </div>
      }
      footer={
        <div className={s.detFoot}>
          <span className={s.muted}>{t('共 ' + p.lines.length + ' 行明细')}</span>
          <span className={s.muted}>{t('应付合计')}</span>
          <span className={cx('num', s.detTotal)}>{cny(total)}</span>
        </div>
      }
    >
      <Table className={s.lineTable}>
        <thead>
          <tr>
            <th>#</th>
            <th>{t('商品名称')}</th>
            <th>{t('规格型号')}</th>
            <th>{t('行类型')}</th>
            <th className={s.r}>{t('数量')}</th>
            <th className={s.r}>{t('单价')}</th>
            <th className={s.r}>{t('金额')}</th>
            <th className={s.r}>{t('来源发票 / 入库单')}</th>
          </tr>
        </thead>
        <tbody>
          {p.lines.map((l, i) => {
            const lt = l.lt ? ADJ_LABEL[l.lt] : null;
            return (
              <tr key={i}>
                <td className={cx('num', s.muted)}>{String(i + 1).padStart(2, '0')}</td>
                <td translate="no" className={s.strong}>
                  {l.name}
                </td>
                <td translate="no">{l.spec}</td>
                <td>{lt ? <Chip tone={lt.tone}>{t(lt.label)}</Chip> : <Chip>{t('入库单')}</Chip>}</td>
                <td className={cx('num', s.r)}>
                  {l.qty.toLocaleString('en-US')} <span translate="no">{l.unit}</span>
                </td>
                <td className={cx('num', s.r)}>¥{l.price.toLocaleString('en-US')}</td>
                <td className={cx('num', s.r, s.strong)}>{cny(l.qty * l.price)}</td>
                <td className={cx('mono', s.r, s.refs)}>
                  {l.inv} / {l.gr}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Modal>
  );
}
