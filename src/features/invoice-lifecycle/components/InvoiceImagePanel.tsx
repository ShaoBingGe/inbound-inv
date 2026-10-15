import { Button, Icon } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { DocPage } from '../types';
import s from '../InvoiceLifecyclePage.module.css';

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.5;
const PAPER_W = 560;
const PAPER_H = 792;

const ZOOM_OUT = 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6';
const ZOOM_IN = 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6M11 8v6';
const EXTERNAL = 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5';

/** 原件影像（只读存证）：缩放、翻页、缩略图、在新窗口打开 */
export function InvoiceImagePanel({
  invoiceId,
  pages,
  page,
  zoom,
  onPage,
  onZoom,
}: {
  invoiceId: string;
  pages: DocPage[];
  page: number;
  zoom: number;
  onPage: (p: number) => void;
  onZoom: (z: number) => void;
}) {
  const t = useT();
  const pg = Math.min(page, pages.length - 1);
  const p = pages[pg];
  const z = zoom;
  return (
    <div className={s.imgCol}>
      <div className={s.toolbar}>
        <Button
          iconOnly
          aria-label={t('缩小')}
          disabled={z <= ZOOM_MIN}
          onClick={() => onZoom(Math.max(ZOOM_MIN, Math.round((z - 0.25) * 100) / 100))}
          icon={<Icon d={ZOOM_OUT} strokeWidth={1.8} />}
        />
        <span className={cx('num', s.zoomLabel)}>{Math.round(z * 100) + '%'}</span>
        <Button
          iconOnly
          aria-label={t('放大')}
          disabled={z >= ZOOM_MAX}
          onClick={() => onZoom(Math.min(ZOOM_MAX, Math.round((z + 0.25) * 100) / 100))}
          icon={<Icon d={ZOOM_IN} strokeWidth={1.8} />}
        />
        <Button onClick={() => onZoom(1)}>{t('适应宽度')}</Button>
        <span className={s.toolSep} aria-hidden="true" />
        <Button
          iconOnly
          aria-label={t('上一页')}
          disabled={pg === 0}
          onClick={() => onPage(Math.max(0, pg - 1))}
          icon={<Icon name="chevronLeft" strokeWidth={1.8} />}
        />
        <span className="num">
          {t('第')} {pg + 1} / {pages.length} {t('页')}
        </span>
        <Button
          iconOnly
          aria-label={t('下一页')}
          disabled={pg === pages.length - 1}
          onClick={() => onPage(Math.min(pages.length - 1, pg + 1))}
          icon={<Icon name="chevronRight" strokeWidth={1.8} />}
        />
        <div className={s.spacer} />
        <a className={s.extLink} href={ROUTES.invoiceViewer(encodeURIComponent(invoiceId))} target="_blank" rel="noopener">
          <Icon d={EXTERNAL} size={15} />
          {t('新窗口打开')}
        </a>
      </div>

      <div className={s.viewer}>
        <div className={s.paperBox} style={{ width: Math.round(PAPER_W * z), height: Math.round(PAPER_H * z) }}>
          <div className={s.paperScale} translate="no" style={{ transform: `scale(${z})` }}>
            {p ? <PaperPage p={p} /> : null}
          </div>
        </div>
      </div>

      <div className={s.thumbs}>
        {pages.map((_, i) => (
          <button
            key={i}
            type="button"
            className={cx(s.thumb, i === pg && s.thumbActive)}
            aria-label={t('第 ' + (i + 1) + ' 页')}
            aria-current={i === pg ? 'page' : undefined}
            onClick={() => onPage(i)}
          >
            <span className={s.thumbBar} />
            <span className={s.thumbLine} />
            <span className={s.thumbLine} />
            <span className={cx('num', s.thumbNo)}>{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** 票面「纸张」——原件内容，不翻译 */
function PaperPage({ p }: { p: DocPage }) {
  return (
    <div className={s.paper}>
      <div className={s.paperHead}>
        <div>
          <div className={s.paperTitle}>{p.title}</div>
          <div className={s.paperPageLabel}>{p.pageLabel}</div>
        </div>
        <div className={s.paperMeta}>
          <div>
            {p.noL}：<span className="mono">{p.no}</span>
          </div>
          <div>
            {p.dateL}：{p.date}
          </div>
          <div>
            {p.poL}：{p.po}
          </div>
        </div>
      </div>
      {p.kind === 'main' ? (
        <>
          <div className={s.parties}>
            <div className={s.party}>
              <div className={s.partyTitle}>{p.sellerL}</div>
              <div>{p.seller}</div>
              <div>
                {p.addrL}：{p.sellerAddr}
              </div>
              <div>
                {p.taxIdL}：<span className="mono">{p.sellerId}</span>
              </div>
            </div>
            <div className={s.party}>
              <div className={s.partyTitle}>{p.buyerL}</div>
              <div>{p.buyer}</div>
              <div>
                {p.taxIdL}：<span className="mono">{p.buyerId}</span>
              </div>
            </div>
          </div>
          <table className={s.paperTable}>
            <thead>
              <tr>
                <th>{p.itemL}</th>
                <th>{p.qtyL}</th>
                <th>{p.priceL}</th>
                <th>{p.amountL}</th>
              </tr>
            </thead>
            <tbody>
              {p.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.name}</td>
                  <td className="num">{it.qty}</td>
                  <td className="num">{it.price}</td>
                  <td className="num">{it.amt}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={s.totalsWrap}>
            <div className={cx('num', s.totals)}>
              <div className={s.totalsRow}>
                <span>{p.netL}</span>
                <span>{p.net}</span>
              </div>
              <div className={s.totalsRow}>
                <span>{p.taxL}</span>
                <span>{p.tax}</span>
              </div>
              <div className={cx(s.totalsRow, s.totalsGrand)}>
                <span>{p.totalL}</span>
                <span>{p.total}</span>
              </div>
            </div>
          </div>
          <div className={s.payInfo}>
            <div>
              {p.payL}：{p.pay}
            </div>
            <div>
              {p.bankL}：{p.bank}
            </div>
          </div>
        </>
      ) : (
        <div className={s.textPage}>
          <div className={s.textTitle}>{p.textTitle}</div>
          {p.lines.map((l, i) => (
            <div key={i} className={s.textLine}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
