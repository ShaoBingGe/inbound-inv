import { useState } from 'react';
import { Button, Icon } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { ImagePage } from '../types';
import d from './detail.module.css';

const ZOOM_OUT = 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6';
const ZOOM_IN = 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6M11 8v6';
const NEW_WIN = 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5';
/** 二维码示意点阵（8×8，装饰） */
const QR = '1110011110101001101011111001010111010101001011101100101101111001'.split('').map((ch) => ch === '1');

const PAGE_W = 560;
const PAGE_H = 792;

/** 原件影像（只读存证）：缩放、翻页、缩略图、新窗口打开。票面内容为原文，不翻译。 */
export function ImageViewer({
  invoiceNo,
  pages,
  hash,
  fileName,
}: {
  invoiceNo: string;
  pages: ImagePage[];
  hash: string;
  fileName: string;
}) {
  const t = useT();
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  const pg = Math.min(page, pages.length - 1);
  const p = pages[pg];
  const z = zoom;

  return (
    <div className={d.viewer}>
      <div className={d.toolbar}>
        <Button
          iconOnly
          aria-label={t('缩小')}
          disabled={z <= 0.5}
          onClick={() => setZoom((v) => Math.max(0.5, Math.round((v - 0.25) * 100) / 100))}
          icon={<Icon d={ZOOM_OUT} strokeWidth={1.8} />}
        />
        <span className={cx('num', d.zoomL)}>{Math.round(z * 100) + '%'}</span>
        <Button
          iconOnly
          aria-label={t('放大')}
          disabled={z >= 2.5}
          onClick={() => setZoom((v) => Math.min(2.5, Math.round((v + 0.25) * 100) / 100))}
          icon={<Icon d={ZOOM_IN} strokeWidth={1.8} />}
        />
        <Button onClick={() => setZoom(1)}>{t('适应宽度')}</Button>
        <span className={d.vsep} aria-hidden="true" />
        <Button
          iconOnly
          aria-label={t('上一页')}
          disabled={pg === 0}
          onClick={() => setPage(Math.max(0, pg - 1))}
          icon={<Icon name="chevronLeft" strokeWidth={1.8} />}
        />
        <span className="num">
          {t('第')} {pg + 1} / {pages.length} {t('页')}
        </span>
        <Button
          iconOnly
          aria-label={t('下一页')}
          disabled={pg === pages.length - 1}
          onClick={() => setPage(Math.min(pages.length - 1, pg + 1))}
          icon={<Icon name="chevronRight" strokeWidth={1.8} />}
        />
        <span className={d.grow} />
        <a className={d.btnLink} href={ROUTES.invoiceViewer(encodeURIComponent(invoiceNo))} target="_blank" rel="noopener">
          <Icon d={NEW_WIN} size={15} />
          {t('新窗口打开')}
        </a>
      </div>

      <div className={d.canvas}>
        <div className={d.box} style={{ width: Math.round(PAGE_W * z), height: Math.round(PAGE_H * z) }} dir="ltr">
          <div translate="no" className={d.scaler} style={{ transform: `scale(${z})` }}>
            <div className={d.paper}>
              <div className={d.paperHead}>
                <div>
                  <div className={d.paperTitle}>{p.title}</div>
                  <div className={d.paperPage}>{p.pageLabel}</div>
                </div>
                <div className={d.paperMeta}>
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
              {p.isMain ? (
                <>
                  <div className={d.parties}>
                    <div className={d.party}>
                      <div className={d.partyL}>{p.sellerL}</div>
                      <div>{p.seller}</div>
                      <div>
                        {p.addrL}：{p.sellerAddr}
                      </div>
                      <div>
                        {p.taxIdL}：<span className="mono">{p.sellerId}</span>
                      </div>
                    </div>
                    <div className={d.party}>
                      <div className={d.partyL}>{p.buyerL}</div>
                      <div>{p.buyer}</div>
                      <div>
                        {p.taxIdL}：<span className="mono">{p.buyerId}</span>
                      </div>
                    </div>
                  </div>
                  <table className={d.paperTable}>
                    <thead>
                      <tr>
                        <th>{p.itemL}</th>
                        <th className={d.r}>{p.qtyL}</th>
                        <th className={d.r}>{p.priceL}</th>
                        <th className={d.r}>{p.amountL}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.items.map((it, i) => (
                        <tr key={i}>
                          <td>{it.name}</td>
                          <td className={cx('num', d.r)}>{it.qty}</td>
                          <td className={cx('num', d.r)}>{it.price}</td>
                          <td className={cx('num', d.r)}>{it.amt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className={d.sumWrap}>
                    <div className={cx('num', d.sums)}>
                      <div className={d.sumRow}>
                        <span>{p.netL}</span>
                        <span>{p.net}</span>
                      </div>
                      <div className={d.sumRow}>
                        <span>{p.taxL}</span>
                        <span>{p.tax}</span>
                      </div>
                      <div className={cx(d.sumRow, d.sumTotal)}>
                        <span>{p.totalL}</span>
                        <span>{p.total}</span>
                      </div>
                    </div>
                  </div>
                  <div className={d.paperFoot}>
                    <div>
                      <div>
                        {p.payL}：{p.pay}
                      </div>
                      <div>
                        {p.bankL}：{p.bank}
                      </div>
                    </div>
                    <div className={d.qr} aria-hidden="true">
                      {QR.map((on, i) => (
                        <span key={i} className={on ? d.qrOn : d.qrOff} />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className={d.textPage}>
                  <div className={d.textTitle}>{p.textTitle}</div>
                  {p.lines.map((l, i) => (
                    <div key={i} className={d.textLine}>
                      {l}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={d.thumbs}>
        {pages.map((_, i) => (
          <button
            key={i}
            type="button"
            className={cx(d.thumb, i === pg && d.thumbOn)}
            aria-label={t('第 ' + (i + 1) + ' 页')}
            aria-pressed={i === pg}
            onClick={() => setPage(i)}
          >
            <span className={d.tBar} />
            <span className={d.tLine} />
            <span className={d.tLine} />
            <span className={cx(d.tLine, d.tShort)} />
            <span className={cx('num', d.tN)}>{i + 1}</span>
          </button>
        ))}
        <span className={d.hash}>
          {t('原件 SHA-256')} <span translate="no">{hash}</span> · <span translate="no">{fileName}</span>
        </span>
      </div>
    </div>
  );
}
