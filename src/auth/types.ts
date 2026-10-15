/** 业务角色。由 IdP 的 roles 声明映射而来（声明名可在运行时配置 auth.claims.roles 中修改）。 */
export type Role =
  | 'viewer' // 只读看板与票池
  | 'ap_clerk' // AP / 费控处理、发票修正
  | 'tax_manager' // 税务规则、税务统计
  | 'data_ops' // 数据中心运维、识别数据与规则
  | 'skill_editor' // 编辑 agent Skill
  | 'admin'; // 全部权限

export interface AppUser {
  id: string;
  name: string;
  email?: string;
  tenant?: string;
  roles: Role[];
  /** 可访问的国家 / 数据中心；["*"] 表示主数据中心（全球视角） */
  countries: string[];
  /** 来自哪个身份提供方 */
  providerId: string;
  /** 访问令牌过期时间（秒级时间戳），mock 模式为空 */
  expiresAt?: number;
}

export function hasRole(user: AppUser | null, roles?: Role[]): boolean {
  if (!roles || roles.length === 0) return true;
  if (!user) return false;
  if (user.roles.includes('admin')) return true;
  return roles.some((r) => user.roles.includes(r));
}

export function canSeeCountry(user: AppUser | null, country: string): boolean {
  if (!user) return false;
  return user.countries.includes('*') || user.countries.includes(country);
}
