import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, ButtonLink, ErrorState, Icon, PageLoading, useToast } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { LangSwitcher } from '@/layout/LangSwitcher';
import { useAsync } from '@/lib/useAsync';
import { cx } from '@/lib/sample';
import { fetchOriginalFile, fetchViewerDocument } from './api';
import { SAMPLE_ID } from './data';
import { InvoiceSheet } from './components/InvoiceSheet';
import { PageThumbs } from './components/PageThumbs';
import s from './InvoiceViewerPage.module.css';

/** 原件纸面尺寸（px，缩放 100% 时） */
const PAPER_W = 560;
const PAPER_H = 792;
const Z_MIN = 0.5;
const Z_MAX = 3;
const Z_STEP = 0.25;

/**
 * 发票影像查看器：在新窗口打开，不带应用框架，独占整个视口。
 * 原件只读存证；支持缩放、旋转、翻页、缩略图、下载与打印。
 */
export default function InvoiceViewerPage() {
  const t = useT();
  const toast = useToast();
  const { invoiceId = SAMPLE_ID } = useParams<{ invoiceId: string }>();
  const { data: doc, loading, error, reload } = useAsync(() => fetchViewerDocument(invoiceId), [invoiceId]);

  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [invoiceId]);

  useEffect(() => {
    document.title = `${invoiceId} · ${t('发票影像查看器')}`;
  }, [invoiceId, t]);

  if (loading && !doc) {
    return (
      <div className={s.root}>
        <div className={s.state}>
          <PageLoading />
        </div>
      </div>
    );
  }
  if (error || !doc) {
    return (
      <div className={s.root}>
        <div className={s.state}>
          <ErrorState error={error ?? new Error(t('加载失败'))} onRetry={reload} />
        </div>
      </div>
    );
  }

  const pageCount = doc.pages.length;
  const side = rot % 180 !== 0;
  const boxW = Math.round((side ? PAPER_H : PAPER_W) * zoom);
  const boxH = Math.round((side ? PAPER_W : PAPER_H) * zoom);

  const zoomIn = () => setZoom((z) => Math.min(Z_MAX, Math.round((z + Z_STEP) * 100) / 100));
  const zoomOut = () => setZoom((z) => Math.max(Z_MIN, Math.round((z - Z_STEP) * 100) / 100));
  const fit = () => {
    setZoom(1);
    setRot(0);
  };
  const rotate = () => setRot((r) => (r + 90) % 360);
  const prev = () => setPage((p) => Math.max(0, p - 1));
  const next = () => setPage((p) => Math.min(pageCount - 1, p + 1));

  const download = async () => {
    try {
      const file = await fetchOriginalFile(doc.id, doc.fileName);
      // TODO: live 模式由 api.ts 返回真实文件地址后在此触发下载；mock 模式 url 为 null，只给出提示。
      if (file.url) {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.fileName;
        a.rel = 'noopener';
        a.click();
      }
      toast(t('已下载原件 ' + file.fileName + '（含存证哈希）'));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    }
  };
  const print = () => {
    toast(t('已发送到打印'));
    // 让提示先渲染，再打开浏览器打印对话框（打印样式只输出当前页原件）
    window.setTimeout(() => window.print(), 60);
  };

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        <ButtonLink to={ROUTES.poolEnterprise} className={cx(s.vb, s.back)} aria-label={t('返回企业票池')}>
          <Icon name="chevronLeft" size={16} strokeWidth={1.8} />
        </ButtonLink>
        <div className={s.docInfo}>
          <div className={s.docTitle} translate="no">
            {doc.id} · {doc.issuerName}
          </div>
          <div className={s.docSub}>
            {t(`${doc.docType} · ${pageCount} 页 · 原件只读存证 · SHA-256 ${doc.shaShort}`)}
          </div>
        </div>
        <div className={s.spacer} />

        <Button className={s.vb} onClick={zoomOut} disabled={zoom <= Z_MIN} aria-label={t('缩小')}>
          −
        </Button>
        <span className={cx('num', s.zoomLabel)} aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <Button className={s.vb} onClick={zoomIn} disabled={zoom >= Z_MAX} aria-label={t('放大')}>
          +
        </Button>
        <Button className={s.vb} onClick={fit}>
          {t('适应窗口')}
        </Button>
        <Button className={s.vb} onClick={rotate} aria-label={t('旋转 90 度')}>
          <Icon name="rotate" size={16} strokeWidth={1.8} />
        </Button>
        <span className={s.sep} aria-hidden="true" />

        <Button className={cx(s.vb, s.flip)} onClick={prev} disabled={page === 0} aria-label={t('上一页')}>
          ‹
        </Button>
        <span className="num" dir="ltr">
          {page + 1} / {pageCount}
        </span>
        <Button className={cx(s.vb, s.flip)} onClick={next} disabled={page === pageCount - 1} aria-label={t('下一页')}>
          ›
        </Button>
        <span className={s.sep} aria-hidden="true" />

        <Button className={s.vb} onClick={download}>
          {t('下载原件')}
        </Button>
        <Button className={s.vb} onClick={print}>
          {t('打印')}
        </Button>
        <LangSwitcher variant="dark" />
      </div>

      <div className={s.main}>
        <PageThumbs count={pageCount} page={page} onPick={setPage} />
        <div className={s.stage}>
          <div className={s.box} style={{ width: boxW, height: boxH }}>
            <div className={s.sheet} style={{ transform: `scale(${zoom}) rotate(${rot}deg)` }}>
              <InvoiceSheet doc={doc} pageIndex={page} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
