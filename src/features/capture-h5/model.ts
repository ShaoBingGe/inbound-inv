import type { LangCode } from '@/i18n';
import { CJK, LANG_OF, LANGS, fill, mobileText, msgText, qrText, uiText, type MsgKey, type UiText } from './i18n';
import type {
  CaptureSession,
  CheckDef,
  CheckKey,
  CheckState,
  CorrectionLog,
  CountryMeta,
  DemoDoc,
  FieldDef,
  FieldKey,
  FixField,
  FixValue,
  GeoCode,
  InvoiceFlag,
  InvoiceRow,
  Localized,
  QrStage,
} from './types';

/*
 * 视图模型：设计稿原型 Component 的计算逻辑（renderVals / buildRow / pickerModel / qrModel / phoneModel）。
 * 纯函数，不含事件处理；内置词典之外的中文文案在这里经全局 t() 翻译。
 */

export type Translate = (s: string) => string;

export const FIELD_COUNT = 8;
export const FIELD_NAME: Record<FixField, string> = { tax: '税额', sellerTax: '登録番号', amt: '金额' };
export const CK_LABEL: Record<CheckKey, string> = {
  img: '影像质量',
  geo: '发生地判定',
  dup: '重复检测',
  auth: '税局查验',
  tid: '税号校验',
  sum: '金额勾稽',
  cur: '币种与小数位',
  buyer: '购方抬头',
  req: '必备字段',
};
export const CK_STYLE: Record<CheckState, { icon: string; res: string }> = {
  pass: { icon: '✓', res: '通过' },
  fix: { icon: '↻', res: '可纠正' },
  fixed: { icon: '✓', res: '已纠正' },
  warn: { icon: '!', res: '提示' },
  fail: { icon: '×', res: '不通过' },
  lock: { icon: '锁', res: '税局为准' },
};
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
/** 显示值中属于界面文案（需翻译）的占位 */
const UI_VALUES = new Set(['待填写', '待人工更正']);

/** 页面运行时状态（与原型 state 一致） */
export interface CaptureState {
  fixed: Record<string, boolean>;
  marks: Record<string, boolean>;
  log: CorrectionLog[];
  sel: GeoCode;
  active: GeoCode[];
  rows: InvoiceRow[];
  checked: number[];
  edit: number | null;
  qr: QrStage | null;
  shots: number;
  taxOk: boolean;
  picker: boolean;
  pickTarget: number | null;
  q: string;
  letter: string;
  /** 简体中文原文，显示时经 t() */
  toast: string;
}

export function initialState(s: CaptureSession): CaptureState {
  return {
    fixed: {},
    marks: {},
    log: s.log.map((l) => ({ ...l })),
    sel: s.sel,
    active: [...s.active],
    rows: s.rows.map((r) => ({ ...r, missing: [...r.missing] })),
    checked: [...s.checked],
    edit: null,
    qr: null,
    shots: 0,
    taxOk: false,
    picker: false,
    pickTarget: null,
    q: '',
    letter: '',
    toast: '',
  };
}

/* ---------- 视图类型 ---------- */

