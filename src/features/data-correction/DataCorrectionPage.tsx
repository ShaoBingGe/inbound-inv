import { useState } from 'react';
import { Card, Empty, ErrorState, PageBody, PageHeader, PageLoading, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/auth/AuthProvider';
import { canSeeCountry } from '@/auth/types';
import { useAsync } from '@/lib/useAsync';
import { cx } from '@/lib/sample';
import {
  approveCorrection,
  fetchCorrectionReference,
  fetchCorrectionWorkspace,
  startCompensation,
  submitCorrection,
} from './api';
import { currentValue, fieldRule } from './rules';
import type { CompensationEvent, CompensationOption, CorrectionInvoice, CorrectionResult, FieldChange } from './types';
import { FlowStrip } from './components/FlowStrip';
import { CorrectionQueue } from './components/CorrectionQueue';
import { InvoiceImage } from './components/InvoiceImage';
import { FieldTable } from './components/FieldTable';
import { FieldEditor } from './components/FieldEditor';
import { DiffPanel, type DiffView } from './components/DiffPanel';
import { ChangeLogPanel } from './components/ChangeLogPanel';
import { RuleMatrix } from './components/RuleMatrix';
import s from './DataCorrectionPage.module.css';

const TOAST_MS = 3200;

async function loadPage() {
  const [ws, reference] = await Promise.all([fetchCorrectionWorkspace(), fetchCorrectionReference()]);
  return { ws, reference };
}

function firstErrorField(inv: CorrectionInvoice): string {
  return (inv.fields.find((f) => inv.errs.includes(f.key)) ?? inv.fields[0])?.key ?? '';
}

export default function DataCorrectionPage() {
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useAsync(loadPage, []);

  const [invId, setInvId] = useState<string | null>(null);
  const [fieldKey, setFieldKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [etypes, setEtypes] = useState<Record<string, string>>({});
  const [view, setView] = useState<DiffView>('all');
  const [busy, setBusy] = useState(false);

  const header = (
    <PageHeader
      crumb={t('数据管理 / 发票数据修正')}
      title={t('发票数据修正与补偿')}
      actions={<span className={s.headNote}>{t('原件只读存证 · 解析结果按版本追加 · 每次更正写入前后对比')}</span>}
    />
  );

  if (loading && !data) return <PageLoading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const { ws, reference } = data;
  /* 国家数据隔离：只列出用户可见国家的发票（后端同样校验） */
  const visible = ws.invoices.filter((i) => canSeeCountry(user, i.countryCode));
  const inv = visible.find((i) => i.id === invId) ?? visible[0];

  if (!inv)
    return (
      <>
        {header}
        <PageBody>
          <FlowStrip steps={reference.flow} />
          <Card>
            <Empty title={t('暂无数据')} />
          </Card>
          <RuleMatrix reference={reference} />
        </PageBody>
      </>
    );

  const log = ws.logs[inv.id] ?? [];
  const comps = ws.comps[inv.id] ?? [];
  const fsel = inv.fields.find((f) => f.key === (fieldKey ?? firstErrorField(inv))) ?? inv.fields[0];
  if (!fsel) return null;

  const corrected = inv.fields.filter((f) => currentValue(f, log) !== f.ocr || inv.errs.includes(f.key)).length;
  const rate = (corrected / inv.fields.length) * 100;

  const rule = fieldRule(inv, fsel);
  const ek = inv.id + ':' + fsel.key;
  const value = edits[ek] ?? (inv.suggest[fsel.key] || currentValue(fsel, log));
  const etype = etypes[ek] || (fsel.conf === 0 ? '漏识' : '字符误识');

  /** 把写操作返回的记录合并进本地数据（日志按 change_id 追加或替换，补偿事件追加） */
  const merge = (invoiceId: string, change: FieldChange | undefined, events: CompensationEvent[]) => {
    setData((prev) => {
      const base = prev ?? data;
      const curLog = base.ws.logs[invoiceId] ?? [];
      const nextLog = !change
        ? curLog
        : curLog.some((l) => l.cid === change.cid)
          ? curLog.map((l) => (l.cid === change.cid ? change : l))
          : [...curLog, change];
      return {
        ...base,
        ws: {
          ...base.ws,
          logs: { ...base.ws.logs, [invoiceId]: nextLog },
          comps: { ...base.ws.comps, [invoiceId]: [...(base.ws.comps[invoiceId] ?? []), ...events] },
        },
      };
    });
  };
  const eventsOf = (res: CorrectionResult) => (res.compensation ? [res.compensation] : []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e: unknown) {
      toast(e instanceof Error ? t(e.message) : t(String(e)), { error: true, ms: TOAST_MS });
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = () => {
    if (rule.cls === 'lock') return;
    const before = currentValue(fsel, log);
    if (value === before) {
      toast(t('更正值与当前值相同，未生成记录'), { ms: TOAST_MS });
      return;
    }
    void run(async () => {
      const res = await submitCorrection({ invoiceId: inv.id, field: fsel.key, before, after: value, errorType: etype });
      merge(inv.id, res.change, eventsOf(res));
      const ver = res.change.ver;
      toast(
        res.change.status === 'pending'
          ? t('已提交，等待第二人复核；复核通过后生成新版本 ' + ver)
          : t('已生效，生成版本 ' + ver + '，样本已排队回流'),
        { ms: TOAST_MS },
      );
    });
  };

  const onCompensate = (c: CompensationOption) =>
    void run(async () => {
      const ev = await startCompensation({ invoiceId: inv.id, type: c.title, steps: c.desc });
      merge(inv.id, undefined, [ev]);
      toast(t('已发起：' + c.title), { ms: TOAST_MS });
    });

  const onApprove = (cid: string, ver: string) =>
    void run(async () => {
      const res = await approveCorrection(inv.id, cid);
      merge(inv.id, res.change, eventsOf(res));
      toast(t('复核通过，' + ver + ' 生效'), { ms: TOAST_MS });
    });

  const pickInvoice = (q: CorrectionInvoice) => {
    setInvId(q.id);
    setFieldKey(firstErrorField(q));
  };

  return (
    <>
      {header}
      <PageBody>
        <FlowStrip steps={reference.flow} />

        <div className={s.main}>
          <CorrectionQueue invoices={visible} activeId={inv.id} stageNames={reference.stageNames} onPick={pickInvoice} />

          <section className={s.work}>
            <Card className={s.workCard} aria-label={inv.id}>
              <div className={s.invHead}>
                <div>
                  <div className="kick">
                    {t(inv.country)} · {t(inv.kind)} · {t('当前环节')} {t(reference.stageNames[inv.stageIdx] ?? '')}
                  </div>
                  <div className={s.invName} translate="no">
                    {inv.sup}
                  </div>
                  <div className={cx('mono', s.sub)}>{inv.id}</div>
                </div>
                <div className={s.spacer} />
                <div className={s.metrics}>
                  <div>
                    <div className="kick">{t('本票字段误差率')}</div>
                    <div className={cx('num', s.metricVal, rate >= 20 && s.bad)}>{rate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="kick">{t('该供应商模板 90 天误差率')}</div>
                    <div className={cx('num', s.metricVal)}>{inv.tplRate}</div>
                  </div>
                  <div>
                    <div className="kick">{t('数据权威来源')}</div>
                    <div className={s.metricText}>{t(inv.authority)}</div>
                  </div>
                </div>
              </div>

              <div className={s.invBody}>
                <InvoiceImage inv={inv} log={log} selectedKey={fsel.key} onPick={setFieldKey} />
                <div className={s.fieldsCol}>
                  <FieldTable inv={inv} log={log} selectedKey={fsel.key} onPick={setFieldKey} />
                  <FieldEditor
                    field={fsel}
                    rule={rule}
                    value={value}
                    etype={etype}
                    errorTypes={reference.errorTypes}
                    busy={busy}
                    onValue={(v) => setEdits((m) => ({ ...m, [ek]: v }))}
                    onType={(v) => setEtypes((m) => ({ ...m, [ek]: v }))}
                    onSubmit={onSubmit}
                    onCompensate={onCompensate}
                  />
                </div>
              </div>
            </Card>

            <DiffPanel inv={inv} log={log} view={view} onView={setView} />

            <ChangeLogPanel log={log} comps={comps} busy={busy} onApprove={(l) => onApprove(l.cid, l.ver)} />
          </section>
        </div>

        <RuleMatrix reference={reference} />
      </PageBody>
    </>
  );
}
