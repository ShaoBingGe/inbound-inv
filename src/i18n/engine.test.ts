import { describe, expect, it } from 'vitest';
import { createTranslator } from './engine';

const dict = {
  全球统一看板: 'Global Dashboard',
  第: 'Page',
  页: '',
  张: 'invoices',
  主数据中心: 'Master data center',
  全球汇总: 'Global summary',
};

describe('translator', () => {
  const { t } = createTranslator('en', dict);

  it('returns source text for zh', () => {
    expect(createTranslator('zh', null).t('全球统一看板')).toBe('全球统一看板');
  });

  it('matches whole strings exactly', () => {
    expect(t('全球统一看板')).toBe('Global Dashboard');
    expect(t('  全球统一看板 ')).toBe('  Global Dashboard ');
  });

  it('translates composed strings by fragments', () => {
    expect(t('主数据中心 · 全球汇总')).toBe('Master data center · Global summary');
    expect(t('12 张')).toBe('12 invoices');
  });

  it('formats dates and 万/亿 amounts', () => {
    expect(t('2026 年 9 月')).toBe('Sep 2026');
    expect(t('CNY 12.3 万')).toBe('CNY 123K');
  });

  it('does not split names with single-character keys', () => {
    expect(t('张伟')).toBe('张伟');
  });

  it('leaves non-Chinese text untouched', () => {
    expect(t('INV-2026-0001')).toBe('INV-2026-0001');
    expect(t(42)).toBe('42');
  });

  it('converts leftover simplified characters for zh-TW', () => {
    const tw = createTranslator('zh-TW', { 数据: '資料' }, { s: '发票', t: '發票' });
    expect(tw.t('发票数据')).toBe('發票資料');
  });
});
