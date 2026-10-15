import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, Chip, ErrorState, PageBody, PageHeader, PageLoading, Select } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/auth/AuthProvider';
import { canSeeCountry } from '@/auth/types';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { fetchInvoiceLifecycle, fetchLifecycleSamples } from './api';
import { InvoiceImagePanel } from './components/InvoiceImagePanel';
import { LifecycleTimeline } from './components/LifecycleTimeline';
import { RecognitionDataPanel } from './components/RecognitionDataPanel';
import { ReverseLinkPanel } from './components/ReverseLinkPanel';
import { RuleRouting } from './components/RuleRouting';
import { SummaryCard } from './components/SummaryCard';
import { TaxTreatmentPanel } from './components/TaxTreatmentPanel';
import type { LifecycleDetail, TargetLang } from './types';
import s from './InvoiceLifecyclePage.module.css';

/** 设计稿默认示例（中国大陆 · 数电专票） */
const DEFAULT_ID = '26372000000018842';

export default function InvoiceLifecyclePage() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invoiceId = DEFAULT_ID } = useParams<{ invoiceId: string }>();
  const { data, loading, error, reload } = useAsync(() => fetchInvoiceLifecycle(invoiceId), [invoiceId]);
  const samples = useAsync(fetchLifecycleSamples, []);

  // 下拉只列出当前用户可见国家的示例；当前这张始终保留
  const options = useMemo(() => {
    const list = samples.data ?? [];
    return list
      .filter((o) => canSeeCountry(user, o.countryCode) || o.key === data?.invoice.key)
      .map((o) => ({ value: o.key, label: t(o.label) }));
  }, [samples.data, user, data?.invoice.key, t]);

  const onSelect = (key: string) => {
    const hit = samples.data?.find((o) => o.key === key);
    if (hit) navigate(ROUTES.invoiceLifecycle(encodeURIComponent(hit.id)));
  };

  const header = (
    <PageHeader
      crumb={
        <>
          {t('票池')}
          <span className={s.crumbSep}>/</span>
          <Link to={ROUTES.poolEnterprise}>{t('企业票池')}</Link>
          <span className={s.crumbSep}>/</span>
          {t('发票全生命周期')}
          <span className={s.crumbSep}>/</span>
          <span className="mono" translate="no">
            {invoiceId}
          </span>
        </>
      }
      title={t('发票全生命周期')}
      badges={<Chip tone="gray">{t('示例数据')}</Chip>}
      actions={
        <label className={s.sampleLabel}>
          <span className="kick">{t('示例发票')}</span>
          <Select
            className={s.sampleSelect}
            value={data?.invoice.key ?? ''}
            onChange={onSelect}
            options={options}
            disabled={!data}
          />
        </label>
      }
    />
  );

  if (loading && !data) {
    return (
      <>
        {header}
        <PageLoading />
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        {header}
        <PageBody>
          <ErrorState error={error ?? new Error(t('加载失败'))} onRetry={reload} />
        </PageBody>
      </>
    );
  }

  return (
    <>
      {header}
      <PageBody className={s.page}>
        {/* 切换示例时重置缩放 / 页码 / 翻译状态（与设计稿 onSel 一致） */}
        <LifecycleView key={data.invoice.key} detail={data} invoiceId={invoiceId} />
      </PageBody>
    </>
  );
}

function LifecycleView({ detail, invoiceId }: { detail: LifecycleDetail; invoiceId: string }) {
  const t = useT();
  const { invoice: inv, document: doc } = detail;
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  const [tr, setTr] = useState(false);
  const [trLang, setTrLang] = useState<TargetLang>(doc.lang === 'zh' ? 'en' : 'zh');

  return (
    <>
      <SummaryCard inv={inv} />
      <LifecycleTimeline labels={detail.stepLabels} steps={inv.steps} />

      <div className={s.twoCol}>
        <ReverseLinkPanel inv={inv} />
        <TaxTreatmentPanel inv={inv} />
      </div>

      <RuleRouting route={detail.route} matrix={detail.matrix} />

      <Card padded={false} className={s.block} aria-label={t('发票关键数据与影像')}>
        <div className={s.blockHead}>
          <h2 className={s.blockTitle}>{t('发票关键数据与影像')}</h2>
          <span className={s.blockDesc}>{t('左侧原件影像（只读存证），右侧识别数据；可放大、翻页、在新窗口打开，数据可启用智能翻译')}</span>
        </div>
        <div className={s.imgRow}>
          <InvoiceImagePanel invoiceId={invoiceId} pages={doc.pages} page={page} zoom={zoom} onPage={setPage} onZoom={setZoom} />
          <RecognitionDataPanel
            doc={doc}
            on={tr}
            target={trLang}
            onToggle={() => setTr((v) => !v)}
            onTarget={(v) => {
              setTrLang(v);
              setTr(true);
            }}
          />
        </div>
      </Card>
    </>
  );
}
