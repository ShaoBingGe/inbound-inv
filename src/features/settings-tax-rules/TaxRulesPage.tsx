import { useState } from 'react';
import { Empty, ErrorState, PageBody, PageHeader, PageLoading, Tabs, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/auth/AuthProvider';
import { canSeeCountry, hasRole } from '@/auth/types';
import { useAsync } from '@/lib/useAsync';
import { createDraftVersion, fetchTaxRegimes } from './api';
import { RegimeOverview } from './components/RegimeOverview';
import { ReverseCard, RulesCard, TaxTypesCard, VersionsCard } from './components/RegimeTables';
import { RuleSimulator } from './components/RuleSimulator';
import type { CountryCode, SimInput, TaxRegime } from './types';
import s from './TaxRulesPage.module.css';

const INITIAL_SIM: SimInput = { kind: '', type: 'goods', use: 'taxable', amt: '100000' };

export default function TaxRulesPage() {
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useAsync(fetchTaxRegimes, []);
  const [picked, setPicked] = useState<CountryCode | null>(null);
  const [sim, setSim] = useState<SimInput>(INITIAL_SIM);
  const [creating, setCreating] = useState(false);

  const header = (
    <PageHeader
      crumb={`${t('设置')} / ${t('税务规则设置')}`}
      title={t('税务规则设置')}
      actions={<span className={s.headerNote}>{t('规则按国家 / 税制 / 生效日期版本化；发票按开票日冻结所用版本')}</span>}
    />
  );

  if (loading && !data) return <PageLoading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  /* 国家切换器只列出当前用户可见的国家 */
  const regimes = (data ?? []).filter((r) => canSeeCountry(user, r.code));
  const current: TaxRegime | undefined = regimes.find((r) => r.code === picked) ?? regimes[0];

  if (!current) {
    return (
      <>
        {header}
        <PageBody>
          <Empty />
        </PageBody>
      </>
    );
  }

  const pick = (code: CountryCode) => {
    setPicked(code);
    setSim((prev) => ({ ...prev, kind: '' }));
  };

  const onCreateDraft = async () => {
    const code = current.code;
    setCreating(true);
    try {
      const draft = await createDraftVersion(code, current.versions[0]?.v ?? current.ver);
      setData((prev) =>
        (prev ?? []).map((r) => (r.code === code ? { ...r, versions: [draft, ...r.versions] } : r)),
      );
      toast(`${t('已创建')} · ${draft.v}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {header}
      <div className={s.countryBar}>
        <Tabs
          ariaLabel={t('国家')}
          items={regimes.map((r) => ({ value: r.code, label: t(r.name) }))}
          value={current.code}
          onChange={pick}
        />
      </div>

      <PageBody className={s.body}>
        <RegimeOverview
          regime={current}
          canEdit={hasRole(user, ['tax_manager'])}
          creating={creating}
          onCreateDraft={onCreateDraft}
        />

        <div className={s.split}>
          <TaxTypesCard regime={current} />
          <ReverseCard regime={current} />
        </div>

        <RulesCard regime={current} />

        <RuleSimulator regime={current} sim={sim} onChange={setSim} />

        <VersionsCard regime={current} />
      </PageBody>
    </>
  );
}
