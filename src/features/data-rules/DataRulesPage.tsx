import { useCallback, useMemo, useState } from 'react';
import { ButtonLink, Card, Chip, Empty, ErrorState, PageBody, PageHeader, PageLoading, Stat, Tabs, useToast } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/auth/AuthProvider';
import { canSeeCountry } from '@/auth/types';
import { useI18n, useT } from '@/i18n';
import { isMock } from '@/lib/http';
import { useAsync } from '@/lib/useAsync';
import { approveAgentGate, fetchDatasetRules, runFormatCheck, saveCountryStrategy, startBatchTestRun } from './api';
import { agentLog, computeDistribution, sourceMix } from './logic';
import type { AgentKey, CountryCode, CountryStrategy, RunModel, RunSplit } from './types';
import { AgentLoop } from './components/AgentLoop';
import { StrategyPanel } from './components/StrategyPanel';
import { DistributionPanel, type DistView } from './components/DistributionPanel';
import { FormatCheck } from './components/FormatCheck';
import { BatchRuns } from './components/BatchRuns';
import { StrategyOverview } from './components/StrategyOverview';
import s from './DataRulesPage.module.css';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * 数据识别规则管理：按国家维护 OCR 数据集策略（规模、触发条件、回流上限），
 * 检查分布均衡、标注格式，编排标注与清洗 Agent 闭环，并运行批量测试。
 */
