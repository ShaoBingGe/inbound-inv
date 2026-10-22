import { describe, expect, it } from 'vitest';
import { detailKpis, nameKey, nameStatus, ratioText, specKey, specStatus, stoppedItems } from './logic';
import type { TrainingName } from './types';

const inv = { iname: 'x', ispec: 'y', iunit: '支', ratio: 10, conf: 90 };
const n: TrainingName = {
  id: 'N1',
  name: '注射用美罗培南',
  specs: [
    { sid: 'N1_0', spec: '0.5g', unit: '盒', ok: true, invoices: [inv] },
    { sid: 'N1_1', spec: '1.0g', unit: '支', ok: true, invoices: [inv] },
    { sid: 'N1_2', spec: '2.0g', unit: '支', ok: false, invoices: [] },
  ],
};

describe('训练成果状态', () => {
  it('品名学习率按未终止的规格计算', () => {
    expect(nameStatus(n, new Set())).toMatchObject({ ok: false, learned: 2, total: 3 });
    // 终止未学习的规格后，剩余规格全部已学习
    expect(nameStatus(n, new Set([specKey('N1_2')]))).toMatchObject({ ok: true, learned: 2, total: 2 });
    expect(nameStatus(n, new Set([nameKey('N1')])).stopped).toBe(true);
  });

  it('规格状态', () => {
    expect(specStatus(n.specs[0], new Set())).toBe('learned');
    expect(specStatus(n.specs[2], new Set())).toBe('unlearned');
    expect(specStatus(n.specs[0], new Set([specKey('N1_0')]))).toBe('stopped');
  });

  it('已终止页签：部分规格终止仍算学习中，全部终止算已终止', () => {
    const part = stoppedItems([n], new Set([specKey('N1_2')]));
    expect(part).toHaveLength(1);
    expect(part[0]).toMatchObject({ isStopped: false, stoppedSpecs: 1 });
    const all = stoppedItems([n], new Set(n.specs.map((x) => specKey(x.sid))));
    expect(all[0].isStopped).toBe(true);
    expect(stoppedItems([n], new Set())).toHaveLength(0);
  });

  it('汇总与比例格式', () => {
    expect(detailKpis([n])).toEqual({ specs: 3, learned: 2, unmatched: 1 });
    expect(ratioText(10)).toBe('10');
    expect(ratioText(0.25)).toBe('0.25');
  });
});
