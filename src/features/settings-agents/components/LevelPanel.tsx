import { Card, Chip, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { LEVEL_ORDER, LV } from '../data';
import type { Level, LevelRule } from '../types';
import s from '../AgentsPage.module.css';

/** 自动化分级 · 按作业类型；高于法人上限的级别不可选 */
export function LevelPanel({
  levels,
  current,
  onPick,
}: {
  levels: LevelRule[];
  current: Record<number, Level | undefined>;
  onPick: (index: number, lv: Level) => void;
}) {
  const t = useT();
  return (
    <Card padded={false} className={s.half} aria-label={t('自动化分级')}>
      <h2 className={s.h2sm}>{t('自动化分级 · 按作业类型')}</h2>
      <div className={s.sub}>{t('级别由员工本人在允许范围内调整；高于法人允许上限的选项不可选')}</div>
      <div className={s.tableBox + ' ' + s.tableBorder}>
        <Table className={s.levelTable} wrapCells>
          <thead>
            <tr>
              <th>{t('作业')}</th>
              <th>{t('当前级别')}</th>
              <th>{t('触发条件')}</th>
              <th>{t('法人上限')}</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((l, i) => {
              const cur = current[i] ?? l.cur;
              const capIdx = LEVEL_ORDER.indexOf(l.cap);
              return (
                <tr key={l.task}>
                  <td style={{ fontWeight: 500 }}>{t(l.task)}</td>
                  <td className={s.nowrap}>
                    <div className={s.seg} role="group" aria-label={`${t(l.task)} ${t('级别')}`}>
                      {LEVEL_ORDER.map((o, oi) => (
                        <button
                          key={o}
                          type="button"
                          aria-pressed={cur === o}
                          disabled={oi > capIdx}
                          onClick={() => {
                            if (oi <= capIdx) onPick(i, o);
                          }}
                        >
                          {t(LV[o].label)}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className={s.cellBasis + ' ' + s.whenCell}>{t(l.when)}</td>
                  <td className={s.nowrap}>
                    <Chip tone="gray">{t('最高：' + LV[l.cap].label)}</Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      <div className={s.legend}>
        <span>
          <b>{t('仅建议')}</b>
          {t('：Agent 给出草稿，你来填')}
        </span>
        <span>
          <b>{t('预填待确认')}</b>
          {t('：单据已填好，点一下提交')}
        </span>
        <span>
          <b>{t('自动提交')}</b>
          {t('：直接提交，24 小时内可撤回')}
        </span>
      </div>
    </Card>
  );
}
