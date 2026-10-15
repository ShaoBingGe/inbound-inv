/* 示例数据（mock）：与设计稿 DataCenter.dc.html 一致 */
import type { DataCenter, DcCountry, DcEntity, DcKey, MigrationStepDef, RbacRow } from './types';

/** 国家名 → ISO 代码（user.countries 使用 ISO 代码） */
export const COUNTRY_ISO: Record<string, string> = {
  中国大陆: 'CN',
  中国香港: 'HK',
  日本: 'JP',
  韩国: 'KR',
  新加坡: 'SG',
  泰国: 'TH',
  越南: 'VN',
  印度: 'IN',
  澳大利亚: 'AU',
  德国: 'DE',
  法国: 'FR',
  意大利: 'IT',
  西班牙: 'ES',
  波兰: 'PL',
  英国: 'GB',
  美国: 'US',
  加拿大: 'CA',
  墨西哥: 'MX',
  沙特阿拉伯: 'SA',
  阿联酋: 'AE',
  南非: 'ZA',
  巴西: 'BR',
};

const iso = (name: string) => COUNTRY_ISO[name] ?? name;
const C = (...names: string[]): DcCountry[] => names.map((name) => ({ iso: iso(name), name }));
const E = (code: string, name: string, c: string, cur: string, tax: string): DcEntity => ({ code, name, c, iso: iso(c), cur, tax });

export const KEYS = (d: string): DcKey[] => [
  { id: 'sign', label: 'API 签名密钥', use: 'SDK 与开放接口验签', ver: 'v7', at: '2026-07-02', st: '有效' },
  { id: 'dek', label: '数据加密密钥（包装密钥）', use: '影像与票面字段静态加密', ver: 'v4', at: '2026-04-18', st: '有效' },
  {
    id: 'agg',
    label: '汇总同步密钥',
    use: '向主数据中心推送聚合指标（mTLS）',
    ver: 'v12',
    at: d === 'NA-IAD' ? '2026-01-09' : '2026-09-01',
    st: d === 'NA-IAD' ? '已超 270 天' : '有效',
  },
  { id: 'hook', label: 'Webhook 回调密钥', use: '回调宿主系统时签名', ver: 'v3', at: '2026-05-27', st: '有效' },
];

type DcBase = Omit<DataCenter, 'keys' | 'ips' | 'admins'>;

const DC_BASE: DcBase[] = [
  {
    code: 'CN-QD',
    name: '青岛 · 主数据中心',
    master: true,
    region: 'cn-north-qd-1',
    url: 'https://cn.hub.example.com',
    api: 'https://api.cn.hub.example.com',
    health: '正常',
    sync: '—',
    countries: C('中国大陆', '中国香港'),
    entities: [
      E('CN-QD-01', '集团总部', '中国大陆', 'CNY', '9137…01X'),
      E('CN-SH-01', '上海分公司', '中国大陆', 'CNY', '9131…7Q2'),
      E('CN-GD-02', '广东制造基地', '中国大陆', 'CNY', '9144…3K8'),
      E('HK-01', '香港贸易公司', '中国香港', 'HKD', 'BR 6612…'),
    ],
  },
  {
    code: 'JP-TYO',
    name: '东京',
    region: 'ap-northeast-1',
    url: 'https://jp.hub.example.com',
    api: 'https://api.jp.hub.example.com',
    health: '正常',
    sync: '6 分钟前',
    countries: C('日本', '韩国'),
    entities: [E('JP-TYO-01', '日本法人', '日本', 'JPY', 'T70100…'), E('KR-SEL-01', '韩国法人', '韩国', 'KRW', '120-86-…')],
  },
  {
    code: 'SEA-SIN',
    name: '新加坡',
    region: 'ap-southeast-1',
    url: 'https://sea.hub.example.com',
    api: 'https://api.sea.hub.example.com',
    health: '正常',
    sync: '3 分钟前',
    countries: C('新加坡', '泰国', '越南', '印度', '澳大利亚'),
    entities: [
      E('SG-01', '东南亚区域总部', '新加坡', 'SGD', '2019…K'),
      E('TH-RY-01', '泰国工厂', '泰国', 'THB', '0105…'),
      E('VN-BN-01', '越南工厂', '越南', 'VND', '2301…'),
      E('IN-MH-01', '印度法人', '印度', 'INR', '27AA…'),
      E('AU-01', '澳大利亚法人', '澳大利亚', 'AUD', 'ABN 51…'),
    ],
  },
  {
    code: 'EU-FRA',
    name: '法兰克福',
    region: 'eu-central-1',
    url: 'https://eu.hub.example.com',
    api: 'https://api.eu.hub.example.com',
    health: '正常',
    sync: '2 分钟前',
    countries: C('德国', '法国', '意大利', '西班牙', '波兰', '英国'),
    entities: [
      E('DE-MUC-01', '德国法人', '德国', 'EUR', 'DE81…'),
      E('FR-PAR-01', '法国法人', '法国', 'EUR', 'FR42…'),
      E('IT-MI-01', '意大利法人', '意大利', 'EUR', 'IT07…'),
      E('PL-WA-01', '波兰工厂', '波兰', 'PLN', 'PL52…'),
    ],
  },
  {
    code: 'NA-IAD',
    name: '弗吉尼亚',
    region: 'us-east-1',
    url: 'https://na.hub.example.com',
    api: 'https://api.na.hub.example.com',
    health: '同步延迟',
    sync: '41 分钟前',
    countries: C('美国', '加拿大', '墨西哥'),
    entities: [
      E('US-ATL-01', '美国法人', '美国', 'USD', 'EIN 58-…'),
      E('CA-TOR-01', '加拿大法人', '加拿大', 'CAD', 'BN 81…'),
      E('MX-MTY-01', '墨西哥工厂', '墨西哥', 'MXN', 'RFC HMX…'),
    ],
  },
  {
    code: 'ME-RUH',
    name: '利雅得',
    region: 'me-central-1',
    url: 'https://me.hub.example.com',
    api: 'https://api.me.hub.example.com',
    health: '正常',
    sync: '9 分钟前',
    countries: C('沙特阿拉伯', '阿联酋', '南非'),
    entities: [
      E('SA-RUH-01', '沙特法人', '沙特阿拉伯', 'SAR', '3001…'),
      E('AE-DXB-01', '阿联酋法人', '阿联酋', 'AED', 'TRN 1004…'),
      E('ZA-JNB-01', '南非法人', '南非', 'ZAR', '4120…'),
    ],
  },
  {
    code: 'LATAM-GRU',
    name: '圣保罗',
    region: 'sa-east-1',
    url: 'https://latam.hub.example.com',
    api: 'https://api.latam.hub.example.com',
    health: '正常',
    sync: '5 分钟前',
    countries: C('巴西'),
    entities: [E('BR-SP-01', '巴西法人', '巴西', 'BRL', 'CNPJ 12.3…')],
  },
];

