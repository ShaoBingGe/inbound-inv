import { useMemo, useState } from 'react';
import { Card, Chip, ErrorState, Field, PageBody, PageHeader, PageLoading, Select, Stat } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { canSeeCountry } from '@/auth/types';
import { useT } from '@/i18n';
import { isMock } from '@/lib/http';
import { useAsync } from '@/lib/useAsync';
import { fetchTaxBoard, fetchTaxDrill } from './api';
import { fmtCount, fmtDelta, fmtLoc } from './format';
import type { CountrySort, TaxBoardData, TaxPeriod, TaxScope, TaxStateId } from './types';
import { TaxStatusPanel } from './components/TaxStatusPanel';
import { TaxTypePanel } from './components/TaxTypePanel';
import { CountryTable } from './components/CountryTable';
import { TrendChart } from './components/TrendChart';
import { RiskTable } from './components/RiskTable';
import { DrillPanel } from './components/DrillPanel';
import styles from './TaxDashboardPage.module.css';

const SCOPE_OPTIONS: Array<{ value: TaxScope; label: string }> = [
  { value: 'GLOBAL', label: '主数据中心 · 全球汇总（折算 CNY）' },
  { value: 'CN', label: '中国大陆' },
  { value: 'JP', label: '日本' },
  { value: 'DE', label: '德国' },
  { value: 'US', label: '美国' },
  { value: 'BR', label: '巴西' },
  { value: 'IN', label: '印度' },
  { value: 'SA', label: '沙特阿拉伯' },
  { value: 'MX', label: '墨西哥' },
];

const PERIOD_OPTIONS: Array<{ value: TaxPeriod; label: string }> = [
  { value: '2026-09', label: '2026-09' },
  { value: '2026-Q3', label: '2026 Q3' },
  { value: '2026', label: '2026 年至今' },
];

const isPeriod = (v: string): v is TaxPeriod => PERIOD_OPTIONS.some((o) => o.value === v);

type KpiTone = 'ink' | 'ink2' | 'red' | 'green' | 'orange';
const TONE: Record<KpiTone, string> = {
  ink: 'var(--ink)',
  ink2: 'var(--ink-2)',
  red: 'var(--red-ink)',
  green: 'var(--green-ink)',
  orange: 'var(--orange-ink)',
};

interface Kpi {
  label: string;
  value: string;
  tone: KpiTone;
  delta: string;
  deltaTone: KpiTone;
  sub: string;
}

function buildKpis(b: TaxBoardData): Kpi[] {
  const { gross, net, rev, pendingAmount, pendingCount, riskCount, yoy } = b.totals;
  const loc = (w: number) => fmtLoc(w, b.currency);
  return [
    { label: '进项税额（毛）', value: loc(gross), tone: 'ink', delta: fmtDelta(yoy), deltaTone: 'ink', sub: '同比' },
    {
      label: '逆向冲减（红字 / Credit note）',
      value: '−' + loc(rev),
      tone: 'red',
      delta: ((rev / Math.max(1, gross)) * 100).toFixed(1) + '%',
      deltaTone: 'red',
      sub: '占毛额',
    },
    { label: '进项税净额', value: loc(net), tone: 'green', delta: fmtDelta(yoy - 0.4, yoy), deltaTone: 'ink', sub: '同比（同口径）' },
    {
      label: '待认证 / 待匹配',
      value: loc(pendingAmount),
      tone: 'orange',
      delta: fmtCount(pendingCount) + ' 张',
      deltaTone: 'orange',
      sub: '阻碍本期抵扣',
    },
    { label: '不可抵扣 / 转出', value: loc(net * 0.05), tone: 'ink', delta: '5.1%', deltaTone: 'ink2', sub: '占净额' },
    {
      label: '风险发票',
      value: fmtCount(riskCount) + ' 张',
      tone: 'red',
      delta: loc(riskCount * 1.9),
      deltaTone: 'red',
      sub: '涉及税额',
    },
  ];
}

