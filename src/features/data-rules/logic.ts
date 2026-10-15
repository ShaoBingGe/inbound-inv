/** 纯计算：分布均衡指标、样本来源构成、Agent 运行日志（与设计稿算法一致） */
import type { AgentKey, CountryProfile, Distribution } from './types';

export const BIN_COUNT = 14;
export const binCenter = (i: number) => 0.25 + i * 0.5;

/** 按回流上限 cap（%）计算金额分布与目标正态的偏离 */
export function computeDistribution(c: CountryProfile, cap: number): Distribution {
  const flood = Math.min(c.flood, cap / 100);
  const tgt: number[] = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    const x = binCenter(i);
    tgt.push(Math.exp(-Math.pow(x - c.mu, 2) / (2 * c.sigma * c.sigma)));
  }
  const ts = tgt.reduce((a, b) => a + b, 0);
  const bins: number[] = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    const x = binCenter(i);
    const fl = Math.exp(-Math.pow(x - c.floodCenter, 2) / (2 * 0.18));
    bins.push((tgt[i] / ts) * (1 - flood) + fl * flood);
  }
  const fs = bins.reduce((a, b) => a + b, 0) || 1;
  const actual = bins.map((b) => b / fs);
  const expected = tgt.map((t) => t / ts);
  let psi = 0;
  actual.forEach((v, i) => {
    const aa = Math.max(v, 1e-4);
    const ee = Math.max(expected[i], 1e-4);
    psi += (aa - ee) * Math.log(aa / ee);
  });
  let mean = 0;
  actual.forEach((v, i) => (mean += v * binCenter(i)));
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  actual.forEach((v, i) => {
    const d = binCenter(i) - mean;
    m2 += v * d * d;
    m3 += v * d * d * d;
    m4 += v * d * d * d * d;
  });
  let ks = 0;
  let ca = 0;
  let ce = 0;
  actual.forEach((v, i) => {
    ca += v;
    ce += expected[i];
    ks = Math.max(ks, Math.abs(ca - ce));
  });
  return { actual, expected, psi, skew: m3 / Math.pow(m2, 1.5), kurt: m4 / (m2 * m2) - 3, ks };
}

export type MixKind = 'flood' | 'random' | 'template' | 'synthetic';
export interface MixPart {
  kind: MixKind;
  label: string;
  pct: number;
}

/** 样本来源构成（%） */
export function sourceMix(c: CountryProfile, cap: number): MixPart[] {
  const flood = Math.min(c.flood, cap / 100);
  const a = Math.round(flood * 100);
  const b = Math.round((1 - flood) * 0.7 * 100);
  const d = Math.round((1 - flood) * 0.2 * 100);
  return [
    { kind: 'flood', label: '高频修正回流', pct: a },
    { kind: 'random', label: '随机分层抽样', pct: b },
    { kind: 'template', label: '新模板样本', pct: d },
    { kind: 'synthetic', label: '合成增强', pct: 100 - a - b - d },
  ];
}

/** Agent 最近运行日志（中文原文，页面用 t() 翻译） */
export function agentLog(
  agent: AgentKey,
  c: CountryProfile,
  ctx: { cap: number; psi: number; gated: boolean },
): string[] {
  switch (agent) {
    case 'collect':
      return [
        '10:42:06  监听 invoice_field_change：' + c.name + ' 新增 38 条更正',
        '10:42:07  命中触发条件「字段误差率超阈值」→ 生成候选 212 张',
        '10:42:09  写入回流样本池 ' + c.code + '-pool（待回流 ' + c.pend + '）',
      ];
    case 'clean':
      return [
        '10:43:15  感知哈希去重：212 → 187',
        '10:43:21  遮盖个人信息 96 处、银行账号 41 处（' + c.dc + ' 内执行，不出境）',
        '10:43:24  剔除清晰度 < 0.55 的影像 9 张',
      ];
    case 'prelabel':
      return [
        '10:44:02  以 ' + c.model + ' 预标注 178 张',
        '10:44:40  用更正真值覆盖预标注字段 401 个',
        '10:44:41  置信度 < 0.6 的框 63 个标记为人工复核',
      ];
    case 'qa':
      return [
        '10:46:10  格式检查：发现 27 处问题（见下方）',
        '10:46:12  影像文本复读不一致 11 处',
        '10:46:30  双人一致性 κ = 0.91（阈值 0.85）',
        ctx.gated ? '10:51:02  人工抽检 50 张通过 · 操作人 佐藤 健' : '等待人工抽检 50 张',
      ];
    case 'balance':
      return [
        '10:47:00  分层：票种 × 金额区间 × 影像质量 × 渠道',
        '10:47:01  回流占比上限 ' + ctx.cap + '%，单供应商 ≤ 3%',
        '10:47:03  均衡后 PSI ' + ctx.psi.toFixed(3),
      ];
    case 'eval':
      return ['09:12:40  RUN-3318 冻结测试集 字段准确率 97.4%', '09:20:11  RUN-3317 困难集 字段准确率 91.8%（+6.1pp）'];
    case 'gate':
      return [
        '09:25:00  日本：各项指标不退化 → 可发布',
        '09:25:00  美国：冻结测试集 −0.4pp → 阻断，需补样本',
        ctx.gated ? '10:52:10  已批准 v4.2-rc1 在日本灰度 10%' : '等待审批：v4.2-rc1 日本灰度 10%',
      ];
  }
}

/** PSI 等级 */
export function psiLevel(psi: number): 'ok' | 'warn' | 'bad' {
  return psi < 0.1 ? 'ok' : psi < 0.25 ? 'warn' : 'bad';
}
