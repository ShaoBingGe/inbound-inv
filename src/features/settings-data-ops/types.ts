/** 全球数据运维设置：数据中心、国家/实体、访问地址、IP 白名单、密钥、管理员、迁移 */

/** 健康状态（中文原文，显示时经 t()） */
export type DcHealth = '正常' | '同步延迟' | '初始化中' | string;

export interface DcCountry {
  /** ISO 3166-1 alpha-2，对应 user.countries 中的取值 */
  iso: string;
  /** 国家 / 地区名（简体中文原文） */
  name: string;
}

export interface DcEntity {
  code: string;
  name: string;
  /** 国家名（简体中文原文） */
  c: string;
  /** 国家 ISO 代码，用于可见范围过滤 */
  iso: string;
  cur: string;
  tax: string;
}

export type DcKeyId = 'sign' | 'dek' | 'agg' | 'hook';

export interface DcKey {
  id: DcKeyId;
  label: string;
  use: string;
  ver: string;
  at: string;
  /** 有效 / 已超 270 天 / 宽限期 72h */
  st: string;
}

export interface DcIpRule {
  cidr: string;
  note: string;
  scope: string;
  by: string;
}

export interface DcAdmin {
  name: string;
  mail: string;
  role: string;
  scope: string;
  /** 已启用 / 未启用 */
  mfa: string;
  last: string;
}

export interface DataCenter {
  code: string;
  name: string;
  master?: boolean;
  region: string;
  url: string;
  api: string;
  health: DcHealth;
  sync: string;
  countries: DcCountry[];
  entities: DcEntity[];
  keys: DcKey[];
  ips: DcIpRule[];
  admins: DcAdmin[];
}

export interface RbacRow {
  role: string;
  g: string;
  own: string;
  other: string;
}

/** 迁移步骤：[名称, 说明] */
export interface MigrationStepDef {
  label: string;
  sub: string;
}

export interface DataOpsView {
  /** 当前用户可见的数据中心（非全球视角时只含所服务国家及其实体） */
  dcs: DataCenter[];
  /** 是否为主数据中心全球视角（user.countries 含 "*"） */
  global: boolean;
  /** 所有数据中心编码（迁移目标下拉） */
  allCodes: string[];
  syncIn: string[];
  syncOut: string[];
  rbac: RbacRow[];
  migSteps: MigrationStepDef[];
}

export interface BasicInfoPatch {
  name: string;
  region: string;
  url: string;
  api: string;
}

export interface NewDataCenterDraft {
  code: string;
  name: string;
  url: string;
}

export interface MigrationRequest {
  from: string;
  /** 「国家：xx」或「实体：xx」 */
  obj: string;
  to: string;
  /** 将执行的步骤序号（0 起） */
  step: number;
}

export interface MigrationProgress {
  /** 已完成的步骤数 */
  step: number;
}
