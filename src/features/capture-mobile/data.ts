import type { CaptureIssue, CaptureSession, RecentCapture, RecognitionStep, RecognizedField } from './types';

/** 文案均为简体中文原文，显示时经 t() 翻译；票面原文与主数据保持原样 */

export const ISSUES: CaptureIssue[] = [
  {
    k: 'regno',
    tag: '可自动纠正',
    tone: 'blue',
    label: '登録番号',
    msg: '字母 O 应为数字 0；已在公表サイト校验通过',
    from: 'T7010001O81486',
    to: 'T7010001081486',
    btn: '采纳纠正',
  },
  {
    k: 'rate',
    tag: '不通过',
    tone: 'red',
    label: '税率区分与消費税額',
    msg: '机械设备不适用 8% 軽減税率，按 10% 计算税额应为 ¥90,200',
    from: '8% · ¥72,160',
    to: '10% · ¥90,200',
    btn: '按 10% 更正',
  },
  {
    k: 'po',
    tag: '需确认',
    tone: 'orange',
    label: 'PO 番号',
    msg: '页脚疑似 PO 号，置信度 46%',
    editable: true,
    def: 'PO-4500127730',
    btn: '确认',
  },
];

export const RECENT: RecentCapture[] = [
  { seller: '上海虹桥商务酒店有限公司', meta: '中国大陆 · 数电普票', amt: '¥1,836.00', st: '通过', tone: 'green' },
  { seller: 'Werner Antriebstechnik GmbH', meta: '德国 · 已纠正 1 处', amt: '€12,480.00', st: '通过', tone: 'green' },
];

export const STEPS: RecognitionStep[] = (
  [
    ['影像质量', '清晰度 0.88 · 已纠偏 3°'],
    ['发生地判定', '日本（登録番号前缀 T、日文、JPY）'],
    ['识别', '14 个字段 · 用时 4.6 秒'],
    ['重复检测', '未发现重复'],
    ['税号在线校验', '登録番号公表サイト'],
    ['规则校验', '12 项，发现 3 项问题'],
  ] as const
).map(([label, sub], i) => ({ label, sub, ok: i < 5 }));

export const FIELDS: RecognizedField[] = [
  { label: '発行日', value: '2026-09-03', conf: 0.98 },
  { label: '請求書番号', value: 'TK-2609-0031', conf: 0.95 },
  { label: '登録番号', value: 'T7010001O81486', conf: 0.62, fixKey: 'regno', fixedValue: 'T7010001081486' },
  { label: '税率区分', value: '8%（軽減）', conf: 0.55, fixKey: 'rate', fixedValue: '10%' },
  { label: '消費税額', value: '¥72,160', conf: 0.58, fixKey: 'rate', fixedValue: '¥90,200' },
  { label: '合計金額', value: '¥992,200', conf: 0.97 },
  { label: 'PO 番号', value: '—', conf: 0.46, fixKey: 'po' },
];

export function buildSession(): CaptureSession {
  return {
    claimLabel: '报销单 EXP-2026-0814 · 上海分公司',
    camHint: '票据略有倾斜，系统将自动纠偏',
    recent: RECENT,
    steps: STEPS,
    invoice: {
      id: 'TK-2609-0031',
      country: '日本 · 自动判定',
      docType: '適格請求書',
      seller: '株式会社宝田機械',
      amount: '¥ 992,200',
      converted: '≈ CNY 50,800.64',
      fxNote: '汇率 0.0512 · 2026-09-03 记账汇率',
    },
    issues: ISSUES,
    fields: FIELDS,
    poInitial: 'PO-45001277B0',
  };
}
