import { http, isMock, mockDelay } from '@/lib/http';
import {
  buildDataCenters,
  CURRENT_OPERATOR,
  KEYS,
  MSTEPS,
  RBAC,
  SYNC_IN,
  SYNC_OUT,
  TODAY,
} from './data';
import type {
  BasicInfoPatch,
  DataCenter,
  DataOpsView,
  DcIpRule,
  DcKey,
  DcKeyId,
  MigrationProgress,
  MigrationRequest,
  NewDataCenterDraft,
} from './types';

/* ---------- mock 存储：会话内保留写操作结果 ---------- */
let store: DataCenter[] | null = null;
function db(): DataCenter[] {
  if (!store) store = buildDataCenters();
  return store;
}
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
function findDc(code: string): DataCenter {
  const d = db().find((x) => x.code === code);
  if (!d) throw new Error('数据中心不存在：' + code);
  return d;
}

/**
 * 按可见范围裁剪：countries 含 "*" 为主数据中心全球视角；
 * 否则只保留服务这些国家的数据中心，且每个中心只保留可见国家与其实体。
 */
function scopeView(all: DataCenter[], scope: string[]): DataCenter[] {
  if (scope.includes('*')) return all;
  return all
    .map((d) => ({
      ...d,
      countries: d.countries.filter((c) => scope.includes(c.iso)),
      entities: d.entities.filter((e) => scope.includes(e.iso)),
    }))
    .filter((d) => d.countries.length > 0 || d.entities.length > 0);
}

export async function fetchDataOps(scope: string[]): Promise<DataOpsView> {
  if (isMock()) {
    const all = clone(db());
    return mockDelay({
      dcs: scopeView(all, scope),
      global: scope.includes('*'),
      allCodes: all.map((d) => d.code),
      syncIn: SYNC_IN,
      syncOut: SYNC_OUT,
      rbac: RBAC,
      migSteps: MSTEPS,
    });
  }
  // 后端按令牌中的 dc_scope 同样裁剪，这里的 scope 只用于前端体验
  return http.get<DataOpsView>('/v1/data-centers/overview', { query: { scope: scope.join(',') } });
}

export async function createDataCenter(draft: NewDataCenterDraft): Promise<DataCenter> {
  if (isMock()) {
    if (db().some((x) => x.code === draft.code)) throw new Error('数据中心编码已存在：' + draft.code);
    const n: DataCenter = {
      code: draft.code,
      name: draft.name,
      region: '待分配',
      url: draft.url,
      api: draft.url.replace('https://', 'https://api.'),
      health: '初始化中',
      sync: '—',
      countries: [],
      entities: [],
      keys: KEYS(draft.code),
      ips: [],
      admins: [],
    };
    db().push(n);
    return mockDelay(clone(n));
  }
  return http.post<DataCenter>('/v1/data-centers', draft);
}

export async function updateDataCenterBasic(code: string, patch: BasicInfoPatch): Promise<void> {
  if (isMock()) {
    Object.assign(findDc(code), patch);
    return mockDelay(undefined);
  }
  await http.patch<unknown>(`/v1/data-centers/${encodeURIComponent(code)}`, patch);
}

/** 删除数据中心（仅限已迁出全部国家与实体的非主中心，调用前须输入编码确认） */
export async function deleteDataCenter(code: string, confirm: string): Promise<void> {
  if (isMock()) {
    const d = findDc(code);
    if (confirm !== code) throw new Error('确认编码不一致');
    if (d.master || d.countries.length || d.entities.length) throw new Error('该中心仍有数据，不能删除');
    store = db().filter((x) => x.code !== code);
    return mockDelay(undefined);
  }
  await http.del<unknown>(`/v1/data-centers/${encodeURIComponent(code)}`, { query: { confirm } });
}

/** 添加 IP 白名单；添加人由后端按当前登录人填写 */
export async function addIpRule(code: string, rule: Omit<DcIpRule, 'by'>): Promise<DcIpRule> {
  if (isMock()) {
    const r: DcIpRule = { ...rule, by: CURRENT_OPERATOR };
    findDc(code).ips.push(r);
    return mockDelay({ ...r });
  }
  return http.post<DcIpRule>(`/v1/data-centers/${encodeURIComponent(code)}/ip-whitelist`, rule);
}

export async function removeIpRule(code: string, cidr: string): Promise<void> {
  if (isMock()) {
    const d = findDc(code);
    d.ips = d.ips.filter((i) => i.cidr !== cidr);
    return mockDelay(undefined);
  }
  await http.del<unknown>(`/v1/data-centers/${encodeURIComponent(code)}/ip-whitelist`, { query: { cidr } });
}

/** 重发密钥：生成新版本，旧版本进入 72 小时宽限期（调用前须输入 ROTATE 确认） */
export async function rotateKey(code: string, keyId: DcKeyId, confirm: string): Promise<DcKey> {
  if (isMock()) {
    if (confirm !== 'ROTATE') throw new Error('确认口令不一致');
    const k = findDc(code).keys.find((y) => y.id === keyId);
    if (!k) throw new Error('密钥不存在：' + keyId);
    k.ver = 'v' + (parseInt(k.ver.slice(1), 10) + 1);
    k.at = TODAY;
    k.st = '宽限期 72h';
    return mockDelay({ ...k });
  }
  return http.post<DcKey>(`/v1/data-centers/${encodeURIComponent(code)}/keys/${keyId}/rotate`, { confirm });
}

/** 提交管理员账号重置审批（调用前须输入 RESET 确认；需两名平台管理员审批） */
export async function requestAdminReset(code: string, mail: string, confirm: string): Promise<void> {
  if (isMock()) {
    if (confirm !== 'RESET') throw new Error('确认口令不一致');
    findDc(code);
    return mockDelay(undefined);
  }
  await http.post<unknown>(`/v1/data-centers/${encodeURIComponent(code)}/admins/reset-requests`, { mail, confirm });
}

/** 执行迁移的下一步（预检查 → 冻结 → 快照 → 增量 → 校验 → 切换 → 源端保留） */
export async function advanceMigration(req: MigrationRequest): Promise<MigrationProgress> {
  if (isMock()) {
    findDc(req.from);
    findDc(req.to);
    return mockDelay({ step: Math.min(req.step + 1, MSTEPS.length) });
  }
  return http.post<MigrationProgress>(`/v1/data-centers/${encodeURIComponent(req.from)}/migrations/steps`, req);
}
