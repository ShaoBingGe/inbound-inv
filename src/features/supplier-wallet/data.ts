/** 供应商票夹示例数据（与设计稿 Wallet.dc.html 一致） */
import type {
  ApState,
  CorrectionLogEntry,
  CountryCode,
  ExpState,
  LineResult,
  MatchLine,
  MatchState,
  RouteRule,
  StateLabel,
  WalletCountry,
  WalletSupplier,
} from './types';

type CountryBase = Omit<WalletCountry, 'invoiceCount' | 'code'>;

export const COUNTRY_ORDER: CountryCode[] = ['CN', 'JP', 'DE', 'US', 'MX'];

export const CTY: Record<CountryCode, CountryBase> = {
  CN: { name: '中国大陆', dc: 'CN-QD 青岛（主数据中心）', err: '0.9%', auto: '91.2%', touchless: '84.6%' },
  JP: { name: '日本', dc: 'JP-TYO 东京', err: '3.6%', auto: '78.4%', touchless: '66.0%' },
  DE: { name: '德国', dc: 'EU-FRA 法兰克福', err: '4.1%', auto: '82.9%', touchless: '71.3%' },
  US: { name: '美国', dc: 'NA-IAD 弗吉尼亚', err: '7.2%', auto: '69.5%', touchless: '58.8%' },
  MX: { name: '墨西哥', dc: 'NA-IAD 弗吉尼亚', err: '1.8%', auto: '88.0%', touchless: '80.1%' },
};

/* match: ok|tol|diff|wait|na ; ap: posted|draft|none|blocked ; exp: na|linked|wait */
export const MATCH_LABEL: Record<MatchState, StateLabel> = {
  ok: { label: '匹配', tone: 'green' },
  tol: { label: '容差内', tone: 'blue' },
  diff: { label: '有差异', tone: 'red' },
  wait: { label: '待收货', tone: 'orange' },
  na: { label: '不适用', tone: 'gray' },
};
export const AP_LABEL: Record<ApState, StateLabel> = {
  posted: { label: '已过账', tone: 'green' },
  draft: { label: 'AP 单待审', tone: 'blue' },
  none: { label: '未生成', tone: 'gray' },
  blocked: { label: '已阻断', tone: 'red' },
};
export const EXP_LABEL: Record<ExpState, StateLabel> = {
  na: { label: '不适用', tone: 'gray' },
  linked: { label: '已关联报销单', tone: 'green' },
  wait: { label: '待推送', tone: 'orange' },
};
/** 匹配行结果：标签、色调、发票列是否标红/橙 */
export const LINE_LABEL: Record<LineResult, StateLabel & { ink: 'ink' | 'red' | 'orange' }> = {
  ok: { label: '匹配', tone: 'green', ink: 'ink' },
  tol: { label: '容差内', tone: 'blue', ink: 'ink' },
  diff: { label: '超出容差', tone: 'red', ink: 'red' },
  wait: { label: '未收货', tone: 'orange', ink: 'orange' },
};

type LineTuple = [string, string, string, string, LineResult];
type LogTuple = [string, string, string, string, string];
const lines = (xs: LineTuple[]): MatchLine[] => xs.map(([item, po, grn, inv, res]) => ({ item, po, grn, inv, res }));
const logs = (xs: LogTuple[]): CorrectionLogEntry[] =>
  xs.map(([at, field, before, after, source]) => ({ at, field, before, after, source }));