export interface RailItem {
  code: GeoCode;
  name: string;
  count: string;
  money: string;
  tax: string;
  note: string;
  needs: string;
  on: boolean;
}
export type GroupKind = 'todo' | 'check' | 'ready' | 'blocked';
export type ChipTone = 'missing' | 'flag' | 'matched' | 'unmatched' | 'ok';
export interface ChipView {
  label: string;
  tone: ChipTone;
}
export interface CheckLineView {
  icon: string;
  st: CheckState;
  text: string;
}
export interface RowView {
  id: number;
  kind: string;
  seller: string;
  sellerMissing: boolean;
  no: string;
  date: string;
  orig: string;
  conv: string;
  chips: ChipView[];
  checkLine: CheckLineView[];
  attach: string;
  hasAttach: boolean;
  checked: boolean;
  assign: { code: GeoCode; name: string }[] | null;
}
export interface GroupView {
  kind: GroupKind;
  title: string;
  note: string;
  summary: string;
  rows: RowView[];
}
export interface FieldView {
  key: FieldKey;
  /** 原文（日志与提示用） */
  rawLabel: string;
  label: string;
  /** 票面原值；missing 时为空 */
  value: string;
  /** 写入修正记录的“修正前”值 */
  logValue: string;
  missing: boolean;
  marked: boolean;
  locked: boolean;
  hint: string;
  hintAlert: boolean;
  src: string;
  srcManual: boolean;
  markLabel: string;
  markTitle: string;
}
export interface CheckView {
  key: CheckKey;
  st: CheckState;
  icon: string;
  res: string;
  label: string;
  msg: string;
  hasFix: boolean;
  canFix: boolean;
  done: boolean;
  from: string;
  to: string;
  def: ResolvedCheck;
}
export interface LogView {
  at: string;
  field: string;
  before: string;
  after: string;
  src: string;
  /** before / after 是否为界面占位（需翻译） */
  beforeUi: boolean;
  afterUi: boolean;
}
export interface EditView {
  id: number;
  title: string;
  crumb: string;
  country: string;
  currency: string;
  taxLine: string;
  lockNote: string;
  orig: string;
  rate: string;
  rateNote: string;
  convLabel: string;
  conv: string;
  fields: FieldView[];
  checks: CheckView[];
  errRate: string;
  errHigh: boolean;
  lockLine: string;
  log: LogView[];
  attachments: { name: string; size: string }[];
  imageNote: string;
  statusLine: string;
  statusTone: 'alert' | 'accent' | 'muted';
  saveLabel: string;
}
export interface PickerIndexItem {
  key: string;
  ch: string;
  all: boolean;
  on: boolean;
  has: boolean;
}
export interface PickerView {
  q: string;
  hasQ: boolean;
  showIndex: boolean;
  index: PickerIndexItem[];
  groups: { letter: string; rows: { code: GeoCode; name: string; currency: string; tax: string }[] }[];
  empty: boolean;
  foot: string;
}
export type StepState = 'done' | 'current' | 'todo';
export interface QrView {
  title: string;
  sub: string;
  chrome: string;
  expire: string;
  foot: string;
  seed: number;
  scanned: boolean;
  statusLabel: string;
  geoLabel: string;
  geoValue: string;
  localeLabel: string;
  localeValue: string;
  apiLabel: string;
  apiValue: string;
  steps: { n: string; label: string; state: StepState }[];
  advanceLabel: string;
}
export interface PhoneView {
  caption: string;
  footNote: string;
  locale: string;
  dark: boolean;
  stage: QrStage;
  idleTitle: string;
  idleBody: string;
  geoName: string;
  currency: string;
  ruleNote: string;
  camHint: string;
  /** 快门按钮的无障碍名称（电脑侧文案：模拟拍摄） */
  shutterLabel: string;
  shotLine: string;
  resultTitle: string;
  apiLine: string;
  seller: string;
  docLine: string;
  fAmount: string;
  amount: string;
  fTax: string;
  tax: string;
  taxAsk: string;
  resultNote: string;
  retake: string;
  use: string;
  sentTitle: string;
  sentBody: string;
  again: string;
}
export interface HeadView {
  title: string;
  meta: string;
  count: string;
  errLine: string;
  errHigh: boolean;
}
export interface FooterView {
  selectedLabel: string;
  selLine: string;
  totalLabel: string;
  selTotal: string;
  selBreakdown: string;
  blockedNote: string;
  importLabel: string;
  cancel: string;
}

/** 校验项 + 运行时状态 */
export interface ResolvedCheck {
  key: CheckKey;
  st: CheckState;
  label: string;
  msg: string;
  field?: FixField;
  from?: FixValue;
  to?: FixValue;
}

/* ---------- 模型 ---------- */

export class CaptureModel {
  readonly T: UiText;
  readonly local: GeoCode;

  constructor(
    readonly session: CaptureSession,
    readonly st: CaptureState,
    readonly lang: LangCode,
    readonly t: Translate,
  ) {
    this.T = uiText(lang);
    this.local = session.localCountry || 'CN';
  }

  get cjk(): boolean {
    return !!CJK[this.lang];
  }

