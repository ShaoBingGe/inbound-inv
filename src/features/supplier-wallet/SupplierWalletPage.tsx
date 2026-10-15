import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Chip, Empty, ErrorState, Icon, PageBody, PageHeader, PageLoading, Section, Spinner, Tabs } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { canSeeCountry } from '@/auth/types';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { fetchWalletOverview, fetchWalletSuppliers } from './api';
import { InvoiceDrawer } from './components/InvoiceDrawer';
import { InvoiceTable } from './components/InvoiceTable';
import { DrugMappingView } from './components/drugs/DrugMappingView';
import { MatchBoard } from './components/match/MatchBoard';
import { PayablesView } from './components/ap/PayablesView';
import { SupplierList } from './components/SupplierList';
import type { CountryCode, CountrySuppliers, DetailTab, InvoiceOverride, WalletInvoice } from './types';
import styles from './SupplierWalletPage.module.css';

/** 票夹内的视图：票夹（按供应商）/ 三单匹配 / 应付单 / 药品匹配关系 */
type WalletView = 'wallet' | 'match' | 'ap' | 'drugs';
const VIEWS: Array<[WalletView, string]> = [
  ['wallet', '票夹'],
  ['match', '三单匹配'],
  ['ap', '应付单'],
  ['drugs', '药品匹配关系'],
];
const asView = (v: string | null): WalletView => VIEWS.find(([k]) => k === v)?.[0] ?? 'wallet';

export default function SupplierWalletPage() {
  const t = useT();
  const { user } = useAuth();
  const overview = useAsync(fetchWalletOverview, []);
  const [params, setParams] = useSearchParams();
  const view = asView(params.get('view'));
  const setView = (v: WalletView) => setParams(v === 'wallet' ? {} : { view: v });

  const [ctyPick, setCtyPick] = useState<CountryCode>(view === 'wallet' ? 'JP' : 'CN');
  const [supCode, setSupCode] = useState<string | null>('SUP-0013397');
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

  const sups = useAsync<CountrySuppliers | null>(
    () => (cty && view === 'wallet' ? fetchWalletSuppliers(cty) : Promise.resolve(null)),
    [cty, view === 'wallet'],
  );

  const onPatch = useCallback((no: string, patch: InvoiceOverride) => {
    setOver((o) => ({ ...o, [no]: { ...o[no], ...patch } }));
  }, []);
  const closeDetail = useCallback(() => setInvNo(null), []);

  if (overview.loading && !overview.data) return <PageLoading />;
  if (overview.error) return <ErrorState error={overview.error} onRetry={overview.reload} />;

  const header = (
    <PageHeader
      crumb={`${t('票池')} / ${t('供应商票夹')}`}
      title={t('供应商票夹')}
      badges={<Chip tone="gray">{t('示例数据')}</Chip>}
      actions={
        country ? (
          <div className={styles.headStats}>
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
    >
      {countries.length ? (
        <div className={styles.countryRow}>
          <Tabs
            ariaLabel={t('国家')}
            value={country?.code ?? 'JP'}
            onChange={(k) => {
              setCtyPick(k);
              setSupCode(null);
              setInvNo(null);
            }}
            items={countries.map((c) => ({
              value: c.code,
              label: (
                <>
                  {t(c.name)}
                  <span className={`num ${styles.countN}`}>{c.invoiceCount}</span>
                </>
              ),
            }))}
          />
        </div>
      ) : null}
    </PageHeader>
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

  /** 示例数据的三单匹配位于中国大陆；当前国家无数据时提供切换 */
  const pickCn =
    country.code !== 'CN' && countries.some((c) => c.code === 'CN')
      ? () => {
          setCtyPick('CN');
          setSupCode(null);
          setInvNo(null);
        }
      : undefined;

  const openInvoice = (i: WalletInvoice) => {
    setInvNo(i.no);
    setTab(i.route === '费控' ? 'exp' : 'match');
  };

  return (
    <>
      {header}
      <PageBody className={styles.body}>
        <div className={styles.residency}>
          <Icon d="M4 4h16v6H4zM4 14h16v6H4z" strokeWidth={1.6} />
          <span>
            {t(
              country.name +
                '的票夹数据存放于 ' +
                country.dc +
                '；只有被授权到该国家的人员可查看票面与影像，其他国家仅能在全球看板看到汇总指标。',
            )}
          </span>
        </div>

        <Tabs
          ariaLabel={t('票夹视图')}
          value={view}
          onChange={setView}
          items={VIEWS.map(([v, label]) => ({ value: v, label: t(label) }))}
        />

        {view === 'match' ? <MatchBoard country={country.code} onPickCountry={pickCn} /> : null}
        {view === 'ap' ? (
          <PayablesView country={country.code} initialQuery={params.get('q') ?? ''} onPickCountry={pickCn} />
        ) : null}
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
            <SupplierList
              suppliers={ready}
              selected={supplier.code}
              over={over}
              onPick={(code) => setSupCode(code)}
            />
            <InvoiceTable supplier={supplier} selectedInv={invNo} over={over} onOpen={openInvoice} />
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
