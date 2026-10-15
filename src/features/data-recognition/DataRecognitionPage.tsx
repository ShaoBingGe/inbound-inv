import { useState } from 'react';
import { Chip, ErrorState, PageBody, PageHeader, PageLoading, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { batchVerifyCorrections, escalateCorrectionToAp, fetchCorrectionDashboard, verifyCorrection } from './api';
import { CorrectionRecords, type RecordFilter } from './components/CorrectionRecords';
import { EvalPanel } from './components/EvalPanel';
import { LoopStages } from './components/LoopStages';
import { RoutingPolicy } from './components/RoutingPolicy';
import { SourceBreakdown } from './components/SourceBreakdown';
import { TruthRules } from './components/TruthRules';
import type { CorrectionDashboard, CorrectionRecord, CorrectionStatus } from './types';
import s from './DataRecognitionPage.module.css';

const FLASH_MS = 3000;

export default function DataRecognitionPage() {
  const t = useT();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(fetchCorrectionDashboard, []);
  const [stage, setStage] = useState(1);
  const [filter, setFilter] = useState<RecordFilter>('all');
  const [busy, setBusy] = useState<string | null>(null);

  if (loading && !data) return <PageLoading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const setStatuses = (ids: string[], status: CorrectionStatus) =>
    setData((prev) => {
      const base: CorrectionDashboard = prev ?? data;
      return { ...base, records: base.records.map((r) => (ids.includes(r.id) ? { ...r, status } : r)) };
    });

  const fail = (e: unknown) => toast(e instanceof Error ? e.message : String(e), { error: true });

  const act = async (r: CorrectionRecord) => {
    setBusy(r.id);
    try {
      if (r.status === 'dispute') {
        await escalateCorrectionToAp(r.id);
        toast(t(r.id + ' 已转 AP 复核，两条修正均保留'), { ms: FLASH_MS });
      } else {
        const res = await verifyCorrection(r.id);
        setStatuses([res.id], res.status);
        toast(t(r.id + ' 核验通过：影像复读一致，进入训练集'), { ms: FLASH_MS });
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const batchVerify = async () => {
    setBusy('*');
    try {
      const pending = data.records.filter((r) => r.status === 'pending');
      const res = await batchVerifyCorrections(pending.map((r) => ({ id: r.id, verify: r.verify })));
      setStatuses(res.accepted, 'accepted');
      toast(t('核验 Agent 处理 ' + res.accepted.length + ' 条：影像复读 + 旁证通过；金额类仍待 AP 复核'), { ms: FLASH_MS });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        crumb={`${t('数据管理')} / ${t('发票识别数据管理看板')}`}
        title={t('发票识别数据管理看板')}
        badges={<Chip tone="gray">{t('示例数据')}</Chip>}
        actions={<span className={s.headerNote}>{t('员工与供应商在采集过程中的每一次修正，核验、清洗后成为训练与评测资产')}</span>}
      />
      <PageBody className={s.body}>
        <LoopStages stages={data.stages} active={stage} onPick={setStage} />

        <div className={s.row}>
          <SourceBreakdown sources={data.sources} />
          <TruthRules truth={data.truth} conflicts={data.conflicts} />
        </div>

        <CorrectionRecords
          records={data.records}
          filter={filter}
          onFilter={setFilter}
          onBatchVerify={batchVerify}
          onAct={act}
          busy={busy}
        />

        <div className={s.row}>
          <RoutingPolicy routing={data.routing} />
          <EvalPanel evals={data.evals} hot={data.hotFields} total={data.totalCorrections} />
        </div>
      </PageBody>
    </>
  );
}
