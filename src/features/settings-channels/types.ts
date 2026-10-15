import type { Tone } from '@/components/ui';

/** 采集渠道 */
export type ChannelKey = 'tax' | 'portal' | 'erp' | 'mail' | 'peppol';
/** 五类校验 */
export type FamKey = 'ocr' | 'gov' | 'sup' | 'dup' | 'biz';
/** 处置策略 */
export type PolicyKey = 'na' | 'auto' | 'hint' | 'review' | 'block';
export type PresetKey = 'standard' | 'strict' | 'quick' | 'supplier';
export type EmbedTabKey = 'sdk' | 'iframe' | 'im';
/** 规则未通过时的动作（简体中文原文） */
export type RuleAction = '提示' | '拦截' | '复核' | '自动';

export interface OrderStep {
  fam: FamKey;
  label: string;
  sub: string;
}
export interface SwitchRule {
  when: string;
  then: string;
}
export interface Channel {
  k: ChannelKey;
  name: string;
  /** 规则库中的短名 */
  short: string;
  sub: string;
  form: string;
  formTone: Tone;
  who: string;
  share: string;
  stp: string;
  err: string;
  preset: PresetKey;
  logic: string;
  order: OrderStep[];
  rules: SwitchRule[];
}

export interface SubCheck {
  k: string;
  name: string;
  note: string;
}
export interface Family {
  k: FamKey;
  name: string;
  subs: SubCheck[];
}

export interface PolicyStyle {
  label: string;
  desc: string;
  /** 用于 CSS 类名的处置键 */
  k: PolicyKey;
}

export interface Preset {
  k: PresetKey;
  label: string;
  v: Record<FamKey, PolicyKey>;
}

/** 渠道 × 校验类别 */
export type PolicyMatrix = Record<ChannelKey, Record<FamKey, PolicyKey>>;
/** 子项单独设置：key = channel:fam:sub */
export type SubOverrides = Record<string, PolicyKey>;

export interface LaneItem {
  code: string;
  msg: string;
  act: string;
}
export interface SampleTicket {
  sup: string;
  no: string;
  meta: string;
  lanes: Record<FamKey, LaneItem[]>;
  verdict: string;
  ok: boolean;
}

export interface Severity {
  l: string;
  tone: Tone;
}
export interface TaxonomyRow {
  name: string;
  prefix: string;
  eg: string;
  sev: Severity[];
  where: string;
  how: string;
  act: string;
  truth: string;
}

export interface EmbedParam {
  k: string;
  d: string;
  e: string;
}
export interface EmbedEvent {
  k: string;
  d: string;
}

export interface CheckRule {
  fam: FamKey;
  label: string;
  what: string;
  fix: string;
  where: string;
  act: RuleAction;
  chs: ChannelKey[];
}

export interface PolicyVersion {
  pol: PolicyMatrix;
  sub: SubOverrides;
  ver: number;
  publishedAt: string;
}

export interface ChannelsConfig {
  channels: Channel[];
  families: Family[];
  policies: PolicyStyle[];
  /** 点击格子时的切换顺序 */
  cycle: PolicyKey[];
  presets: Preset[];
  /** 恢复默认用 */
  defaults: { pol: PolicyMatrix; sub: SubOverrides };
  /** 当前生效版本 */
  current: PolicyVersion;
  samples: Record<ChannelKey, SampleTicket>;
  taxonomy: TaxonomyRow[];
  codes: Record<EmbedTabKey, string>;
  params: EmbedParam[];
  events: EmbedEvent[];
  /** 8×8 二维码示意，true = 深色 */
  qr: boolean[];
  rules: CheckRule[];
}

export interface PublishResult {
  ver: number;
}
