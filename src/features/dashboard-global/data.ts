/** 全球统一看板 · 示例数据（与设计稿 Main.dc.html 一致，确定性随机） */
import { hs, rng } from '@/lib/sample';
import type {
  DashboardData,
  DashboardQuery,
  ExcInvoice,
  FieldStatus,
  Leaf,
  RegionKey,
  ScopeCountry,
  StageKey,
  StageMap,
  TrendPoint,
  TrendQuery,
} from './types';
import { GLOBAL_SCOPE } from './types';

export const REGIONS: Record<RegionKey, string> = {
  APAC: '亚太',
  EMEA: '欧洲',
  NA: '北美',
  MEA: '中东与非洲',
  LATAM: '拉美',
};

export const DCNAME: Record<string, string> = {
  'CN-QD': '主数据中心 CN-QD 青岛',
  'JP-TYO': 'JP-TYO 东京',
  'SEA-SIN': 'SEA-SIN 新加坡',
  'EU-FRA': 'EU-FRA 法兰克福',
  'NA-IAD': 'NA-IAD 弗吉尼亚',
  'ME-RUH': 'ME-RUH 利雅得',
  'LATAM-GRU': 'LATAM-GRU 圣保罗',
};

interface CountryDef {
  id: string;
  name: string;
  region: RegionKey;
  dc: string;
  /** 体量权重 */
  w: number;
  acc: number;
  dur: number;
  /** 是否接入税局票池 */
  pool: boolean;
  provs: string[];
}

type CountryRow = [string, string, RegionKey, string, number, number, number, boolean, string[]];

const COUNTRY_ROWS: CountryRow[] = [
  ['CN', '中国大陆', 'APAC', 'CN-QD', 9, 99.2, 2.1, true, ['山东省', '广东省', '上海市', '江苏省', '四川省']],
  ['JP', '日本', 'APAC', 'JP-TYO', 2.2, 96.6, 4.6, false, ['东京都', '大阪府', '爱知县']],
  ['KR', '韩国', 'APAC', 'JP-TYO', 1.1, 96.1, 4.9, true, ['首尔', '京畿道']],
  ['SG', '新加坡', 'APAC', 'SEA-SIN', 0.8, 93.4, 6.8, false, ['新加坡']],
  ['TH', '泰国', 'APAC', 'SEA-SIN', 0.9, 92.8, 7.4, false, ['曼谷', '罗勇府']],
  ['VN', '越南', 'APAC', 'SEA-SIN', 1.0, 91.6, 8.6, true, ['胡志明市', '北宁省']],
  ['IN', '印度', 'APAC', 'SEA-SIN', 1.0, 94.0, 6.1, true, ['马哈拉施特拉邦', '泰米尔纳德邦']],
  ['AU', '澳大利亚', 'APAC', 'SEA-SIN', 0.7, 95.7, 5.2, false, ['新南威尔士州', '维多利亚州']],
  ['DE', '德国', 'EMEA', 'EU-FRA', 1.9, 95.9, 5.0, false, ['巴伐利亚州', '北莱茵-威斯特法伦州', '巴登-符腾堡州']],
  ['FR', '法国', 'EMEA', 'EU-FRA', 1.1, 95.1, 5.4, false, ['法兰西岛', '奥弗涅-罗讷-阿尔卑斯']],
  ['IT', '意大利', 'EMEA', 'EU-FRA', 1.0, 98.4, 2.9, true, ['伦巴第', '艾米利亚-罗马涅']],
  ['ES', '西班牙', 'EMEA', 'EU-FRA', 0.8, 95.0, 5.5, false, ['马德里', '加泰罗尼亚']],
  ['PL', '波兰', 'EMEA', 'EU-FRA', 0.7, 97.6, 3.4, true, ['马佐夫舍省']],
  ['GB', '英国', 'EMEA', 'EU-FRA', 0.9, 95.3, 5.1, false, ['英格兰', '苏格兰']],
  ['US', '美国', 'NA', 'NA-IAD', 2.6, 93.0, 6.6, false, ['加利福尼亚州', '得克萨斯州', '佐治亚州', '伊利诺伊州']],
  ['CA', '加拿大', 'NA', 'NA-IAD', 0.8, 94.2, 6.0, false, ['安大略省', '魁北克省']],
  ['MX', '墨西哥', 'NA', 'NA-IAD', 1.3, 98.1, 3.0, true, ['新莱昂州', '墨西哥城']],
  ['AE', '阿联酋', 'MEA', 'ME-RUH', 0.6, 94.5, 5.9, false, ['迪拜']],
  ['SA', '沙特阿拉伯', 'MEA', 'ME-RUH', 0.7, 97.0, 3.8, true, ['利雅得', '东部省']],
  ['ZA', '南非', 'MEA', 'ME-RUH', 0.8, 93.6, 6.4, false, ['豪登省', '西开普省']],
  ['BR', '巴西', 'LATAM', 'LATAM-GRU', 1.2, 97.8, 3.3, true, ['圣保罗州', '米纳斯吉拉斯州']],
];

