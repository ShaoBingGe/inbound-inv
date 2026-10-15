import type { ReactNode } from 'react';
import { Button, Card, Chip, Icon, Segmented, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { BAD, fmtAmt, fmtN, GOOD, INK, LEVEL_NAME, signed, STAGES, yoy, type LevelPreset } from '../model';
import type { PresetKey, StageKey, TreeNode } from '../types';
import s from '../GlobalDashboardPage.module.css';

/** 分级展开：按层级预设分组的树形表 */
export function DrillTable({
  tree,
  open,
  sel,
  focusStages,
  focusLabel,
  presets,
  presetKey,
  onPreset,
  onToggle,
  onSelect,
  onExpandAll,
  onCollapseAll,
}: {
  tree: TreeNode[];
  open: Record<string, boolean>;
  sel: string | null;
  focusStages: StageKey[];
  focusLabel: string;
  presets: LevelPreset[];
  presetKey: PresetKey;
  onPreset: (k: PresetKey) => void;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  const t = useT();
  const nOf = (nd: TreeNode) => focusStages.reduce((a, k) => a + nd.stats.cnt[k], 0);
  const amtOf = (nd: TreeNode) => focusStages.reduce((a, k) => a + nd.stats.amtS[k], 0);

  const rows: ReactNode[] = [];
  const walk = (nodes: TreeNode[]) =>
    nodes.forEach((nd) => {
      const isOpen = !!open[nd.path];
      const st = nd.stats;
      const cy = yoy(st.n, st.nly);
      const ay = yoy(st.amt, st.amtly);
      const accD = st.acc - st.accLy;
      const durD = (st.dur / st.durLy - 1) * 100;
      const hasKids = nd.kids.length > 0;
      const bg = sel === nd.path ? 'var(--accent-wash)' : nd.depth === 0 ? 'var(--gd-row-top)' : 'var(--surface)';
      rows.push(
        <tr key={nd.path} style={{ background: bg }}>
          <td>
            <div className={s.nameCell} style={{ paddingInlineStart: nd.depth * 22 }}>
              {hasKids ? (
                <button
                  type="button"
                  className={s.toggle}
                  onClick={() => onToggle(nd.path)}
                  aria-label={t((isOpen ? '收起 ' : '展开 ') + nd.name)}
                  aria-expanded={isOpen}
                >
                  <Icon name="chevronRight" size={12} strokeWidth={2.2} className={cx(s.chev, isOpen && s.chevOpen)} />
                </button>
              ) : (
                <span className={s.toggleGap} />
              )}
              <button
                type="button"
                className={s.rowName}
                onClick={() => onSelect(nd.path)}
                style={{ fontWeight: nd.depth === 0 ? 600 : 400 }}
                aria-current={sel === nd.path || undefined}
              >
                {t(nd.name)}
              </button>
              <span className={s.levelTag}>{t(LEVEL_NAME[nd.level])}</span>
            </div>
          </td>
          <td className={cx('num', s.end)}>{fmtN(nOf(nd))}</td>
          <td className={cx('num', s.end)}>{t(fmtAmt(amtOf(nd)))}</td>
          <td>
            <div className={s.dist}>
              {STAGES.map((x) => (
                <span
                  key={x.k}
                  className={s.distSeg}
                  title={t(x.label + ' ' + fmtN(st.cnt[x.k]))}
                  style={{
                    width: `${((st.cnt[x.k] / Math.max(1, st.n)) * 100).toFixed(2)}%`,
                    background: x.c,
                    opacity: focusStages.includes(x.k) ? 1 : 0.22,
                  }}
                />
              ))}
            </div>
          </td>
          <td className={cx('num', s.end)} style={{ color: INK }}>
            {cy.l}
          </td>
          <td className={cx('num', s.end)} style={{ color: INK }}>
            {ay.l}
          </td>
          <td className={cx('num', s.end)}>{st.acc.toFixed(2) + '%'}</td>
          <td className={cx('num', s.end)} style={{ color: accD >= 0 ? GOOD : BAD }}>
            {signed(accD, 2) + ' pp'}
          </td>
          <td className={cx('num', s.end)}>{t(st.dur.toFixed(1) + ' 秒')}</td>
          <td className={cx('num', s.end)} style={{ color: durD <= 0 ? GOOD : BAD }}>
            {signed(durD, 1) + '%'}
          </td>
        </tr>,
      );
      if (isOpen) walk(nd.kids);
    });
  walk(tree);

  return (
    <Card padded={false} aria-label={t('分级展开')}>
      <div className={s.headBar}>
        <h2 className={s.h2}>{t('分级展开')}</h2>
        <Chip tone="blue">{focusLabel}</Chip>
        <div className={s.spacer} />
        <span className="kick">{t('层级')}</span>
        <Segmented
          ariaLabel={t('层级顺序')}
          value={presetKey}
          onChange={onPreset}
          options={presets.map((p) => ({ value: p.k, label: t(p.label) }))}
        />
        <Button onClick={onExpandAll}>{t('全部展开')}</Button>
        <Button onClick={onCollapseAll}>{t('收起')}</Button>
      </div>
      <div className={s.legend}>
        {STAGES.map((x) => (
          <span key={x.k} className={s.legendItem}>
            <span className={s.swatchLg} style={{ background: x.c }} aria-hidden="true" />
            {t(x.label)}
          </span>
        ))}
        <span className={s.muted}>{t('同比口径：与去年同月比较，相同法人主体、相同国家、相同采集渠道；剔除本年新接入法人')}</span>
      </div>
      <div className={s.tableTop}>
        <Table hoverRows className={s.treeTable}>
          <thead>
            <tr>
              <th className={s.colName}>{t('名称')}</th>
              <th className={s.end}>{t('发票量')}</th>
              <th className={s.end}>{t('金额（折算 CNY）')}</th>
              <th className={s.colDist}>{t('状态分布')}</th>
              <th className={s.end}>{t('数量同比')}</th>
              <th className={s.end}>{t('金额同比')}</th>
              <th className={s.end}>{t('识别准确率')}</th>
              <th className={s.end}>{t('准确率同比')}</th>
              <th className={s.end}>{t('平均识别时长')}</th>
              <th className={s.end}>{t('时长同比')}</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </Table>
      </div>
    </Card>
  );
}