  meta(code: GeoCode): CountryMeta {
    return code === 'UNK' ? this.session.unknown : (this.session.pool[code] ?? this.session.unknown);
  }
  nameOf(code: GeoCode): string {
    const m = this.meta(code);
    const l = this.lang;
    if (l === 'zh' || l === 'zh-TW' || l === 'ja') return m.zh;
    if (l === 'es') return m.es || m.en;
    if (l === 'ar') return m.ar || m.en;
    return m.en;
  }
  textOf(o: Localized | undefined): string {
    if (!o) return '';
    const l = this.lang;
    return l === 'zh' || l === 'zh-TW' ? o.zh : o.en || o.zh;
  }
  taxOf(m: CountryMeta): string {
    return typeof m.tax === 'string' ? m.tax : this.textOf(m.tax);
  }
  msg(k: MsgKey, a?: string): string {
    const s = msgText(this.lang, k);
    return a === undefined ? s : fill(s, 'a', a);
  }
  flagText(f: InvoiceFlag | null): string {
    return f ? this.msg(f.k, f.a) : '';
  }
  fmt(n: number | null | undefined, dp: number): string {
    if (n === null || n === undefined) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  dp(cur: string): number {
    return cur === 'JPY' || cur === 'KRW' || cur === 'VND' || cur === 'IDR' ? 0 : 2;
  }
  conv(r: InvoiceRow): number {
    return (r.amt * this.meta(r.c).cny) / this.meta(this.local).cny;
  }
  count(n: number): string {
    return this.cjk ? n + (this.lang === 'ja' ? ' 件' : ' 张') : String(n);
  }

  /* ---- 校验与纠正 ---- */
  checksOf(r: InvoiceRow): ResolvedCheck[] {
    return (this.session.checks[r.id] ?? []).map((c: CheckDef) => {
      const done = !!this.st.fixed[r.id + ':' + c.key];
      return { key: c.key, st: done ? 'fixed' : c.st, label: CK_LABEL[c.key], msg: c.msg, field: c.field, from: c.from, to: c.to };
    });
  }
  pendingFix(r: InvoiceRow): boolean {
    return this.checksOf(r).some((c) => c.st === 'fix');
  }
  needsWork(r: InvoiceRow): boolean {
    return r.missing.length > 0 || !!r.flag || this.pendingFix(r);
  }
  markCount(r: InvoiceRow): number {
    return Object.keys(this.st.marks).filter((k) => k.indexOf(r.id + ':') === 0 && this.st.marks[k]).length;
  }
  errCount(r: InvoiceRow): number {
    return (this.session.checks[r.id] ?? []).filter((c) => c.st === 'fix' || c.st === 'lock').length + this.markCount(r);
  }
  showVal(r: InvoiceRow, v: FixValue | undefined): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'number') {
      const m = this.meta(r.c);
      return m.currency + ' ' + this.fmt(v, this.dp(m.currency));
    }
    return String(v);
  }

  /* ---- 手机拍票会话 ---- */
  phoneLang(): LangCode {
    return LANG_OF[this.st.sel] ?? 'en';
  }
  apiOf(code: GeoCode): { id: string; locale: string } {
    const m = this.meta(code);
    return {
      id: 'ocr-' + String(code).toLowerCase() + (m.tier === 'none' ? '-manual' : m.tier === 'full' ? '-v4' : '-v3'),
      locale: (LANG_OF[code] ?? 'en') + '-' + code,
    };
  }
  demoOf(code: GeoCode): DemoDoc {
    return this.session.demo[code] ?? { seller: 'Local Merchant Ltd.', kind: 'Receipt', amt: 100, tax: null, askTax: true };
  }
  phoneLangName(): string {
    const k = this.phoneLang();
    const hit = LANGS.find((l) => l.k === k);
    return hit ? hit.native : 'English';
  }

  /* ---------- 视图 ---------- */

  head(): HeadView {
    const { rows, active, fixed } = this.st;
    const lm = this.meta(this.local);
    const errTotal = rows.reduce((a, r) => a + this.errCount(r), 0);
    const errPct = (errTotal / (rows.length * FIELD_COUNT)) * 100;
    const fixedN = Object.keys(fixed).length;
    return {
      title: this.T.title,
      meta: this.session.reportNo + ' · ' + (this.session.entities[this.local] ?? this.session.entities.CN) + ' · ' + lm.currency,
      count: this.count(rows.length) + ' · ' + active.length + this.T.geos,
      errLine: this.t('字段识别误差 ' + errPct.toFixed(1) + '%' + (fixedN ? ' · 已纠正 ' + fixedN + ' 处' : '')),
      errHigh: errPct >= 5,
    };
  }

  rail(): RailItem[] {
    const T = this.T;
    const lm = this.meta(this.local);
    return this.st.active
      .slice()
      .sort((x, y) => (x === this.local ? -1 : y === this.local ? 1 : 0))
      .map((code) => {
        const m = this.meta(code);
        const list = this.st.rows.filter((r) => r.c === code);
        const bad = list.filter((r) => this.needsWork(r)).length;
        return {
          code,
          name: this.nameOf(code),
          count: list.length ? this.count(list.length) : '—',
          money:
            code === this.local
              ? m.currency + ' · ' + T.local
              : m.currency + ' · ' + T.rate + ' ' + this.fmt(m.cny / lm.cny, 4),
          tax: this.taxOf(m),
          note: this.textOf(m.note),
          needs: bad ? (this.cjk ? bad + ' ' + T.pendingN : bad + T.pendingN) : '',
          on: code === this.st.sel,
        };
      });
  }

  unk(): { show: boolean; count: string; on: boolean } {
    const n = this.st.rows.filter((r) => r.c === 'UNK').length;
    return { show: n > 0, count: this.count(n), on: this.st.sel === 'UNK' };
  }

  current(): { code: GeoCode; name: string; rateLine: string; emptyHint: string; emptyTitle: string; showCapture: boolean; can: { tax: boolean; scan: boolean; mail: boolean } } {
    const T = this.T;
    const sel = this.st.sel;
    const cur = this.meta(sel);
    const lm = this.meta(this.local);
    const d = this.session.detail[sel];
    return {
      code: sel,
      name: this.nameOf(sel),
      rateLine:
        sel === 'UNK'
          ? ''
          : sel === this.local
            ? T.localRate
            : T.rate + ' ' + this.fmt(cur.cny / lm.cny, 4) + ' · 2026-08-22 · ' + T.locked,
      emptyHint: d?.emptyHint ? this.t(d.emptyHint) : this.textOf(cur.note),
      emptyTitle: fill(T.emptyIn, 'c', this.nameOf(sel)),
      showCapture: sel !== 'UNK',
      can: { tax: sel === 'CN', scan: sel === 'CN', mail: sel !== 'CN' && sel !== 'UNK' },
    };
  }

  private chipsFor(r: InvoiceRow): ChipView[] {
    const out: ChipView[] = [];
    r.missing.forEach((k) => out.push({ label: this.msg(k), tone: 'missing' }));
    if (r.flag) out.push({ label: this.flagText(r.flag), tone: 'flag' });
    if (r.c !== 'UNK') {
      const matched = this.session.matched[r.id];
      out.push(
        matched
          ? { label: this.msg('matched', this.t(matched)), tone: 'matched' }
          : { label: this.msg('unmatched'), tone: 'unmatched' },
      );
    }
    if (!out.length) out.push({ label: r.verify ? this.msg(r.verify) : this.msg('complete'), tone: 'ok' });
    return out;
  }

  private buildRow(r: InvoiceRow): RowView {
    const t = this.t;
    const m = this.meta(r.c);
    const lm = this.meta(this.local);
    const showConv = this.session.showConversion !== false && r.c !== this.local && r.c !== 'UNK';
    const on = this.st.checked.includes(r.id);
    const cks = this.checksOf(r);
    const checkLine: CheckLineView[] = cks
      .filter((c) => c.st !== 'pass')
      .map((c) => ({ icon: t(CK_STYLE[c.st].icon), st: c.st, text: t(c.label) + ' ' + t(CK_STYLE[c.st].res) }));
    const ok = cks.filter((c) => c.st === 'pass').map((c) => t(c.label));
    if (ok.length) checkLine.push({ icon: '✓', st: 'pass', text: ok.join(' · ') + ' ' + t('通过') });
    return {
      id: r.id,
      kind: r.kind ? t(r.kind) : '—',
      seller: r.seller || t('（未填写销方）'),
      sellerMissing: !r.seller,
      no: r.no || '—',
      date: r.date || '—',
      orig: r.c === 'UNK' ? '—' : m.currency + ' ' + this.fmt(r.amt, this.dp(m.currency)),
      conv: showConv ? '≈ ' + lm.currency + ' ' + this.fmt(this.conv(r), 2) : '',
      chips: this.chipsFor(r),
      checkLine,
      attach: String(r.attach),
      hasAttach: r.attach > 0,
      checked: on,
      assign:
        r.c === 'UNK'
          ? this.st.active
              .concat(['KR', 'NL'])
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((code) => ({ code, name: this.nameOf(code) }))
          : null,
    };
  }

  groups(): GroupView[] {
    const T = this.T;
    const sel = this.st.sel;
    const cur = this.meta(sel);
    if (sel === 'UNK') {
      const unkRows = this.st.rows.filter((r) => r.c === 'UNK');
      return unkRows.length
        ? [{ kind: 'blocked', title: T.gBlocked, note: T.nBlocked, summary: this.count(unkRows.length), rows: unkRows.map((r) => this.buildRow(r)) }]
        : [];
    }
    const rows = this.st.rows.filter((r) => r.c === sel);
    const gDef: { kind: GroupKind; title: string; note: string; test: (r: InvoiceRow) => boolean }[] = [
      { kind: 'todo', title: T.gTodo, note: T.nTodo, test: (r) => (r.missing.length > 0 || this.pendingFix(r)) && !r.flag },
      { kind: 'check', title: T.gCheck, note: T.nCheck, test: (r) => !!r.flag },
      { kind: 'ready', title: T.gReady, note: T.nReady, test: (r) => !r.missing.length && !r.flag && !this.pendingFix(r) },
    ];
    const out: GroupView[] = [];
    for (const g of gDef) {
      const rs = rows.filter(g.test);
      if (!rs.length) continue;
      const sum = rs.reduce((a, r) => a + r.amt, 0);
      out.push({
        kind: g.kind,
        title: g.title,
        note: g.note,
        summary: this.count(rs.length) + ' · ' + cur.currency + ' ' + this.fmt(sum, this.dp(cur.currency)),
        rows: rs.map((r) => this.buildRow(r)),
      });
    }
    return out;
  }

  isEmpty(): boolean {
    return !this.st.rows.some((r) => r.c === this.st.sel);
  }

  footer(): FooterView {
    const T = this.T;
    const lm = this.meta(this.local);
    const { rows, checked } = this.st;
    const chk = rows.filter((r) => checked.includes(r.id));
    const byC: Record<string, number> = {};
    chk.forEach((r) => {
      byC[r.c] = (byC[r.c] || 0) + this.conv(r);
    });
    const blockedAll = rows.filter((r) => this.needsWork(r)).length;
    const blockedChk = chk.filter((r) => this.needsWork(r)).length;
    return {
      selectedLabel: T.selected,
      selLine: chk.length + ' / ' + rows.length,
      totalLabel: fill(T.totalIn, 'c', lm.currency),
      selTotal: this.fmt(
        chk.reduce((a, r) => a + this.conv(r), 0),
        2,
      ),
      selBreakdown:
        Object.keys(byC)
          .map((k) => this.nameOf(k) + ' ' + this.fmt(byC[k], 2))
          .join(' ｜ ') || '—',
      blockedNote: blockedChk
        ? fill(T.blockedSelected, 'n', blockedChk)
        : blockedAll
          ? fill(T.blockedUnselected, 'n', blockedAll)
          : '',
      importLabel: chk.length ? fill(T.importN, 'n', chk.length) : T.importAll,
      cancel: T.cancel,
    };
  }

  checkedIds(): number[] {
    return this.st.rows.filter((r) => this.st.checked.includes(r.id)).map((r) => r.id);
  }

  edit(): EditView | null {
    if (this.st.edit === null) return null;
    const r = this.st.rows.find((x) => x.id === this.st.edit);
    if (!r) return null;
    const t = this.t;
    const T = this.T;
    const m = this.meta(r.c);
    const lm = this.meta(this.local);
    const d = this.session.detail[r.c];
    const dp = this.dp(m.currency);
    const base: FieldDef[] = d?.fields ?? [
      { label: '票种', key: 'kind', src: '人工' },
      { label: '票据号码', key: 'no', src: '人工' },
      { label: '开票日期', key: 'date', src: '人工' },
      { label: '销方名称', key: 'seller', src: '人工' },
      { label: '税号', key: 'sellerTax', src: '人工' },
      { label: '税额', key: 'tax', src: '人工' },
    ];
    const HINT: Partial<Record<FieldKey | 'amt', string>> = {
      tax: '票面未印消費税額。按税率区分 10% 反算为 ' + this.fmt(Math.round(r.amt / 11), 0) + '，请核对后确认。',
      sellerTax: '未识别到登録番号。无登録番号的票据在日本不属于適格請求書，将按不可抵扣凭证入账。',
      seller: '必填。',
      no: '必填。',
      date: '必填。',
      amt: '必填。',
    };
    const taxLocked = r.c === 'CN' && !!r.verify;
    const fields: FieldView[] = base.map((f) => {
      const raw = fieldValue(r, f.key, (k) => this.msg(k));
      const isMissing = (r.missing as string[]).indexOf(f.key) >= 0 || raw === null || raw === undefined || raw === '';
      const value = isMissing
        ? ''
        : f.key === 'net' || f.key === 'tax'
          ? m.currency + ' ' + this.fmt(typeof raw === 'number' ? raw : Number(raw), dp)
          : f.key === 'kind'
            ? t(String(raw))
            : String(raw);
      const marked = !!this.st.marks[r.id + ':' + f.key];
      const locked = (taxLocked && f.src !== '人工') || f.src === '税局';
      return {
        key: f.key,
        rawLabel: f.label,
        label: t(f.label),
        value,
        logValue: isMissing ? '待填写' : value,
        missing: isMissing,
        marked,
        locked,
        hint: marked
          ? t('已标注识别有误 · 已转入发票数据修正，更正时保留修正前后对比')
          : isMissing
            ? t(HINT[f.key] ?? '该字段为空，请补充。')
            : '',
        hintAlert: marked || f.key === 'sellerTax',
        src: t(f.src),
        srcManual: f.src === '人工',
        markLabel: t(locked ? '锁定' : marked ? '已标注' : '有误'),
        markTitle: t(locked ? '已经税局查验，以税局数据为准，不得更正' : '标注该字段识别有误'),
      };
    });
    const cks = this.checksOf(r);
    const errN = this.errCount(r);
    const pendN = cks.filter((c) => c.st === 'fix').length;
    const blocking = r.missing.length > 0 || !!r.flag || pendN > 0;
    return {
      id: r.id,
      title: t(r.isNew ? '手动录入票据' : '票据明细'),
      crumb: (r.isNew ? t('新建') : t(r.kind) + ' · ' + (r.no || '—')) + ' · ' + this.nameOf(r.c),
      country: this.nameOf(r.c),
      currency: m.currency + ' ' + t(m.currencyCn),
      taxLine: T.taxLabel + ' · ' + this.taxOf(m),
      lockNote: d?.lockNote ? t(d.lockNote) : this.textOf(m.note),
      orig: m.currency + ' ' + this.fmt(r.amt, dp),
      rate: r.c === this.local ? '1.0000' : this.fmt(m.cny / lm.cny, 4),
      rateNote:
        r.c === this.local
          ? t('本国票据无需折算。')
          : t('取 ' + (r.date || '入账日') + ' 中间价，随报销单锁定，后续汇率变动不影响本单。'),
      convLabel: fill(T.convIn, 'c', lm.currency),
      conv: lm.currency + ' ' + this.fmt(this.conv(r), 2),
      fields,
      checks: cks.map((c) => ({
        key: c.key,
        st: c.st,
        icon: t(CK_STYLE[c.st].icon),
        res: t(CK_STYLE[c.st].res),
        label: t(c.label),
        msg: t(c.msg),
        hasFix: c.st === 'fix' || c.st === 'fixed',
        canFix: c.st === 'fix',
        done: c.st === 'fixed',
        from: this.showVal(r, c.from),
        to: this.showVal(r, c.to),
        def: c,
      })),
      errRate: t(((errN / FIELD_COUNT) * 100).toFixed(1) + '%（' + errN + ' / ' + FIELD_COUNT + ' 字段）'),
      errHigh: errN / FIELD_COUNT >= 0.2,
      lockLine: t(
        taxLocked
          ? '已经税局查验的字段以税局数据为准，不得人工更正；票面本身有误时请供应商开具红字发票。'
          : '票面字段可标注识别有误；金额、税号类更正需第二人复核后生效。原件与影像只读，不会被修改。',
      ),
      log: this.st.log
        .filter((l) => l.id === r.id)
        .map((l) => ({
          at: l.at,
          field: t(l.field),
          before: UI_VALUES.has(l.before) ? t(l.before) : l.before,
          after: UI_VALUES.has(l.after) ? t(l.after) : l.after,
          src: t(l.src),
          beforeUi: UI_VALUES.has(l.before),
          afterUi: UI_VALUES.has(l.after),
        })),
      attachments: r.attach ? [{ name: r.kind + '_' + (r.no || 'new') + '.jpg', size: '1.8 MB' }] : [],
      imageNote: t(r.attach ? '原件 1 / 1' : '暂无影像'),
      statusLine: r.flag
        ? this.flagText(r.flag)
        : pendN
          ? t('有 ' + pendN + ' 处可自动纠正；确认时一并采纳并记录修正前后。')
          : blocking
            ? t('确认后该票据将移入「可导入」。')
            : t('字段完整，可直接导入。'),
      statusTone: r.flag ? 'alert' : blocking ? 'accent' : 'muted',
      saveLabel: t(blocking ? '确认并标记可导入' : '保存'),
    };
  }

  picker(): PickerView | null {
    if (!this.st.picker) return null;
    const T = this.T;
    const q = this.st.q.trim().toLowerCase();
    const rtl = this.lang === 'ar';
    const cjk = this.cjk;
    const codes = Object.keys(this.session.pool).filter((k) => this.st.pickTarget !== null || this.st.active.indexOf(k) < 0);
    const entry = (code: GeoCode) => {
      const m = this.meta(code);
      const name = this.nameOf(code);
      const idx = cjk || rtl ? (m.idx ?? '') : name.charAt(0).toUpperCase();
      return { code, m, idx, name };
    };
    let list = codes.map(entry);
    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().indexOf(q) >= 0 ||
          e.m.en.toLowerCase().indexOf(q) >= 0 ||
          e.m.currency.toLowerCase().indexOf(q) >= 0 ||
          e.m.currencyCn.indexOf(q) >= 0 ||
          this.taxOf(e.m).toLowerCase().indexOf(q) >= 0,
      );
    }
    if (this.st.letter) list = list.filter((e) => e.idx === this.st.letter);

    const present: Record<string, boolean> = {};
    codes.map(entry).forEach((e) => {
      present[e.idx] = true;
    });
    const byLetter: Record<string, ReturnType<typeof entry>[]> = {};
    list.forEach((e) => {
      (byLetter[e.idx] = byLetter[e.idx] || []).push(e);
    });
    const groups = Object.keys(byLetter)
      .sort()
      .map((L) => ({
        letter: L,
        rows: byLetter[L]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((e) => ({ code: e.code, name: e.name, currency: e.m.currency, tax: this.taxOf(e.m) })),
      }));
    const index: PickerIndexItem[] = [{ key: '*', ch: T.all, all: true, on: !this.st.letter, has: true }].concat(
      LETTERS.map((ch) => ({ key: ch, ch, all: false, on: this.st.letter === ch, has: !!present[ch] })),
    );
    return {
      q: this.st.q,
      hasQ: this.st.q.length > 0,
      showIndex: !rtl,
      index,
      groups,
      empty: !list.length,
      foot: this.st.pickTarget !== null ? T.reassignOne : fill(T.availableN, 'n', list.length),
    };
  }

  qr(): QrView | null {
    const stage = this.st.qr;
    if (!stage) return null;
    const Q = qrText(this.lang);
    const code = this.st.sel;
    const m = this.meta(code);
    const api = this.apiOf(code);
    const idx = { waiting: 0, cam: 1, result: 2, sent: 3 }[stage];
    return {
      title: Q.title,
      sub: Q.sub,
      chrome: Q.chrome,
      expire: Q.expire,
      foot: Q.foot,
      seed: code.charCodeAt(0) + code.charCodeAt(1),
      scanned: stage !== 'waiting',
      statusLabel: { waiting: Q.stWaiting, cam: Q.stCam, result: Q.stResult, sent: Q.stDone }[stage],
      geoLabel: Q.geoLabel,
      geoValue: this.nameOf(code) + ' · ' + m.currency,
      localeLabel: Q.localeLabel,
      localeValue: this.phoneLangName() + ' · ' + api.locale,
      apiLabel: Q.apiLabel,
      apiValue: api.id,
      steps: [Q.s1, Q.s2, Q.s3, Q.s4].map((label, i) => ({
        n: String(i + 1),
        label,
        state: i < idx ? 'done' : i === idx ? 'current' : 'todo',
      })),
      advanceLabel: { waiting: Q.simScan, cam: Q.simShoot, result: Q.simSend, sent: Q.reopen }[stage],
    };
  }

  phone(): PhoneView | null {
    const stage = this.st.qr;
    if (!stage) return null;
    const Q = qrText(this.lang);
    const M = mobileText(this.phoneLang());
    const code = this.st.sel;
    const m = this.meta(code);
    const api = this.apiOf(code);
    const d = this.demoOf(code);
    const dp = this.dp(m.currency);
    const ask = !!d.askTax && !this.st.taxOk;
    return {
      caption: Q.phoneCaption,
      footNote: Q.phoneFoot,
      locale: api.locale,
      dark: stage === 'waiting' || stage === 'cam',
      stage,
      idleTitle: M.idleTitle,
      idleBody: M.idleBody,
      geoName: this.nameOf(code),
      currency: m.currency,
      ruleNote: this.textOf(m.note),
      camHint: M.camHint,
      shutterLabel: Q.simShoot,
      shotLine: fill(M.shotN, 'n', this.st.shots),
      resultTitle: M.resultTitle,
      apiLine: api.id + ' · ' + api.locale,
      seller: d.seller,
      docLine: d.kind + ' · 2026-08-22',
      fAmount: M.fAmount,
      amount: m.currency + ' ' + this.fmt(d.amt, dp),
      fTax: M.fTax,
      tax: ask ? '—' : m.currency + ' ' + this.fmt(d.tax === null ? d.amt / 11 : d.tax, dp),
      taxAsk: ask ? M.confirm : '',
      resultNote: M.resultNote,
      retake: M.retake,
      use: M.use,
      sentTitle: M.sentTitle,
      sentBody: M.sentBody,
      again: M.again,
    };
  }
}

/** 票面字段取值 */
function fieldValue(r: InvoiceRow, key: FieldKey, msg: (k: MsgKey) => string): string | number | null | undefined {
  switch (key) {
    case 'net':
      return r.net;
    case 'tax':
      return r.tax;
    case 'verify':
      return r.verify ? msg(r.verify) : '';
    case 'kind':
      return r.kind;
    case 'no':
      return r.no;
    case 'date':
      return r.date;
    case 'seller':
      return r.seller;
    case 'sellerTax':
      return r.sellerTax;
    case 'rateClass':
      return r.rateClass;
  }
}

/** 采纳纠正：把纠正值写回票据字段（金额只规范显示，不改原值） */
export function withFix(r: InvoiceRow, field: FixField | undefined, to: FixValue | undefined): InvoiceRow {
  if (field === 'tax') return { ...r, tax: typeof to === 'number' ? to : null };
  if (field === 'sellerTax') return { ...r, sellerTax: to == null ? '' : String(to) };
  return { ...r };
}