export const SUPPLIERS: Record<CountryCode, WalletSupplier[]> = {
  CN: [
    {
      code: 'SUP-0007712',
      name: '江苏恒立液压股份有限公司',
      ind: '原材料',
      invs: [
        {
          no: '26372000000018842', kind: '数电专票', date: '2026-09-08', amt: '¥118,000.00', err: [2, 10], route: 'PO',
          m: 'ok', ap: 'posted', ex: 'na', po: 'PO-4500127102', grn: 'GR-5000331',
          lines: lines([['液压油缸 HC-80', '20 × 5,221.24', '20', '20 × 5,221.24', 'ok']]),
          log: logs([
            ['2026-09-08 10:21', '价税合计', '¥113,000.00', '¥118,000.00', '税局覆盖'],
            ['2026-09-08 10:21', '税额', '¥13,000.00', '¥13,575.22', '税局覆盖'],
          ]),
        },
        {
          no: '26372000000019310', kind: '数电专票', date: '2026-09-22', amt: '¥59,000.00', err: [0, 10], route: 'PO',
          m: 'wait', ap: 'none', ex: 'na', po: 'PO-4500128410', grn: '—',
          lines: lines([['液压油缸 HC-80', '10 × 5,221.24', '0', '10 × 5,221.24', 'wait']]),
          log: [],
        },
      ],
    },
    {
      code: 'SUP-0013120',
      name: '上海虹桥商务酒店有限公司',
      ind: '差旅与行政',
      invs: [
        {
          no: '26312000000431902', kind: '数电普票', date: '2026-08-12', amt: '¥1,836.00', err: [0, 8], route: '费控',
          m: 'na', ap: 'none', ex: 'linked', po: '—', grn: '—', lines: [], log: [],
        },
      ],
    },
  ],
  JP: [
    {
      code: 'SUP-0013397',
      name: '株式会社宝田機械',
      ind: '设备与模具',
      invs: [
        {
          no: 'TK-2609-0031', kind: '適格請求書', date: '2026-09-03', amt: '¥992,200', err: [4, 14], route: 'PO',
          m: 'diff', ap: 'blocked', ex: 'na', po: 'PO-4500127730', grn: 'GR-5000402',
          lines: lines([
            ['精密冲压模具 P-12', '1 × 820,000', '1', '1 × 820,000', 'ok'],
            ['安装调试', '1 × 82,000', '1', '1 × 82,000', 'ok'],
            ['消費税', '10% · 90,200', '—', '8% · 72,160', 'diff'],
          ]),
          log: [],
        },
        {
          no: 'TK-2608-0117', kind: '適格請求書', date: '2026-08-21', amt: '¥1,408,000', err: [1, 14], route: 'PO',
          m: 'ok', ap: 'posted', ex: 'na', po: 'PO-4500125519', grn: 'GR-5000210',
          lines: lines([['精密冲压模具 P-09', '1 × 1,280,000', '1', '1 × 1,280,000', 'ok']]),
          log: logs([['2026-08-22 09:02', '登録番号', 'T701000108148G', 'T7010001081486', '人工更正']]),
        },
      ],
    },
    {
      code: 'SUP-0013455',
      name: '日本通運株式会社',
      ind: '物流运输',
      invs: [
        {
          no: 'NX-771204', kind: '請求書', date: '2026-09-30', amt: '¥286,000', err: [0, 12], route: '合同',
          m: 'tol', ap: 'draft', ex: 'na', po: 'CT-2026-JP-031', grn: '运单 18 票',
          lines: lines([['海运附加费', '合同费率 × 18 票', '18 票', '¥286,000（+0.7%）', 'tol']]),
          log: [],
        },
      ],
    },
  ],
  DE: [
    {
      code: 'SUP-0021004',
      name: 'Werner Antriebstechnik GmbH',
      ind: '设备与模具',
      invs: [
        {
          no: 'RE-2026-44713', kind: 'ZUGFeRD', date: '2026-08-29', amt: '€12,480.00', err: [1, 13], route: 'PO',
          m: 'ok', ap: 'posted', ex: 'na', po: 'PO-4500126610', grn: 'GR-5000288',
          lines: lines([['Servomotor SM-40', '8 × 1,310.92', '8', '8 × 1,310.92', 'ok']]),
          log: logs([['2026-08-30 14:10', 'Leistungsdatum', '2026-08-28', '2026-08-29', 'XML 覆盖']]),
        },
        {
          no: 'RE-2026-45102', kind: 'ZUGFeRD', date: '2026-09-18', amt: '€24,960.00', err: [0, 13], route: 'PO',
          m: 'diff', ap: 'posted', ex: 'na', po: 'PO-4500128034', grn: 'GR-5000390',
          lines: lines([['Getriebe G-220', '12 × 1,980.00', '12', '12 × 2,080.00', 'diff']]),
          log: [],
        },
      ],
    },
    {
      code: 'SUP-0021310',
      name: 'Amazon Business EU S.à r.l.',
      ind: '差旅与行政',
      invs: [
        {
          no: 'DE-2026-4469771', kind: 'Rechnung', date: '2026-09-11', amt: '€482.30', err: [1, 9], route: '费控',
          m: 'na', ap: 'none', ex: 'wait', po: '—', grn: '—', lines: [], log: [],
        },
      ],
    },
  ],
  US: [
    {
      code: 'SUP-0030882',
      name: 'Blue Ridge Supply LLC',
      ind: '原材料',
      invs: [
        {
          no: 'BR-77120', kind: 'Invoice', date: '2026-09-15', amt: '$12,022.90', err: [3, 11], route: 'PO',
          m: 'diff', ap: 'draft', ex: 'na', po: 'PO-4500128871', grn: '—',
          lines: lines([
            ['Copper coil CC-6', '400 × 28.20', '0', '400 × 28.20', 'wait'],
            ['Sales tax', '—', '—', '742.90', 'tol'],
          ]),
          log: [],
        },
        {
          no: 'BR-77098', kind: 'Invoice', date: '2026-09-02', amt: '$12,022.90', err: [0, 11], route: 'PO',
          m: 'ok', ap: 'posted', ex: 'na', po: 'PO-4500128871', grn: 'GR-7000112',
          lines: lines([['Copper coil CC-6', '400 × 28.20', '400', '400 × 28.20', 'ok']]),
          log: [],
        },
      ],
    },
  ],
  MX: [
    {
      code: 'SUP-0042001',
      name: 'Aceros del Norte S.A. de C.V.',
      ind: '原材料',
      invs: [
        {
          no: 'UUID 6F1A…9C2E', kind: 'CFDI 4.0', date: '2026-09-11', amt: 'MX$86,420.00', err: [0, 15], route: 'PO',
          m: 'ok', ap: 'blocked', ex: 'na', po: 'PO-4500128002', grn: 'GR-8000045',
          lines: lines([['Lámina de acero', '12 t × 6,210.00', '12 t', '12 t × 6,210.00', 'ok']]),
          log: [],
        },
      ],
    },
  ],
};

export const ROUTE_RULES: RouteRule[] = [
  {
    when: '有 PO',
    to: '三单匹配 → AP 自动化',
    how: 'PO、收货、发票逐行比对；容差内自动生成 AP 单并过账，超差阻断并通知采购与供应商',
  },
  { when: '有框架合同', to: '两单匹配 → AP 自动化', how: '按合同费率或里程碑校验金额；物流、服务类常见' },
  { when: '无 PO · 员工承担', to: '费控自动化', how: '匹配报销单或费用申请，校验差旅标准与预算后进入审批' },
  {
    when: '识别或校验未通过',
    to: '数据修正队列',
    how: '在票夹内标注错误，修正后自动重新路由；已生成单据按补偿规则撤回重推',
  },
];

export function buildCountries(): WalletCountry[] {
  return COUNTRY_ORDER.map((code) => ({
    code,
    ...CTY[code],
    invoiceCount: SUPPLIERS[code].reduce((a, s) => a + s.invs.length, 0),
  }));
}
