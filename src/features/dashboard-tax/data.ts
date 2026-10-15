/** 税务统计看板 · 示例数据（与设计稿 TaxBoard.dc.html 一致） */
import { hs, rng } from '@/lib/sample';
import type {
  CountryCode,
  CountryTaxRow,
  DrillInvoice,
  TaxBoardData,
  TaxBoardQuery,
  TaxDrillQuery,
  TaxPeriod,
  TaxRisk,
  TaxScope,
  TaxStateId,
  TaxTypeSlice,
} from './types';

interface CountryDef {
  name: string;
  regime: string;
  entities: string;
  /** 进项税净额（CNY 万） */
  net: number;
  yoy: number;
  /** 逆向冲减（万） */
  rev: number;
  pendingCount: number;
  pendingAmount: number;
  filingPeriod: string;
  filing: number;
  riskCount: number;
  symbol: string;
  /** CNY → 本币 */
  scale: number;
}

const c = (
  name: string,
  regime: string,
  entities: string,
  net: number,
  yoy: number,
  rev: number,
  pendingCount: number,
  pendingAmount: number,
  filingPeriod: string,
  filing: number,
  riskCount: number,
  symbol: string,
  scale: number,
): CountryDef => ({ name, regime, entities, net, yoy, rev, pendingCount, pendingAmount, filingPeriod, filing, riskCount, symbol, scale });

export const COUNTRIES: Record<CountryCode, CountryDef> = {
  CN: c('中国大陆', '增值税', '3 个法人', 6840, 9.4, 312, 1208, 486, '2026-09 月报 · 10-15 截止', 92, 41, '¥', 1),
  JP: c('日本', '消費税', '1 个法人', 1120, 4.1, 38, 96, 61, '2026 年度 · 中間申告 11-30', 60, 12, '¥', 19.5),
  DE: c('德国', 'Umsatzsteuer', '4 个法人', 1960, 6.8, 146, 140, 88, 'USt-VA 2026-09 · 10-10 已报', 100, 9, '€', 0.12),
  US: c('美国', 'Sales & Use', '2 个法人', 0, 0, 0, 0, 0, 'Use tax Q3 · 10-20', 70, 14, '$', 0.14),
  BR: c('巴西', 'ICMS/IPI/PIS/COFINS', '1 个法人', 740, 12.2, 66, 184, 93, 'SPED 2026-09 · 10-20', 45, 23, 'R$', 0.78),
  IN: c('印度', 'GST', '1 个法人', 520, 15.6, 24, 212, 71, 'GSTR-3B 2026-09 · 10-20', 55, 31, '₹', 11.8),
  SA: c('沙特阿拉伯', 'VAT', '1 个法人', 310, 7.0, 12, 44, 19, '2026-Q3 · 10-31', 30, 6, 'SAR', 0.53),
  MX: c('墨西哥', 'IVA', '1 个法人', 460, 3.3, 29, 118, 52, '2026-09 · 10-17', 80, 17, 'MX$', 2.8),
};

export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];

/** 进项税处理阶段：标签、占毛额比例 */
export const TAX_STATES: Array<{ id: TaxStateId; label: string; share: number }> = [
  { id: 'capture', label: '待采集/待识别', share: 0.06 },
  { id: 'pending', label: '待认证 / 待 2B 匹配', share: 0.11 },
  { id: 'creditable', label: '已认证可抵扣', share: 0.58 },
  { id: 'filed', label: '已申报', share: 0.17 },
  { id: 'nonCreditable', label: '不可抵扣 / 转出', share: 0.05 },
  { id: 'reversed', label: '逆向冲减', share: 0.03 },
];