export const COUNTRIES: CountryDef[] = COUNTRY_ROWS.map(([id, name, region, dc, w, acc, dur, pool, provs]) => ({
  id,
  name,
  region,
  dc,
  w,
  acc,
  dur,
  pool,
  provs,
}));

const CNAME: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.id, c.name]));

/** 设计稿「数据视角」下拉中列出的国家（顺序与设计稿一致） */
const FEATURED = ['CN', 'JP', 'DE', 'IT', 'US', 'MX', 'VN', 'SA', 'BR'];

export function buildScopes(): ScopeCountry[] {
  const byId = new Map(COUNTRIES.map((c) => [c.id, c]));
  const ordered = [
    ...FEATURED.map((id) => byId.get(id)).filter((c): c is CountryDef => !!c),
    ...COUNTRIES.filter((c) => !FEATURED.includes(c.id)),
  ];
  return ordered.map((c) => ({
    code: c.id,
    name: c.name,
    dc: c.dc,
    dcName: DCNAME[c.dc] ?? c.dc,
    featured: FEATURED.includes(c.id),
  }));
}

/** 行业：[名称, 体量权重, 平均单张金额] */
const INDS: Array<[string, number, number]> = [
  ['原材料', 1.4, 62000],
  ['电子元器件', 1.2, 38000],
  ['物流运输', 1.6, 8600],
  ['设备与模具', 0.5, 148000],
  ['专业服务', 0.8, 24000],
  ['差旅与行政', 2.0, 1700],
];

const STAGE_ORDER: StageKey[] = ['collect', 'taxsync', 'ap', 'exp', 'posted', 'paid'];

export function buildLeaves(month: string, scope: string): Leaf[] {
  const out: Leaf[] = [];
  COUNTRIES.forEach(({ id, name, region, w, acc, dur, pool, provs }) => {
    if (scope !== GLOBAL_SCOPE && scope !== id) return;
    provs.forEach((p, pi) => {
      INDS.forEach(([ind, iw, avg]) => {
        const r = rng(hs(month + id + p + ind));
        const n = Math.round(w * iw * (18 + 70 * r()) * (pi === 0 ? 1.6 : 1));
        const travel = ind === '差旅与行政';
        const sp = {
          collect: 0.05 + 0.06 * r(),
          taxsync: pool ? 0.03 + 0.06 * r() : 0,
          ap: (travel ? 0.03 : 0.12) + 0.06 * r(),
          exp: (travel ? 0.18 : 0.02) + 0.04 * r(),
          posted: 0.22 + 0.1 * r(),
        };
        const cnt: StageMap = { collect: 0, taxsync: 0, ap: 0, exp: 0, posted: 0, paid: 0 };
        let used = 0;
        (['collect', 'taxsync', 'ap', 'exp', 'posted'] as const).forEach((k) => {
          cnt[k] = Math.round(n * sp[k]);
          used += cnt[k];
        });
        cnt.paid = Math.max(0, n - used);
        const per = avg * (0.7 + 0.6 * r());
        const amtS: StageMap = { collect: 0, taxsync: 0, ap: 0, exp: 0, posted: 0, paid: 0 };
        let amt = 0;
        STAGE_ORDER.forEach((k) => {
          amtS[k] = cnt[k] * per;
          amt += amtS[k];
        });
        const g = -0.12 + 0.42 * r();
        const ga = g + (-0.08 + 0.16 * r());
        const a = Math.min(99.8, acc + (-1.2 + 2.4 * r()) - (travel ? 1.1 : 0));
        const aLy = a - (-0.6 + 3.2 * r());
        const d = dur * (0.8 + 0.5 * r());
        const dLy = d * (1.02 + 0.38 * r());
        out.push({
          region,
          regionName: REGIONS[region],
          country: id,
          countryName: name,
          prov: p,
          ind,
          n,
          cnt,
          amt,
          amtS,
          nly: n / (1 + g),
          amtly: amt / (1 + ga),
          acc: a,
          accLy: aLy,
          dur: d,
          durLy: dLy,
          timeout: Math.round(n * (0.002 + 0.008 * r()) * (dur / 3)),
          highErr: Math.round(((n * (100 - a)) / 100) * 0.6),
        });
      });
    });
  });
  return out;
}

