/** 匹配训练成果：大模型对「发票品名 ↔ 入库物料」对应关系的学习情况 */

/** 训练成果按供应商查看 */
export interface TrainingSupplier {
  code: string;
  /** 供应商名称（主数据） */
  name: string;
  /** 最近 12 个月供货物料数 */
  materials: number;
  /** 最近 12 个月供货物料品名数 */
  names: number;
  /** 已学会品名数 */
  learned: number;
  /** 物料覆盖率（%） */
  coverage: number;
}

export interface TrainingOverview {
  /** 数据更新时间 */
  updatedAt: string;
  suppliers: TrainingSupplier[];
}

/** 已学习的发票品规及其与入库单位的换算 */
export interface LearnedInvoice {
  iname: string;
  ispec: string;
  iunit: string;
  /** 1 入库单位 ≈ ratio 发票单位 */
  ratio: number;
  conf: number;
}

/** 入库物料的一个规格 */
export interface TrainingSpec {
  sid: string;
  spec: string;
  unit: string;
  /** 有可学习的发票（否则待人工标注） */
  ok: boolean;
  invoices: LearnedInvoice[];
}

/** 入库单物料品名 */
export interface TrainingName {
  id: string;
  name: string;
  specs: TrainingSpec[];
}

export interface TrainingDetail {
  supplier: TrainingSupplier;
  items: TrainingName[];
  /** 已终止学习：'n:<品名 id>' 或 's:<规格 id>' */
  stopped: string[];
}

/** 品名的学习状态 */
export interface NameStatus {
  /** 全部规格已学习 */
  ok: boolean;
  /** 品名整体已终止 */
  stopped: boolean;
  learned: number;
  total: number;
}

/** 规格的学习状态 */
export type SpecStatus = 'learned' | 'unlearned' | 'stopped';