const RISKS: TaxRisk[] = [
  { name: '超期未认证', sub: '中国大陆 · 数电票 360 日内须确认用途', count: 126, amount: 38.2, action: '推送税务岗，Agent 已排入本期认证清单' },
  { name: '供应商税号失效 / 走逃失联', sub: '取得后被税局列为异常凭证', count: 7, amount: 21.4, action: '进项转出，通知采购冻结供应商' },
  { name: '非適格 / 不合规凭证', sub: '日本非適格 · 德国 §14 要素缺失', count: 58, amount: 9.6, action: '仅部分控除或不得抵扣，请供应商重开' },
  { name: '付款超 180 天（印度 ITC 反转）', sub: 'GSTR-3B 反转并加息', count: 19, amount: 6.1, action: '催付或反转' },
  { name: '红字 / Credit note 未关联原票', sub: '逆向单据孤立', count: 11, amount: 4.8, action: '人工关联后重算净额' },
  { name: 'CFDI 已取消但已入账', sub: '墨西哥 SAT 状态变化', count: 3, amount: 2.2, action: '冲销凭证，进项转出' },
];

const d = (no: string, country: string, supplier: string, tax: string, amount: string, period: string, reason: string): DrillInvoice => ({
  no,
  country,
  supplier,
  tax,
  amount,
  period,
  reason,
});

/** 下钻示例发票（按阶段）；没有专门样例的阶段沿用「待认证」样例 */
const DRILL: Partial<Record<TaxStateId, DrillInvoice[]>> = {
  pending: [
    d('26372000000019310', '中国大陆 · CN-SH-01', '江苏恒立液压', '增值税 13%', '¥6,787.61', '2026-10', '票池用途确认未完成'),
    d('TK-2609-0031', '日本 · JP-TYO-01', '株式会社宝田機械', '消費税 10%', '¥90,200', '2026 中間', 'AP 单审核中，未入账'),
    d('NF-e 000.951', '巴西 · BR-SP-01', 'Metalúrgica São Bento', 'ICMS 18%', 'R$ 13,266.00', '2026-09', 'SEFAZ 授权查询排队'),
    d('IN-GST-2609-0442', '印度 · IN-MH-01', 'Bharat Precision Pvt', 'CGST+SGST 18%', '₹ 1,48,200', '2026-09', 'GSTR-2B 尚未出现'),
  ],
  nonCreditable: [
    d('DE-2026-4469771', '德国 · DE-MUC-01', 'Amazon Business EU', 'USt 19%', '€77.00', '2026-09', '员工福利用途，不得抵扣'),
    d('26312000000431902', '中国大陆 · CN-SH-01', '上海虹桥商务酒店', '增值税 6%', '¥103.92', '2026-09', '差旅住宿可抵扣；餐饮部分转出'),
    d('BR-77098', '美国 · US-ATL-01', 'Blue Ridge Supply', 'Sales tax 7%', '$742.90', '—', '无进项抵扣，计入成本'),
  ],
  reversed: [
    d('26372000000021107', '中国大陆 · CN-SH-01', '江苏恒立液压（红字）', '增值税 13%', '−¥1,176.99', '2026-10', '退货 2 件，红字确认单 HZ-2610-0033'),
    d('GS-2026-0117', '德国 · DE-MUC-01', 'Werner Antriebstechnik（Gutschrift）', 'USt 19%', '−€191.60', '2026-10', '单价差额，抵扣下次付款'),
  ],
};

type TaxDef = [name: string, sub: string, share: number, creditable: number, nonCreditable: number, withheld: number];

function taxTypeDefs(scope: TaxScope): TaxDef[] {
  switch (scope) {
    case 'GLOBAL':
      return [
        ['增值税 / VAT / GST', '中国 · 欧盟 · 印度 · 沙特 · 墨西哥', 0.72, 0.93, 0.07, 0],
        ['消費税', '日本', 0.11, 0.96, 0.04, 0],
        ['ICMS / IPI / PIS / COFINS', '巴西', 0.08, 0.9, 0.1, 0],
        ['Sales & Use tax', '美国 · 加拿大 PST', 0.05, 0, 1, 0],
        ['预提 / 代扣', '跨境服务 · 印度 TDS · 巴西 IRRF', 0.04, 0, 0, 1],
      ];
    case 'BR':
      return [
        ['ICMS', '州', 0.55, 0.95, 0.05, 0],
        ['IPI', '联邦', 0.15, 0.9, 0.1, 0],
        ['PIS / COFINS', '联邦', 0.25, 1, 0, 0],
        ['IRRF / CSRF 代扣', '服务', 0.05, 0, 0, 1],
      ];
    case 'US':
      return [
        ['State sales tax', '州', 0.55, 0, 1, 0],
        ['Local sales tax', '县 / 市', 0.4, 0, 1, 0],
        ['非居民预提', '30% 或协定', 0.05, 0, 0, 1],
      ];
    case 'IN':
      return [
        ['CGST + SGST', '州内', 0.6, 0.95, 0.05, 0],
        ['IGST', '跨州 / 进口', 0.3, 0.95, 0.05, 0],
        ['TDS', '服务', 0.1, 0, 0, 1],
      ];
    case 'MX':
      return [
        ['IVA 16%', '联邦', 0.85, 0.92, 0.08, 0],
        ['IVA / ISR retenido', '代扣', 0.15, 0, 0, 1],
      ];
    default:
      return [
        [COUNTRIES[scope].regime, '主税种', 0.9, 0.93, 0.07, 0],
        ['代扣代缴', '跨境服务', 0.1, 0, 0, 1],
      ];
  }
}