type TimingRow = [string, number];
type FieldRow = [string, string, string, number, FieldStatus];
interface ExcRow {
  id: string;
  country: string;
  sup: string;
  kind: string;
  dur: number;
  errN: number;
  tot: number;
  stage: string;
  why: string;
  timing: TimingRow[];
  fields: FieldRow[];
}

const EXC_ROWS: ExcRow[] = [
  {
    id: 'INV-JP-2609-01872',
    country: '日本',
    sup: '株式会社宝田機械',
    kind: '適格請求書 · PDF 14 页',
    dur: 41.2,
    errN: 5,
    tot: 14,
    stage: '采集中',
    why: '多页 PDF 含手写追记，版面分析超时；登録番号与税率区分被误读',
    timing: [['上传与转码', 0.8], ['影像预处理', 2.4], ['版面分析', 24.6], ['OCR', 8.9], ['结构化抽取', 3.1], ['规则校验', 1.4]],
    fields: [
      ['登録番号', 'T7010001O81486', 'T7010001081486', 0.62, 'fix'],
      ['税率区分', '8%（軽減）', '10%', 0.55, 'fix'],
      ['消費税額', '¥72,160', '¥90,200', 0.58, 'fix'],
      ['開票日期', '2026-09-03', '2026-09-03', 0.98, 'ok'],
      ['合计金额', '¥992,200', '¥992,200', 0.97, 'ok'],
    ],
  },
  {
    id: 'INV-VN-2609-00433',
    country: '越南',
    sup: 'Cong ty TNHH Co khi Minh Phat',
    kind: 'Hóa đơn GTGT · 扫描件',
    dur: 36.5,
    errN: 4,
    tot: 12,
    stage: '税局票池同步中',
    why: '扫描倾斜 11°，越南语声调符号丢失导致销方名称与税局记录不一致',
    timing: [['上传与转码', 0.6], ['影像预处理', 9.8], ['版面分析', 6.2], ['OCR', 14.1], ['结构化抽取', 3.6], ['规则校验', 2.2]],
    fields: [
      ['Mã số thuế', '0312 45 6789', '0312456789', 0.71, 'fix'],
      ['Tên người bán', 'Cong ty TNHH Co khi Minh Phat', 'Công ty TNHH Cơ khí Minh Phát', 0.66, 'tax'],
      ['Ký hiệu', '1C26TMP', '1C26TMP', 0.94, 'ok'],
      ['Tiền thuế', '₫ 4.180.000', '₫ 4.180.000', 0.9, 'ok'],
    ],
  },
  {
    id: 'INV-US-2609-02210',
    country: '美国',
    sup: 'Blue Ridge Supply LLC',
    kind: 'Invoice · 邮件 PDF',
    dur: 12.4,
    errN: 4,
    tot: 11,
    stage: 'AP 单审核中',
    why: '税额未单列，Sales tax 被识别进行项金额；PO 号位于页脚被漏识',
    timing: [['上传与转码', 0.4], ['影像预处理', 1.1], ['版面分析', 3.2], ['OCR', 4.4], ['结构化抽取', 2.0], ['规则校验', 1.3]],
    fields: [
      ['PO number', '—', 'PO-4500128871', 0.0, 'fix'],
      ['Sales tax', '$0.00', '$742.90', 0.41, 'fix'],
      ['Subtotal', '$12,022.90', '$11,280.00', 0.52, 'fix'],
      ['Invoice no.', 'BR-77120', 'BR-77120', 0.96, 'ok'],
    ],
  },
  {
    id: 'INV-DE-2609-01104',
    country: '德国',
    sup: 'Werner Antriebstechnik GmbH',
    kind: 'Rechnung · ZUGFeRD',
    dur: 33.8,
    errN: 1,
    tot: 13,
    stage: '采集中',
    why: 'ZUGFeRD XML 与 PDF 呈现件金额不一致，触发双通道比对与人工确认',
    timing: [['上传与转码', 0.5], ['XML 解析', 0.9], ['版面分析', 4.0], ['OCR', 6.1], ['双通道比对', 20.8], ['规则校验', 1.5]],
    fields: [
      ['USt-IdNr.', 'DE811907980', 'DE811907980', 0.99, 'ok'],
      ['Gesamtbetrag', '€12.480,00', '€12.480,00', 0.99, 'lock'],
      ['Leistungsdatum', '2026-08-28', '2026-08-29', 0.74, 'fix'],
    ],
  },
  {
    id: 'INV-SA-2609-00287',
    country: '沙特阿拉伯',
    sup: 'Al Noor Industrial Co.',
    kind: 'Tax Invoice · 阿英双语',
    dur: 31.1,
    errN: 3,
    tot: 12,
    stage: '采集中',
    why: '阿拉伯语从右至左数字混排，ZATCA 二维码被遮挡，降级为 OCR 识别',
    timing: [['上传与转码', 0.7], ['二维码解码', 6.0], ['版面分析', 7.9], ['OCR', 11.2], ['结构化抽取', 3.4], ['规则校验', 1.9]],
    fields: [
      ['VAT number', '3001 2345 6700 003', '300123456700003', 0.69, 'fix'],
      ['Total incl. VAT', 'SAR 45,800', 'SAR 45,880', 0.6, 'fix'],
      ['Invoice date', '2026-09-14', '2026-09-14', 0.95, 'ok'],
    ],
  },
  {
    id: 'INV-CN-2609-18842',
    country: '中国大陆',
    sup: '江苏恒立液压股份有限公司',
    kind: '数电专票 · 税局票池',
    dur: 2.3,
    errN: 2,
    tot: 10,
    stage: '已入账',
    why: 'OCR 读错的金额已被税局票池数据覆盖（不允许人工更正）；计入识别误差，样本已回流',
    timing: [['税局票池拉取', 0.9], ['影像预处理', 0.3], ['OCR', 0.6], ['税局比对', 0.4], ['规则校验', 0.1]],
    fields: [
      ['价税合计', '¥113,000.00', '¥118,000.00', 0.81, 'tax'],
      ['税额', '¥13,000.00', '¥13,575.22', 0.79, 'tax'],
      ['发票号码', '26372000000018842', '26372000000018842', 1.0, 'lock'],
    ],
  },
  {
    id: 'INV-BR-2609-00951',
    country: '巴西',
    sup: 'Metalúrgica São Bento Ltda.',
    kind: 'NF-e DANFE · 邮件',
    dur: 34.0,
    errN: 1,
    tot: 15,
    stage: '税局票池同步中',
    why: 'SEFAZ 授权查询排队，等待返回 chave de acesso 状态',
    timing: [['上传与转码', 0.5], ['影像预处理', 0.8], ['OCR', 3.1], ['SEFAZ 查询', 27.4], ['规则校验', 2.2]],
    fields: [
      ['CNPJ emitente', '12.345.678/0001-90', '12.345.678/0001-90', 0.99, 'ok'],
      ['Valor ICMS', 'R$ 1.826,40', 'R$ 1.862,40', 0.7, 'fix'],
    ],
  },
];