export default function TaxDashboardPage() {
  const t = useT();
  const { user } = useAuth();

  // 国家数据隔离：视角切换器只列出可见范围
  const scopeOptions = useMemo(
    () =>
      SCOPE_OPTIONS.filter((o) =>
        o.value === 'GLOBAL' ? !!user?.countries.includes('*') : canSeeCountry(user, o.value),
      ),
    [user],
  );

  const [scope, setScope] = useState<TaxScope>(() => scopeOptions[0]?.value ?? 'GLOBAL');
  const [period, setPeriod] = useState<TaxPeriod>('2026-09');
  const [sort, setSort] = useState<CountrySort>('net');
  const [drill, setDrill] = useState<TaxStateId | null>(null);

  const board = useAsync(() => fetchTaxBoard({ scope, period }), [scope, period]);
  const drillRows = useAsync(
    () => (drill ? fetchTaxDrill({ scope, period, state: drill }) : Promise.resolve(null)),
    [drill, scope, period],
  );

  const onScope = (v: string) => {
    const opt = scopeOptions.find((o) => o.value === v);
    if (!opt) return;
    setScope(opt.value);
    setDrill(null);
  };
  const onPeriod = (v: string) => {
    if (isPeriod(v)) setPeriod(v);
  };

  const scopeSelect: SelectOption[] = scopeOptions.map((o) => ({ value: o.value, label: t(o.label) }));
  const periodSelect: SelectOption[] = PERIOD_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }));

  const header = (
    <PageHeader
      crumb={t('看板 / 税务统计看板')}
      title={t('购进发票税务统计看板')}
      badges={isMock() ? <Chip tone="gray">{t('示例数据')}</Chip> : null}
      actions={
        <>
          <Field inline label={<span className="kick">{t('视角')}</span>} className={styles.headerField}>
            {(id) => <Select id={id} value={scope} onChange={onScope} options={scopeSelect} />}
          </Field>
          <Field inline label={<span className="kick">{t('期间')}</span>} className={styles.headerField}>
            {(id) => <Select id={id} value={period} onChange={onPeriod} options={periodSelect} />}
          </Field>
        </>
      }
    />
  );

  const data = board.data;
  if (board.loading && !data) {
    return (
      <>
        {header}
        <PageLoading />
      </>
    );
  }
  if (board.error || !data) {
    return (
      <>
        {header}
        <PageBody>
          <ErrorState error={board.error ?? new Error(t('加载失败'))} onRetry={board.reload} />
        </PageBody>
      </>
    );
  }

  const kpis = buildKpis(data);
  const activeState = drill ? data.states.find((s) => s.id === drill) : undefined;
  const drillData = drillRows.data ?? undefined;

  return (
    <>
      {header}
      <PageBody className={styles.body}>
        <section className={styles.kpis} aria-label={t('核心指标')}>
          {kpis.map((k) => (
            <Card key={k.label} padded={false} className={styles.kpiCard}>
              <Stat
                label={t(k.label)}
                value={t(k.value)}
                valueStyle={{ color: TONE[k.tone] }}
                sub={
                  <span className={`num ${styles.kpiSub}`}>
                    <span className={styles.kpiDelta} style={{ color: TONE[k.deltaTone] }}>
                      {t(k.delta)}
                    </span>{' '}
                    {t(k.sub)}
                  </span>
                }
              />
            </Card>
          ))}
        </section>

        <div className={styles.row}>
          <TaxStatusPanel
            states={data.states}
            scopeName={data.scopeName}
            currency={data.currency}
            active={drill}
            onPick={(id) => setDrill((cur) => (cur === id ? null : id))}
          />
          <TaxTypePanel byTax={data.byTax} scopeName={data.scopeName} currency={data.currency} />
        </div>

        <CountryTable rows={data.countries} sort={sort} onSort={setSort} />

        <div className={styles.row}>
          <TrendChart trend={data.trend} scopeName={data.scopeName} />
          <RiskTable risks={data.risks} />
        </div>

        {activeState ? (
          <DrillPanel
            stateLabel={activeState.label}
            scopeName={data.scopeName}
            period={period}
            rows={drillRows.loading ? undefined : drillData}
            onClose={() => setDrill(null)}
          />
        ) : null}
      </PageBody>
    </>
  );
}