export const TREND_MONTHS = ['10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月'];

export function periodMultiplier(period: TaxPeriod): number {
  return period === '2026-09' ? 1 : period === '2026-Q3' ? 3 : 9;
}

export function buildTaxBoard(q: TaxBoardQuery): TaxBoardData {
  const keys: CountryCode[] = q.scope === 'GLOBAL' ? COUNTRY_CODES : [q.scope];
  const defs = keys.map((k) => COUNTRIES[k]);
  const sum = (f: (x: CountryDef) => number) => defs.reduce((a, x) => a + f(x), 0);
  const mult = periodMultiplier(q.period);

  const baseNet = sum((x) => x.net);
  const net = baseNet * mult;
  const rev = sum((x) => x.rev) * mult;
  const pendingAmount = sum((x) => x.pendingAmount);
  const pendingCount = sum((x) => x.pendingCount);
  const riskCount = sum((x) => x.riskCount);
  const yoy = defs.reduce((a, x) => a + x.yoy * x.net, 0) / Math.max(1, baseNet);
  const gross = net + rev;

  const states = TAX_STATES.map((s) => ({
    id: s.id,
    label: s.label,
    share: s.share,
    amount: gross * s.share,
    count: Math.round(pendingCount * 4 * s.share),
  }));

  const byTax: TaxTypeSlice[] = taxTypeDefs(q.scope).map(([name, sub, share, creditable, nonCreditable, withheld]) => ({
    name,
    sub,
    amount: gross * share,
    creditable,
    nonCreditable,
    withheld,
  }));

  const countries: CountryTaxRow[] = keys.map((code) => {
    const x = COUNTRIES[code];
    return {
      code,
      name: x.name,
      regime: x.regime,
      entities: x.entities,
      net: x.net * mult,
      yoy: x.yoy,
      rev: x.rev * mult,
      pendingCount: x.pendingCount,
      pendingAmount: x.pendingAmount,
      filingPeriod: x.filingPeriod,
      filing: x.filing,
      riskCount: x.riskCount,
    };
  });

  // 月度趋势（确定性随机；调用顺序与设计稿一致）
  const r = rng(hs(q.scope + 'trend'));
  const current = TREND_MONTHS.map((_m, i) => baseNet * (0.78 + 0.3 * r()) * (1 + i * 0.012));
  const lastYear = current.map((v) => (v / (1 + yoy / 100)) * (0.95 + 0.1 * r()));
  const reversed = current.map((v) => v * (0.02 + 0.04 * r()));

  const local = q.scope === 'GLOBAL' ? null : COUNTRIES[q.scope];

  return {
    scope: q.scope,
    period: q.period,
    scopeName: q.scope === 'GLOBAL' ? '全球' : COUNTRIES[q.scope].name,
    currency: local ? { symbol: local.symbol, scale: local.scale } : null,
    totals: { gross, net, rev, pendingAmount, pendingCount, riskCount, yoy },
    states,
    byTax,
    countries,
    trend: { months: TREND_MONTHS, current, lastYear, reversed },
    risks: RISKS,
  };
}

export function buildTaxDrill(q: TaxDrillQuery): DrillInvoice[] {
  return DRILL[q.state] ?? DRILL.pending ?? [];
}
