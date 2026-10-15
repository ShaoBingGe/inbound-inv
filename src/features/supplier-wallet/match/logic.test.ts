import { describe, expect, it } from 'vitest';
import { DEFAULT_TOLERANCE, MATCH_GROUPS, WB_INBOUNDS, WB_INVOICES, WB_LINKS } from './data';
import {
  cardModel,
  deriveVerdict,
  execStateIndex,
  lineDeviation,
  linkKind,
  simulateRun,
  summarize,
  toggleDraftEndpoint,
  toggleLinkEndpoint,
} from './logic';

const byMg = (mg: string) => MATCH_GROUPS.find((g) => g.mg === mg)!;

describe('deriveVerdict / cardModel', () => {
  it('分区与设计稿一致', () => {
    const v = (mg: string) => deriveVerdict(byMg(mg), DEFAULT_TOLERANCE);
    expect(v('MG-20260712-014')).toBe('auto');
    expect(v('MG-20260712-016')).toBe('block'); // 单价 +3.6% 超 ±2%
    expect(v('MG-20260712-017')).toBe('block'); // 数量 -4.2% 超 ±1%
    expect(v('MG-20260712-019')).toBe('review'); // 吻合度 91% < 95%
    expect(v('MG-20260712-011')).toBe('confirmed');
  });

  it('推荐操作：价差超容差 → 调整策略；量差 / 复核 → 手工匹配', () => {
    expect(cardModel(byMg('MG-20260712-016'), DEFAULT_TOLERANCE).recAction).toBe('adjust');
    expect(cardModel(byMg('MG-20260712-017'), DEFAULT_TOLERANCE).recAction).toBe('manual');
    expect(cardModel(byMg('MG-20260712-019'), DEFAULT_TOLERANCE).recAction).toBe('manual');
    expect(cardModel(byMg('MG-20260712-014'), DEFAULT_TOLERANCE).recAction).toBe('confirm');
  });

  it('行匹配率：完全匹配为 100%，未完全匹配的组按吻合度估算且低于 100%', () => {
    const c = cardModel(byMg('MG-20260712-016'), DEFAULT_TOLERANCE);
    expect(c.zone).toBe('manual');
    expect([c.matchedRows, c.totalRows, c.lineRate]).toEqual([2, 3, 67]);
    const r = cardModel(byMg('MG-20260712-019'), DEFAULT_TOLERANCE);
    expect([r.matchedRows, r.totalRows, r.lineRate]).toEqual([4, 5, 80]);
    expect(cardModel(byMg('MG-20260712-017'), DEFAULT_TOLERANCE).matchedRows).toBe(3);
    const a = cardModel(byMg('MG-20260712-014'), DEFAULT_TOLERANCE);
    expect([a.matchedRows, a.lineRate]).toEqual([5, 100]);
  });
});

describe('simulateRun', () => {
  const tm = {
    syncTotal: 124,
    syncStep: 8,
    syncTickMs: 100,
    syncHoldMs: 500,
    staggerMs: 1000,
    stageMs: 1000,
  };
  const mgs = ['A', 'B'];
  it('先同步发票', () => {
    const r = simulateRun(450, mgs, tm);
    expect(r.phase).toBe('sync');
    expect(r.syncNow).toBe(32);
  });
  it('逐组推进阶段，完成后分发', () => {
    const t0 = 1600 + 500;
    expect(simulateRun(t0 + 1500, mgs, tm).stages).toEqual({ A: 1, B: 0 });
    const end = simulateRun(t0 + 5200, mgs, tm);
    expect(end.phase).toBe('complete');
    expect(end.done).toEqual(['A', 'B']);
  });
  it('对外三态', () => {
    expect([0, 1, 2, 3].map(execStateIndex)).toEqual([0, 1, 2, 2]);
  });
});

describe('工作台连线编辑', () => {
  it('linkKind', () => {
    expect(linkKind(1, 1)).toBe('1:1');
    expect(linkKind(1, 2)).toBe('1:n');
    expect(linkKind(3, 1)).toBe('n:1');
    expect(linkKind(2, 2)).toBe('n:n');
  });

  it('增减已选连线的端点；一端清空时连线解散', () => {
    const add = toggleLinkEndpoint(WB_LINKS, 'g1', 'inb', 'R7');
    expect(add.links.find((g) => g.id === 'g1')).toMatchObject({
      inb: ['R1', 'R7'],
      kind: '1:n',
    });
    expect(add.dissolved).toBeNull();
    const rm = toggleLinkEndpoint(WB_LINKS, 'g1', 'inv', 'L1');
    expect(rm.links.some((g) => g.id === 'g1')).toBe(false);
    expect(rm.dissolved).toEqual(['R1']);
  });

  it('手工建立连接：两侧都选中后生成连线', () => {
    const a = toggleDraftEndpoint(WB_LINKS, null, 'inv', 'L4', 'm1');
    expect(a.curId).toBe('m1');
    const b = toggleDraftEndpoint(a.links, a.curId, 'inb', 'R7', 'm2');
    expect(b.links.find((g) => g.id === 'm1')).toMatchObject({
      inv: ['L4'],
      inb: ['R7'],
      kind: '1:1',
    });
    const c = toggleDraftEndpoint(a.links, a.curId, 'inv', 'L4', 'm3');
    expect(c.curId).toBeNull();
    expect(c.links).toHaveLength(WB_LINKS.length);
  });
});

describe('summarize / lineDeviation', () => {
  it('匹配组看板指标与设计稿一致', () => {
    const s = summarize(WB_INVOICES, WB_INBOUNDS, WB_LINKS);
    expect([s.invDocs, s.invLines, s.inbDocs, s.inbLines]).toEqual([2, 8, 2, 7]);
    expect([s.matchedInvLines, s.lineRate]).toEqual([6, 75]);
    expect([s.remainInvLines, s.remainInbLines]).toEqual([4, 3]);
    expect([s.invLeftLines, s.invLeftAmt, s.inbLeftLines, s.inbLeftAmt]).toEqual([2, 28400, 1, 4000]);
    expect(s.matchedInvAmt).toBe(531000);
    expect(s.diff).toBe(531000 - 442400);
    expect(s.linkCount).toBe(4);
  });

  it('选中行差异比例', () => {
    const l3 = WB_INVOICES[0].lines[2];
    const d = lineDeviation(l3);
    expect(d.amtPct).toBeCloseTo(-6.7, 5);
    expect(d.qtyPct).toBe(-4);
    expect(d.pricePct).toBe(-2.7);
    expect(d.full).toBe(false);
    expect(lineDeviation(WB_INVOICES[0].lines[0]).full).toBe(true);
  });
});
