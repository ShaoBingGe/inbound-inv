import { Button, Card, Chip, Table, type Tone } from '@/components/ui';
import { useT } from '@/i18n';
import { LV } from '../data';
import type { RunRecord, RunStats } from '../types';
import s from '../AgentsPage.module.css';

/** Agent 运行记录 · 近 7 天，可撤回自动动作 */
export function RunsPanel({
  runs,
  stats,
  undone,
  onUndo,
}: {
  runs: RunRecord[];
  stats: RunStats;
  undone: Record<number, boolean | undefined>;
  onUndo: (index: number) => void;
}) {
  const t = useT();
  return (
    <Card padded={false} aria-label={t('Agent 运行记录')}>
      <div className={s.headRow + ' ' + s.runHead}>
        <h2 className={s.h2}>{t('Agent 运行记录 · 近 7 天')}</h2>
        <span className={s.muted}>{t('每次自动动作都可追溯到用的记忆与规则版本，可撤回')}</span>
        <div className={s.spacer} />
        <div className={'num ' + s.runStats}>
          <span>
            {t('自动完成')} <b>{stats.auto}</b>
          </span>
          <span>
            {t('预填被采纳')} <b>{stats.acc}</b>
          </span>
          <span>
            {t('被修改')} <b>{stats.mod}</b>
          </span>
          <span>
            {t('被撤回')} <b>{stats.undo}</b>
          </span>
          <span>
            {t('节省人工')} <b>{t(stats.saved)}</b>
          </span>
        </div>
      </div>
      <div className={s.runTableBox}>
        <Table className={s.runTable} wrapCells>
          <thead>
            <tr>
              <th>{t('时间')}</th>
              <th>{t('Agent')}</th>
              <th>{t('动作')}</th>
              <th>{t('对象')}</th>
              <th>{t('依据的记忆 / 规则')}</th>
              <th>{t('级别')}</th>
              <th>{t('结果')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {runs.map((r, i) => {
              const isUndone = !!undone[i];
              const tone: Tone = isUndone || r.res.includes('修改') ? 'orange' : r.res === '待确认' ? 'blue' : 'green';
              return (
                <tr key={r.at + r.obj}>
                  <td className={'num mono ' + s.cellSm} style={{ whiteSpace: 'nowrap' }}>
                    {r.at}
                  </td>
                  <td>{t(r.agent)}</td>
                  <td>{t(r.action)}</td>
                  <td className={'mono ' + s.cellSm} translate="no" style={{ whiteSpace: 'nowrap' }}>
                    {r.obj}
                  </td>
                  <td className={s.cellBasis}>{t(r.basis)}</td>
                  <td>
                    <Chip tone={LV[r.lv].tone}>{t(LV[r.lv].label)}</Chip>
                  </td>
                  <td>
                    <Chip tone={tone}>{isUndone ? t('已撤回') : t(r.res)}</Chip>
                  </td>
                  <td>
                    {r.canUndo && !isUndone ? (
                      <Button size="sm" className={s.btnSm} onClick={() => onUndo(i)}>
                        {t('撤回')}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
