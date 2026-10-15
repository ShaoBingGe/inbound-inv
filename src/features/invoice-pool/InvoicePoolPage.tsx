import { useMemo, useState } from 'react';
import { Chip, Empty, ErrorState, Field, PageBody, PageHeader, PageLoading, Select, useToast } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { canSeeCountry } from '@/auth/types';
import { useT } from '@/i18n';
import { isMock } from '@/lib/http';
import { useAsync } from '@/lib/useAsync';
import { cx } from '@/lib/sample';
import { exportPoolInvoices, fetchOrgCatalog, fetchPoolInvoices } from './api';
import { applyFilters, byStatus, EMPTY_FILTERS, sortByDateDesc, statusCards } from './filter';
import { fmtMoney, rnd2 } from './format';
import type { InvoiceRow, OrgQuery, Period, PoolFilters, StatusKey } from './types';
import { FilterPanel } from './components/FilterPanel';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { InvoiceTable } from './components/InvoiceTable';
import { StatusCards } from './components/StatusCards';
import pal from './palette.module.css';
import s from './InvoicePoolPage.module.css';

const PAGE_SIZE = 25;
const PERIODS: { value: Period; label: string }[] = [
  { value: '2026-10', label: '2026-10（本月）' },
  { value: '2026-09', label: '2026-09' },
  { value: '2026-08', label: '2026-08' },
  { value: 'q', label: '近 3 个月' },
];
const isPeriod = (v: string): v is Period => PERIODS.some((p) => p.value === v);

