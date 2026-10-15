import { useRef, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  ErrorState,
  PageBody,
  PageHeader,
  PageLoading,
  Select,
  Stat,
  useToast,
} from '@/components/ui';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { fetchSupplierPortal, respondCorrectionRequest, submitFieldMarks } from './api';
import { CorrectionRequests } from './components/CorrectionRequests';
import { CorrectionRules } from './components/CorrectionRules';
import { ErrorTrendChart } from './components/ErrorTrendChart';
import { InvoiceTable } from './components/InvoiceTable';
import { RecognitionDetail } from './components/RecognitionDetail';
import type { RequestAction, SupplierKey } from './types';
import styles from './CapturePortalPage.module.css';

const SUPPLIER_KEYS: SupplierKey[] = ['DE', 'JP', 'US'];
const isSupplierKey = (v: string): v is SupplierKey => (SUPPLIER_KEYS as string[]).includes(v);

/** 采集 / 供应商门户：供应商登录后看到的页面（演示时可切换供应商） */
export default function CapturePortalPage() {
  const t = useT();
  const toast = useToast();
  const [supKey, setSupKey] = useState<SupplierKey>('DE');
  /** 选中的发票；null 表示默认选中第一张（切换供应商后） */
  const [sel, setSel] = useState<string | null>('RE-2026-45399');
  const [sugg, setSugg] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [reqSt, setReqSt] = useState<Record<string, RequestAction>>({});
  const [sending, setSending] = useState(false);
  const [busyReq, setBusyReq] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, loading, error, reload } = useAsync(() => fetchSupplierPortal(supKey), [supKey]);
  if (loading && !data) return <PageLoading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const sup = data.supplier;
  const selNo = sel ?? sup.invs[0]?.no;
  const inv = sup.invs.find((i) => i.no === selNo);
  const avg = parseFloat(sup.avg);
  const errC = parseFloat(sup.err) > avg ? 'var(--red-ink)' : 'var(--green-ink)';
  const openReq = sup.reqs.filter((q) => !reqSt[q.id]).length;

  const onSup = (v: string) => {
    if (!isSupplierKey(v)) return;
    setSupKey(v);
    setSel(null);
  };

  const send = async () => {
    if (!inv) return;
    const marks = inv.fields
      .filter((f) => marked[inv.no + f.key])
      .map((f) => ({ field: f.key, suggested: sugg[inv.no + f.key] ?? '' }));
    setSending(true);
    try {
      await submitFieldMarks(inv.no, marks);
      setSent((x) => ({ ...x, [inv.no]: true }));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    } finally {
      setSending(false);
    }
  };

  const respond = async (id: string, action: RequestAction) => {
    setBusyReq(id);
    try {
      await respondCorrectionRequest(id, action);
      setReqSt((x) => ({ ...x, [id]: action }));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    } finally {
      setBusyReq(null);
    }
  };

  return (
    <>
      <PageHeader
        crumb={t('采集 / 供应商门户（供应商登录后看到的页面）')}
        title={
          <>
            <span translate="no">{sup.name}</span>
            <span className={styles.headMeta}>
              <span className="mono" translate="no">
                {sup.code}
              </span>{' '}
              · {t(sup.country)} {t('· 交易法人')}{' '}
              <span translate="no">{sup.buyer}</span>
            </span>
          </>
        }
        actions={
          <>
            <label className={styles.supPicker}>
              <span className="kick">{t('演示供应商')}</span>
              <Select
                value={supKey}
                onChange={onSup}
                options={data.suppliers.map((o) => ({ value: o.value, label: t(o.label) }))}
              />
            </label>
            <Chip tone="gray">{t('示例数据')}</Chip>
          </>
        }
      />
      <PageBody className={styles.body}>
        <section className={styles.overview} aria-label={t('概览')}>
          <Card padded={false} className={styles.overviewCard}>
            <Stat label={t('本季度已提交')} value={t(sup.submitted)} sub={sup.amount} />
          </Card>
          <Card padded={false} className={styles.overviewCard}>
            <Stat
              label={t('您的发票识别错误率')}
              value={sup.err}
              valueStyle={{ color: errC }}
              sub={
                <>
                  {t('平台同国家平均')} {sup.avg}
                </>
              }
            />
          </Card>
          <Card padded={false} className={styles.overviewCard}>
            <Stat label={t('待您处理')} value={t(openReq + ' 项')} sub={t('更正请求与补充资料')} />
          </Card>
          <Card padded={false} className={styles.overviewCard}>
            <Stat
              label={t('待付款')}
              value={sup.unpaid}
              sub={
                <>
                  {t('下次付款日')} {sup.payDay}
                </>
              }
            />
          </Card>
        </section>

        <Card padded={false} className={styles.upload} aria-label={t('上传')}>
          <div className={styles.dropZone}>
            <svg
              className={styles.dropIcon}
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
            </svg>
            <div className={styles.dropText}>
              <div className={styles.strong}>{t('上传发票')}</div>
              <div className={styles.ink2}>
                {t('PDF、图片或结构化电子发票（')}
                {sup.einv}
                {t('），可多选；系统会自动识别并关联 PO')}
              </div>
            </div>
            <div className={styles.spacer} />
            <input
              ref={fileRef}
              className={styles.fileInput}
              type="file"
              multiple
              accept=".pdf,.xml,image/*"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                e.target.value = '';
              }}
            />
            <Button variant="primary" onClick={() => fileRef.current?.click()}>
              {t('选择文件')}
            </Button>
          </div>
          <div className={styles.tips}>
            <div className={styles.tipsTitle}>{t('让识别更准的做法')}</div>
            {sup.tips.map((tip) => (
              <div key={tip} className={styles.tip}>
                <span className={styles.tipDot} aria-hidden="true">
                  •
                </span>
                <span>{t(tip)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card padded={false} aria-label={t('我的发票')}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>{t('我的发票')}</h2>
            <span className={styles.cardDesc}>{t('点开一张查看识别结果；发现识别错误可直接标注')}</span>
          </div>
          <InvoiceTable invs={sup.invs} steps={data.steps} selected={selNo} onPick={setSel} />
          {inv ? (
            <RecognitionDetail
              inv={inv}
              steps={data.steps}
              sugg={sugg}
              marked={marked}
              sent={!!sent[inv.no]}
              sending={sending}
              onSugg={(k, v) => setSugg((x) => ({ ...x, [k]: v }))}
              onToggleMark={(k) => setMarked((x) => ({ ...x, [k]: !x[k] }))}
              onSend={send}
            />
          ) : null}
        </Card>

        <CorrectionRequests reqs={sup.reqs} reqSt={reqSt} busy={busyReq} onRespond={respond} />

        <div className={styles.twoCol}>
          <ErrorTrendChart trend={sup.trend} months={data.months} avg={avg} note={sup.trendNote} />
          <CorrectionRules rules={data.rules} />
        </div>
      </PageBody>
    </>
  );
}
