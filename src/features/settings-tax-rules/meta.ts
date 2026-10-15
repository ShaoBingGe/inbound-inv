import type { Tone } from '@/components/ui';
import type { RuleStatus, SimTxnType, SimUse, Treat } from './types';

/** 处理方式 → [文案（简体中文原文）, 色调]（与设计稿 T 一致） */
export const TREAT: Record<Treat, [string, Tone]> = {
  credit: ['可抵扣', 'green'],
  partial: ['部分抵扣', 'blue'],
  cost: ['计入成本', 'gray'],
  wht: ['代扣代缴', 'orange'],
  none: ['不适用', 'gray'],
};

/** 规则 / 版本状态 → [文案, 色调]（与设计稿 VST 一致） */
export const STATUS: Record<RuleStatus, [string, Tone]> = {
  active: ['生效中', 'green'],
  superseded: ['已被替代', 'gray'],
  draft: ['草稿', 'orange'],
};

export const TXN_TYPES: { value: SimTxnType; label: string }[] = [
  { value: 'goods', label: '货物' },
  { value: 'service', label: '服务' },
  { value: 'xborder', label: '跨境服务' },
  { value: 'asset', label: '固定资产' },
];

export const USES: { value: SimUse; label: string }[] = [
  { value: 'taxable', label: '应税经营' },
  { value: 'exempt', label: '免税项目' },
  { value: 'welfare', label: '集体福利 / 个人消费' },
  { value: 'mixed', label: '混用' },
];
