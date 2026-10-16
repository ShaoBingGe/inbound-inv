import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Chip, Empty, ErrorState, PageBody, PageHeader, PageLoading, Section, Select, Spinner } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { canSeeCountry } from '@/auth/types';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { fetchWalletOverview, fetchWalletSuppliers } from './api';
import { fetchMatchSummary } from './match/api';
import { FlowNav, type WalletView, type WalletStats } from './components/FlowNav';
import { InvoiceDrawer } from './components/InvoiceDrawer';
import { InvoiceTable } from './components/InvoiceTable';
import { DrugMappingView } from './components/drugs/DrugMappingView';
import { MatchBoard } from './components/match/MatchBoard';
import { PayablesView } from './components/ap/PayablesView';
import { SupplierList } from './components/SupplierList';
import type { CountryCode, CountrySuppliers, DetailTab, InvoiceOverride, WalletInvoice } from './types';
import styles from './SupplierWalletPage.module.css';

const VIEWS: WalletView[] = ['wallet', 'match', 'ap', 'drugs'];
const asView = (v: string | null): WalletView => VIEWS.find((k) => k === v) ?? 'wallet';

export default function SupplierWalletPage() {
  const t = useT();
  const { user } = useAuth();
  const overview = useAsync(fetchWalletOverview, []);
  const [params, setParams] = useSearchParams();
  const view = asView(params.get('view'));
  const query = params.get('q') ?? '';
  const setView = (v: WalletView, q?: string) => setParams(v === 'wallet' ? {} : q ? { view: v, q } : { view: v });

  // 默认中国大陆（主数据中心），三单匹配示例数据位于此
  const [ctyPick, setCtyPick] = useState<CountryCode>('CN');
  const [supCode, setSupCode] = useState<string | null>(null);
  const [invNo, setInvNo] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>('match');
  const [over, setOver] = useState<Record<string, InvoiceOverride>>({});

  /** 国家切换器只列出用户可见的国家（后端同样校验） */
  const countries = useMemo(
    () => (overview.data?.countries ?? []).filter((c) => canSeeCountry(user, c.code)),
    [overview.data, user],
  );
  const country = countries.find((c) => c.code === ctyPick) ?? countries[0];
  const cty = country?.code;

  // 切换视图时重新取数：票夹里的匹配状态、流程导航的待处理量都跟随三单匹配的写操作变化
  const sups = useAsync<CountrySuppliers | null>(
    () => (cty ? fetchWalletSuppliers(cty) : Promise.resolve(null)),
    [cty, view],
  );
  const summary = useAsync(() => (cty ? fetchMatchSummary(cty) : Promise.resolve(null)), [cty, view]);

  const onPatch = useCallback((no: string, patch: InvoiceOverride) => {
    setOver((o) => ({ ...o, [no]: { ...o[no], ...patch } }));
  }, []);
  const closeDetail = useCallback(() => setInvNo(null), []);

  if (overview.loading && !overview.data) return <PageLoading />;
  if (overview.error) return <ErrorState error={overview.error} onRetry={overview.reload} />;

  const pickCountry = (code: CountryCode) => {
    setCtyPick(code);
    setSupCode(null);
    setInvNo(null);
  };

  const header = (
    <PageHeader
      crumb={`${t('票池')} / ${t('供应商票夹')}`}
      title={
        <span className={styles.titleRow}>
          {t('供应商票夹')}
          <Chip tone="gray">{t('示例数据')}</Chip>
        </span>
      }
      subtitle={
        country
          ? t(
              country.name +
                '的票夹数据存放于 ' +
                country.dc +
                '；只有被授权到该国家的人员可查看票面与影像，其他国家仅能在全球看板看到汇总指标。',
            )
          : undefined
      }
      actions={
        country ? (
          <div className={styles.headStats}>
            <label className={styles.countryPick}>
              <span className="kick">{t('国家 / 数据中心')}</span>
              <Select
                value={country.code}
                onChange={(v) => pickCountry(v as CountryCode)}
                options={countries.map((c) => ({ value: c.code, label: `${t(c.name)} · ${c.invoiceCount}` }))}
              />
            </label>
            <div>
              <div className="kick">{t('本国票夹字段误差率')}</div>
              <div className={`num ${styles.headStatValue}`}>{country.err}</div>
            </div>
            <div>
              <div className="kick">{t('三单匹配自动通过率')}</div>
              <div className={`num ${styles.headStatValue}`}>{country.auto}</div>
            </div>
            <div>
              <div className="kick">{t('AP 无人工过账率')}</div>
              <div className={`num ${styles.headStatValue}`}>{country.touchless}</div>
            </div>
          </div>
        ) : null
      }
    />
  );

  if (!country) {
    return (
      <>
        {header}
        <PageBody className={styles.body}>
          <Empty />
        </PageBody>
      </>
    );
  }

  const ready = sups.data && sups.data.country === country.code ? sups.data.suppliers : null;
  const supplier = ready ? (ready.find((s) => s.code === supCode) ?? ready[0]) : undefined;
  const invoice = supplier?.invs.find((i) => i.no === invNo) ?? null;
  const walletStats: WalletStats | null = ready
    ? {
        invoices: ready.reduce((a, s) => a + s.invs.length, 0),
        suppliers: ready.length,
        po: ready.reduce((a, s) => a + s.invs.filter((i) => i.route === 'PO').length, 0),
      }
    : null;

  /** 示例数据的三单匹配位于中国大陆；当前国家无数据时提供切换 */
  const pickCn = country.code !== 'CN' && countries.some((c) => c.code === 'CN') ? () => pickCountry('CN') : undefined;

  const openInvoice = (i: WalletInvoice) => {
    setInvNo(i.no);
    setTab(i.route === '费控' ? 'exp' : 'match');
  };
  /** 从票夹进入三单匹配：按供应商过滤匹配组 */
  const goMatch = (supplierName?: string) => {
    setInvNo(null);
    setView('match', supplierName);
  };

  return (
    <>
      {header}
      <PageBody className={styles.body}>
        <FlowNav view={view} onView={(v) => setView(v)} wallet={walletStats} match={summary.data ?? null} />

        {view === 'match' ? (
          <MatchBoard
            key={query}
            country={country.code}
            initialSupplier={query}
            onPickCountry={pickCn}
            onChange={summary.reload}
          />
        ) : null}
        {view === 'ap' ? <PayablesView country={country.code} initialQuery={query} onPickCountry={pickCn} /> : null}
        {view === 'drugs' ? <DrugMappingView country={country.code} onPickCountry={pickCn} /> : null}

        {view !== 'wallet' ? null : sups.error ? (
          <ErrorState error={sups.error} onRetry={sups.reload} />
        ) : !ready || !supplier ? (
          ready && !supplier ? (
            <Empty />
          ) : (
            <div className={styles.loadingBox}>
              <Spinner label={t('加载中')} />
            </div>
          )
        ) : (
          <div className={styles.split}>
            <SupplierList suppliers={ready} selected={supplier.code} over={over} onPick={(code) => setSupCode(code)} />
            <InvoiceTable
              supplier={supplier}
              selectedInv={invNo}
              over={over}
              onOpen={openInvoice}
              onMatch={() => goMatch(supplier.invs.some((i) => i.mg) ? supplier.name : undefined)}
            />
          </div>
        )}

        {view === 'wallet' ? (
          <Section title={t('票夹到下游的路由规则')}>
            <div className={styles.ruleGrid}>
              {(overview.data?.routes ?? []).map((r) => (
                <div key={r.when} className={styles.rule}>
                  <div>
                    <Chip tone="blue">{t(r.when)}</Chip>
                  </div>
                  <div className={styles.ruleTo}>{t(r.to)}</div>
                  <div className={styles.ruleHow}>{t(r.how)}</div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}
      </PageBody>

      {supplier && view === 'wallet' ? (
        <InvoiceDrawer
          invoice={invoice}
          supplier={supplier}
          country={country}
          over={over}
          tab={tab}
          onTab={setTab}
          onClose={closeDetail}
          onPatch={onPatch}
        />
      ) : null}
    </>
  );
}
