/** 影像查看器领域类型。票面字段均为原件原文（不翻译）。 */

/** 原件的一页 */
export interface ViewerPage {
  /** 主票面（发行者 / 宛先 / 明细表 / 合计） */
  main: boolean;
  /** 文字页（标题 + 若干行） */
  text: boolean;
  title: string;
  textTitle?: string;
  lines?: string[];
}

export interface ViewerParty {
  /** 栏目名，如 発行者 / 宛先 */
  label: string;
  lines: string[];
  /** 登録番号（等宽显示） */
  regNo: string;
}

export interface ViewerLineItem {
  name: string;
  qty: number;
  unitPrice: string;
  amount: string;
}

export interface ViewerTotalRow {
  label: string;
  value: string;
  /** 合计行（粗体 + 上边线） */
  grand?: boolean;
}

/** 一张原件（含全部页面） */
export interface ViewerDocument {
  id: string;
  issuerName: string;
  /** 票种，如 適格請求書 */
  docType: string;
  /** 存证哈希缩写 */
  shaShort: string;
  /** 下载文件名 */
  fileName: string;
  /** 票头右侧字段：請求書番号 / 発行日 / 注文番号 */
  invoiceNoLabel: string;
  issueDateLine: string;
  orderNoLine: string;
  issuer: ViewerParty;
  recipient: ViewerParty;
  itemHeaders: { name: string; qty: string; unitPrice: string; amount: string };
  items: ViewerLineItem[];
  totals: ViewerTotalRow[];
  paymentLines: string[];
  /** 手写追记 */
  handNote: string;
  pages: ViewerPage[];
}

/** 下载原件：返回文件地址 */
export interface ViewerFileLink {
  url: string | null;
  fileName: string;
}