const CODE_BY_NAME: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.name, c.id]));

export const EXCEPTIONS: ExcInvoice[] = EXC_ROWS.map((e) => ({
  ...e,
  countryCode: CODE_BY_NAME[e.country] ?? '',
  timing: e.timing.map(([label, s]) => ({ label, s })),
  fields: e.fields.map(([label, ocr, cur, conf, status]) => ({ label, ocr, cur, conf, status })),
}));

/** 当前视角可见的异常发票（全球视角看全部；国家视角只看本国） */
export function buildExceptions(scope: string): ExcInvoice[] {
  return EXCEPTIONS.filter((e) => scope === GLOBAL_SCOPE || CNAME[scope] === e.country);
}

export function buildDashboard(q: DashboardQuery): DashboardData {
  return { leaves: buildLeaves(q.month, q.scope), exceptions: buildExceptions(q.scope) };
}

const MONTHS = ['10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月'];

/** 近 12 个月同比序列：最后一个月为当月实际同比，之前月份为示例波动 */
export function buildTrend(q: TrendQuery): TrendPoint[] {
  const { c: cNow, a: aNow, acc: accNow, dur: durNow } = q.now;
  const seed = rng(hs((q.node || 'total') + q.scope + q.month));
  return MONTHS.map((m, i) => {
    const last = i === 11;
    const k = 1 - i / 13;
    const c = last ? cNow : cNow + (-14 + 28 * seed()) * k;
    const a = last ? aNow : aNow + (-16 + 32 * seed()) * k;
    const acc = last ? accNow : accNow * (0.4 + (0.6 * i) / 11) + (-0.8 + 1.6 * seed());
    const dur = last ? durNow : durNow * (0.5 + (0.5 * i) / 11) + (-10 + 20 * seed());
    return { m, c, a, acc, dur };
  });
}