/** 完整数据中心列表（每次调用返回新副本） */
export function buildDataCenters(): DataCenter[] {
  return DC_BASE.map((d) => ({
    ...d,
    countries: d.countries.map((c) => ({ ...c })),
    entities: d.entities.map((e) => ({ ...e })),
    keys: KEYS(d.code),
    ips: [
      { cidr: '198.51.100.0/24', note: '集团办公网出口', scope: '管理后台 + API', by: '平台管理员' },
      { cidr: '203.0.113.16/28', note: d.code + ' ERP 集成服务器', scope: '仅 API', by: '集成管理员' },
    ],
    admins: [
      {
        name: d.master ? '王 琳' : '区域管理员',
        mail: 'admin.' + d.code.toLowerCase() + '@group.example.com',
        role: d.master ? '平台管理员' : '数据中心管理员',
        scope: d.master ? '全球汇总 + 本中心明细' : '仅本中心国家',
        mfa: '已启用',
        last: '2026-10-12 18:40',
      },
      {
        name: '审计员',
        mail: 'audit.' + d.code.toLowerCase() + '@group.example.com',
        role: '只读审计',
        scope: '本中心日志',
        mfa: d.code === 'NA-IAD' ? '未启用' : '已启用',
        last: '2026-10-09 09:12',
      },
    ],
  }));
}

const MSTEP_ROWS: Array<[string, string]> = [
  ['预检查', '目标中心容量、驻留合规（目标国家是否允许存放）、版本一致性'],
  ['冻结写入窗口', '源端对迁移对象进入只读，采集请求排队（默认 ≤ 10 分钟）'],
  ['全量快照', '影像、原件、解析版本、更正记录、补偿事件一并复制'],
  ['增量同步', '回放冻结前的变更日志直至追平'],
  ['一致性校验', '逐表行数、逐文件 SHA-256、抽样 1% 字段比对'],
  ['切换路由', '更新 SDK 路由表与访问地址；令牌按新中心重新签发'],
  ['源端保留与清除', '源端只读保留 30 天以便回滚，到期按删除证明清除'],
];
export const MSTEPS: MigrationStepDef[] = MSTEP_ROWS.map(([label, sub]) => ({ label, sub }));

export const SYNC_IN: string[] = [
  '按国家 / 地区 / 省份 / 行业 / 状态分组的发票数量与金额（折算 CNY）',
  '同口径同比所需的去年同期聚合值',
  '识别准确率、平均识别时长、超时与高误差票数',
  '数据中心健康与同步延迟',
  '模型版本与各国数据集评测指标',
];

export const SYNC_OUT: string[] = ['发票影像与原件', '票面字段明细（税号、银行账户、金额明细）', '员工与供应商个人信息', '邮箱令牌与邮件内容'];

export const RBAC: RbacRow[] = [
  { role: '集团平台管理员', g: '全部国家', own: '可见', other: '不可见（需到对应中心申请）' },
  { role: '集团财务 / CFO 办公室', g: '全部国家', own: '—', other: '不可见' },
  { role: '国家财务负责人', g: '仅本国', own: '可见', other: '不可见' },
  { role: '国家 AP / 费控', g: '不可见', own: '按法人授权', other: '不可见' },
];

/** 新增数据中心弹窗的默认草稿 */
export const DEFAULT_DRAFT = { code: 'ME-DXB', name: '迪拜', url: 'https://me2.hub.example.com' };

/** 示例中当前操作人（添加 IP、审批人） */
export const CURRENT_OPERATOR = '王 琳';
/** 示例中「今天」（重发密钥日期） */
export const TODAY = '2026-10-13';