export default function DataRulesPage() {
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useAsync(fetchDatasetRules, []);

  const [picked, setPicked] = useState<CountryCode>('JP');
  const [saved, setSaved] = useState(true);
  const [view, setView] = useState<DistView>('after');
  const [agent, setAgent] = useState<AgentKey>('qa');
  const [gates, setGates] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Partial<Record<CountryCode, boolean>>>({});
  const [model, setModel] = useState<RunModel>('v4.2-rc1');
  const [split, setSplit] = useState<RunSplit>('test');
  const [runNote, setRunNote] = useState('');
  const [seq, setSeq] = useState<number | null>(null);
  const [busy, setBusy] = useState<'' | 'save' | 'check' | 'gate' | 'run'>('');

  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fmt = useCallback((n: number) => nf.format(n), [nf]);

  const visible = useMemo(
    () => (data ? data.countries.filter((c) => canSeeCountry(user, c.code)) : []),
    [data, user],
  );

  if (loading && !data) return <PageLoading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const crumb = `${t('数据管理')} / ${t('数据识别规则管理')}`;
  if (visible.length === 0) {
    return (
      <>
        <PageHeader crumb={crumb} title={t('数据识别规则管理')} />
        <PageBody>
          <Empty />
        </PageBody>
      </>
    );
  }

  const country = visible.find((c) => c.code === picked) ?? visible[0];
  const code = country.code;
  const cf = data.strategies[code];
  const dist = computeDistribution(country, view === 'before' ? 60 : cf.cap);
  const gateKey = (k: AgentKey) => code + k;
  const nextSeq = seq ?? data.nextRunSeq;

  const patchStrategy = (patch: Partial<CountryStrategy>) => {
    setData((prev) => {
      const d = prev ?? data;
      return { ...d, strategies: { ...d.strategies, [code]: { ...d.strategies[code], ...patch } } };
    });
    setSaved(false);
  };

  const save = async () => {
    setBusy('save');
    try {
      await saveCountryStrategy(code, cf);
      setSaved(true);
    } catch (e) {
      toast(errMsg(e), { error: true });
    } finally {
      setBusy('');
    }
  };

  const approve = async () => {
    setBusy('gate');
    try {
      await approveAgentGate(code, agent);
      setGates((g) => ({ ...g, [gateKey(agent)]: true }));
    } catch (e) {
      toast(errMsg(e), { error: true });
    } finally {
      setBusy('');
    }
  };

  const runCheck = async () => {
    setBusy('check');
    try {
      await runFormatCheck(code, country.batch);
      setChecked((c) => ({ ...c, [code]: true }));
    } catch (e) {
      toast(errMsg(e), { error: true });
    } finally {
      setBusy('');
    }
  };

  const startRun = async () => {
    setBusy('run');
    try {
      const r = await startBatchTestRun({ country: code, model, split, seq: nextSeq });
      setData((prev) => {
        const d = prev ?? data;
        return { ...d, runs: [r, ...d.runs] };
      });
      setSeq(nextSeq + 1);
      setRunNote(r.id + ' 已完成（' + r.n + ' 张）');
    } catch (e) {
      toast(errMsg(e), { error: true });
    } finally {
      setBusy('');
    }
  };

  const trigFull = t(country.trig);
  const trigParts = trigFull.split(' · ');
  const [trigDate, trigWhy] =
    trigParts.length >= 2 ? [trigParts[0], trigParts.slice(1).join(' · ')] : country.trig.split(' · ').map((x) => t(x));

  const kpis = [
    {
      label: '样本集 · 当前 / 目标',
      v: fmt(country.cur) + ' / ' + fmt(cf.size),
      sub: t('完成度 ' + Math.min(100, Math.round((country.cur / cf.size) * 100)) + '%'),
    },
    { label: '待回流（高频修正）', v: fmt(country.pend), sub: t('近 30 天被修正 ≥ 2 次的版式') },
    { label: '最近一次触发', v: trigDate, sub: trigWhy },
    { label: '分布偏离 PSI', v: dist.psi.toFixed(3), sub: t(dist.psi < 0.1 ? '合格' : '需均衡') },
    { label: '线上模型字段准确率', v: country.acc, sub: country.model + ' · ' + country.dc },
  ];

  return (
    <div className={s.root}>
      <PageHeader
        crumb={crumb}
        title={t('数据识别规则管理')}
        badges={isMock() ? <Chip tone="gray">{t('示例数据')}</Chip> : undefined}
        actions={<ButtonLink to={ROUTES.dashboardRecognition}>{t('查看识别效果看板')}</ButtonLink>}
      >
        <div className={s.countryTabs}>
          <Tabs<CountryCode>
            ariaLabel={t('国家')}
            value={code}
            onChange={setPicked}
            items={visible.map((c) => ({ value: c.code, label: t(c.name) }))}
          />
        </div>
      </PageHeader>

      <PageBody className={s.body}>
        <section className={s.kpis} aria-label={t('概览')}>
          {kpis.map((k) => (
            <Card key={k.label}>
              <Stat label={t(k.label)} value={<bdi className="num" dir="ltr">{k.v}</bdi>} sub={<span className={s.kpiSub}>{k.sub}</span>} />
            </Card>
          ))}
        </section>

        <AgentLoop
          agents={data.agents}
          country={country}
          active={agent}
          onPick={setAgent}
          isGated={(k) => !!gates[gateKey(k)]}
          log={agentLog(agent, country, { cap: cf.cap, psi: dist.psi, gated: !!gates[gateKey(agent)] })}
          busy={busy === 'gate'}
          onApprove={approve}
          fmt={fmt}
        />

        <div className={s.twoCol}>
          <StrategyPanel
            country={country}
            strategy={cf}
            saved={saved}
            saving={busy === 'save'}
            onSave={save}
            onChange={patchStrategy}
            triggerDefs={data.triggerDefs}
            mix={sourceMix(country, cf.cap)}
            strata={data.strata}
            fmt={fmt}
          />
          <DistributionPanel country={country} cap={cf.cap} view={view} onView={setView} dist={dist} />
        </div>

        <FormatCheck
          country={country}
          items={data.checkItems}
          checked={!!checked[code]}
          busy={busy === 'check'}
          onRun={runCheck}
          fmt={fmt}
        />

        <BatchRuns
          runs={data.runs}
          model={model}
          split={split}
          onModel={setModel}
          onSplit={setSplit}
          onStart={startRun}
          busy={busy === 'run'}
          note={runNote}
          fmt={fmt}
        />

        <StrategyOverview
          countries={visible}
          strategies={data.strategies}
          active={code}
          onPick={setPicked}
          fmt={fmt}
        />
      </PageBody>
    </div>
  );
}
