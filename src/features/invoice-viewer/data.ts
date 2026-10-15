import type { ViewerDocument, ViewerPage } from './types';

/** 示例原件：日本適格請求書 TK-2609-0031（3 页），与设计稿一致 */
export const SAMPLE_ID = 'TK-2609-0031';

export const PAGES: ViewerPage[] = [
  { main: true, text: false, title: '適格請求書' },
  {
    main: false,
    text: true,
    title: '適格請求書（明細）',
    textTitle: '明細・支払条件',
    lines: [
      '精密プレス金型 P-12 · 1 × ¥ 820,000',
      '据付・調整作業 · 1 × ¥ 82,000',
      '税率区分：10%（標準税率）',
      '支払条件：月末締め翌月末払い',
      '支払期日：2026-10-31',
      '振込先：みずほ銀行 芝支店 普通 ····1774',
    ],
  },
  {
    main: false,
    text: true,
    title: '納品書（添付）',
    textTitle: '納品書',
    lines: ['精密プレス金型 P-12 — 1', '据付・調整作業 — 1', '検収日：2026-09-01', '受領印：済', '—', '—'],
  },
];

export function buildViewerDocument(id: string = SAMPLE_ID): ViewerDocument {
  return {
    id,
    issuerName: '株式会社宝田機械',
    docType: '適格請求書',
    shaShort: '9f3a…c21e',
    fileName: `${id}.pdf`,
    invoiceNoLabel: '請求書番号：',
    issueDateLine: '発行日：2026-09-03',
    orderNoLine: '注文番号：PO-4500127730',
    issuer: {
      label: '発行者',
      lines: ['株式会社宝田機械', '住所：東京都港区芝浦 3-1-1'],
      regNo: 'T7010001081486',
    },
    recipient: {
      label: '宛先',
      lines: ['グループジャパン株式会社 御中'],
      regNo: 'T8010401XXXXXX',
    },
    itemHeaders: { name: '品名', qty: '数量', unitPrice: '単価', amount: '金額' },
    items: [
      { name: '精密プレス金型 P-12', qty: 1, unitPrice: '¥ 820,000', amount: '¥ 820,000' },
      { name: '据付・調整作業', qty: 1, unitPrice: '¥ 82,000', amount: '¥ 82,000' },
    ],
    totals: [
      { label: '小計（税抜）', value: '¥ 902,000' },
      { label: '消費税額 10%', value: '¥ 90,200' },
      { label: '合計金額（税込）', value: '¥ 992,200', grand: true },
    ],
    paymentLines: ['支払条件：月末締め翌月末払い', '振込先：みずほ銀行 芝支店 普通 ····1774'],
    handNote: '※ 手書き追記：据付は 9/10 完了',
    pages: PAGES,
  };
}
