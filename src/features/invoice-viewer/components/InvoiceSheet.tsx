import { cx } from '@/lib/sample';
import type { ViewerDocument } from '../types';
import s from './InvoiceSheet.module.css';

/** 原件影像（一页 A4 纸面）。票面内容是原件原文，不翻译。 */
export function InvoiceSheet({ doc, pageIndex }: { doc: ViewerDocument; pageIndex: number }) {
  const p = doc.pages[pageIndex];
  const total = doc.pages.length;
  if (!p) return null;
  return (
    <div className={s.paper} translate="no" dir="ltr" lang="ja">
      <div className={s.head}>
        <div>
          <div className={s.title}>{p.title}</div>
          <div className={s.pageNo}>
            Page {pageIndex + 1} / {total}
          </div>
        </div>
        <div className={s.meta}>
          <div>
            {doc.invoiceNoLabel}
            <span className="mono">{doc.id}</span>
          </div>
          <div>{doc.issueDateLine}</div>
          <div>{doc.orderNoLine}</div>
        </div>
      </div>

      {p.main ? (
        <>
          <div className={s.parties}>
            {[doc.issuer, doc.recipient].map((party) => (
              <div key={party.label} className={s.party}>
                <div className={s.partyLabel}>{party.label}</div>
                {party.lines.map((l) => (
                  <div key={l}>{l}</div>
                ))}
                <div>
                  登録番号：<span className="mono">{party.regNo}</span>
                </div>
              </div>
            ))}
          </div>

          <table className={s.items}>
            <thead>
              <tr>
                <th className={s.start}>{doc.itemHeaders.name}</th>
                <th className={s.end}>{doc.itemHeaders.qty}</th>
                <th className={s.end}>{doc.itemHeaders.unitPrice}</th>
                <th className={s.end}>{doc.itemHeaders.amount}</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((it) => (
                <tr key={it.name}>
                  <td>{it.name}</td>
                  <td className={cx('num', s.end)}>{it.qty}</td>
                  <td className={cx('num', s.end)}>{it.unitPrice}</td>
                  <td className={cx('num', s.end)}>{it.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={s.totalsWrap}>
            <div className={cx('num', s.totals)}>
              {doc.totals.map((r) => (
                <div key={r.label} className={cx(s.totalRow, r.grand && s.grand)}>
                  <span>{r.label}</span>
                  <span>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={s.payment}>
            {doc.paymentLines.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>

          <div className={s.handNote}>{doc.handNote}</div>
        </>
      ) : null}

      {p.text ? (
        <div className={s.textBlock}>
          <div className={s.textTitle}>{p.textTitle}</div>
          {(p.lines ?? []).map((l, i) => (
            <div key={i} className={s.textLine}>
              {l}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