export default function InvoicePoolPage() {
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();

  const catalog = useAsync(fetchOrgCatalog, []);
  const [org, setOrg] = useState<OrgQuery>({ country: 'CN', entity: 'CN-SH-01', period: '2026-10' });
  const [f, setF] = useState<PoolFilters>(EMPTY_FILTERS);
  const [show, setShow] = useState(PAGE_SIZE);
  const [open, setOpen] = useState<{ id: string; seq: number } | null>(null);
  const [exporting, setExporting] = useState(false);

  /* 国家 / 主体切换器只列出用户可见范围 */
  const countries = useMemo(
    () => (catalog.data?.countries ?? []).filter((c) => canSeeCountry(user, c.code)),
    [catalog.data, user],
  );
  const cc = countries.find((c) => c.code === org.country) ?? countries[0];
  const ents = useMemo(
    () => (catalog.data?.entities ?? []).filter((e) => cc && e.country === cc.code),
    [catalog.data, cc],
  );
  const entity = org.entity === 'ALL' || ents.some((e) => e.code === org.entity) ? org.entity : (ents[0]?.code ?? 'ALL');
  const q: OrgQuery | null = cc ? { country: cc.code, entity, period: org.period } : null;

  const pool = useAsync<InvoiceRow[]>(() => (q ? fetchPoolInvoices(q) : Promise.resolve([])), [q?.country, q?.entity, q?.period]);

  const base = useMemo(() => applyFilters(pool.data ?? [], f), [pool.data, f]);
  const cards = useMemo(() => statusCards(base), [base]);
  const list = useMemo(() => sortByDateDesc(byStatus(base, f.status)), [base, f.status]);
  const ids = useMemo(() => list.map((r) => r.id), [list]);

  if (catalog.loading && !catalog.data) return <PageLoading />;
  if (catalog.error) return <ErrorState error={catalog.error} onRetry={catalog.reload} />;

  const money = cc ? { sym: cc.sym, dp: cc.dp } : { sym: '', dp: 2 };
  const sumAmt = (rs: InvoiceRow[]) => fmtMoney(money, rnd2(rs.reduce((a, r) => a + r.total, 0), money.dp));
  const ent = ents.find((e) => e.code === entity);

  const setFilter = (k: Exclude<keyof PoolFilters, 'status'>, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setShow(PAGE_SIZE);
  };
  const onCountry = (v: string) => {
    const c = countries.find((x) => x.code === v);
    if (!c) return;
    const first = (catalog.data?.entities ?? []).find((x) => x.country === c.code);
    setOrg((o) => ({ ...o, country: c.code, entity: first ? first.code : 'ALL' }));
    setF((p) => ({ ...p, status: 'all', kind: '' }));
    setShow(PAGE_SIZE);
  };
  const pickStatus = (k: StatusKey) => {
    setF((p) => ({ ...p, status: p.status === k && k !== 'all' ? 'all' : k }));
    setShow(PAGE_SIZE);
  };
  const onExport = () => {
    if (!q) return;
    setExporting(true);
    exportPoolInvoices(q, f, list.length)
      .then((r) => toast(t('已按当前筛选导出 ' + r.count + ' 张发票（Excel）')))
      .catch((e: unknown) => toast(e instanceof Error ? e.message : String(e), { error: true }))
      .finally(() => setExporting(false));
  };

  const orgBar = !cc
    ? null
    : entity === 'CN-SH-01'
      ? {
          alt: false,
          tag: t('当前组织'),
          tone: 'blue' as const,
          name: 'CN-SH-01 ' + t('上海分公司'),
          meta: t('中国大陆 · 本位币 CNY · 数据中心 CN-QD'),
          note: t('默认展示本月进入审核中、已入账、已付款的发票'),
        }
      : {
          alt: true,
          tag: t('已切换组织'),
          tone: 'orange' as const,
          name: entity === 'ALL' ? t(cc.name + ' · 全部企业') : entity + ' ' + (ent ? t(ent.name) : ''),
          meta: t(cc.name + ' · 本位币 ' + cc.cur + ' · 数据中心 ' + cc.dc),
          note:
            cc.dc === 'CN-QD'
              ? t('同一数据中心，按法人授权查看')
              : t('跨数据中心查看：票面明细按 ' + cc.dc + ' 授权实时读取，不落地到本地'),
        };

  const statusLabel = f.status === 'all' ? '' : (cards.find((c) => c.key === f.status)?.label ?? '');

  return (
    <div className={pal.palette}>
      <PageHeader
        crumb={`${t('票池')} / ${t('企业票池')}`}
        title={t('企业票池')}
        badges={isMock() ? <Chip tone="gray">{t('示例数据')}</Chip> : undefined}
        actions={
          cc ? (
            <div className={s.orgPick}>
              <Field label={t('国家 / 地区')}>
                {(id) => (
                  <Select
                    id={id}
                    className={s.selCountry}
                    value={cc.code}
                    onChange={onCountry}
                    options={countries.map((c) => ({ value: c.code, label: t(c.name) + ' · ' + c.cur }))}
                  />
                )}
              </Field>
              <Field label={t('企业')}>
                {(id) => (
                  <Select
                    id={id}
                    className={s.selEntity}
                    value={entity}
                    onChange={(v) => {
                      setOrg((o) => ({ ...o, entity: v }));
                      setShow(PAGE_SIZE);
                    }}
                    options={[
                      { value: 'ALL', label: t('该国全部企业（' + ents.length + '）') },
                      ...ents.map((e) => ({ value: e.code, label: e.code + ' ' + t(e.name) })),
                    ]}
                  />
                )}
              </Field>
              <Field label={t('期间')}>
                {(id) => (
                  <Select
                    id={id}
                    className={s.selPeriod}
                    value={org.period}
                    onChange={(v) => {
                      if (isPeriod(v)) setOrg((o) => ({ ...o, period: v }));
                      setShow(PAGE_SIZE);
                    }}
                    options={PERIODS.map((p) => ({ value: p.value, label: t(p.label) }))}
                  />
                )}
              </Field>
            </div>
          ) : undefined
        }
      />
      <PageBody className={s.body}>
        {!cc || !orgBar ? (
          <Empty />
        ) : (
          <>
            <div className={cx(s.orgBar, orgBar.alt && s.orgBarAlt)}>
              <Chip tone={orgBar.tone}>{orgBar.tag}</Chip>
              <span className={s.strong}>{orgBar.name}</span>
              <span className={s.muted2}>{orgBar.meta}</span>
              <span className={s.grow} />
              <span className={s.orgNote}>{orgBar.note}</span>
            </div>

            {pool.error ? (
              <ErrorState error={pool.error} onRetry={pool.reload} />
            ) : pool.loading && !pool.data ? (
              <PageLoading />
            ) : (
              <>
                <StatusCards cards={cards} value={f.status} money={money} onPick={pickStatus} />
                <FilterPanel
                  f={f}
                  kinds={cc.kinds}
                  curCode={cc.cur}
                  resultN={list.length}
                  resultAmt={sumAmt(list)}
                  statusLabel={statusLabel}
                  onChange={setFilter}
                  onReset={() => {
                    setF(EMPTY_FILTERS);
                    setShow(PAGE_SIZE);
                  }}
                  onExport={onExport}
                  exporting={exporting}
                />
                <InvoiceTable
                  rows={list.slice(0, show)}
                  total={list.length}
                  money={money}
                  onOpen={(id) => setOpen((o) => ({ id, seq: (o?.seq ?? 0) + 1 }))}
                  onMore={() => setShow((n) => n + PAGE_SIZE)}
                />
              </>
            )}
          </>
        )}
      </PageBody>

      {open ? (
        <InvoiceDetailModal
          key={open.seq}
          id={open.id}
          ids={ids}
          onNavigate={(id) => setOpen((o) => (o ? { ...o, id } : o))}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}
