import { Button, Card, Chip, Table, Tabs } from '@/components/ui';
import { useT } from '@/i18n';
import type { MemState, MemTab, MemoryGroup } from '../types';
import s from '../AgentsPage.module.css';

function confColor(conf: number): string {
  if (conf >= 85) return 'var(--green-ink)';
  if (conf >= 70) return 'var(--accent)';
  return 'var(--chart-3)';
}

/** Agent 记住了什么：三类记忆分 Tab 展示，可确认 / 删除 / 恢复 */
export function MemoryPanel({
  groups,
  tab,
  onTab,
  memSt,
  onSetState,
}: {
  groups: MemoryGroup[];
  tab: MemTab;
  onTab: (k: MemTab) => void;
  memSt: Record<string, MemState | undefined>;
  onSetState: (tab: MemTab, index: number, st: MemState) => void;
}) {
  const t = useT();
  const g = groups.find((x) => x.key === tab) ?? groups[0];
  return (
    <Card padded={false} aria-label={t('记忆')}>
      <div className={s.headRow + ' ' + s.memHead}>
        <h2 className={s.h2}>{t('Agent 记住了什么')}</h2>
        <span className={s.muted}>
          {t('三类记忆分开存放、分开授权；你随时可以改、可以删，Agent 只在你能看到的记忆上做决定')}
        </span>
      </div>
      <div className={s.memTabs}>
        <Tabs
          ariaLabel={t('记忆')}
          value={tab}
          onChange={onTab}
          items={groups.map((x) => ({
            value: x.key,
            label: (
              <>
                {t(x.label)} <span className={'num ' + s.muted}>{x.items.length}</span>
              </>
            ),
          }))}
        />
      </div>
      <div className={s.memBody}>
        <div className={s.memDesc}>{t(g.desc)}</div>
        <div className={s.tableBorder}>
          <Table className={s.memTable} wrapCells>
            <thead>
              <tr>
                <th>{t('记忆')}</th>
                <th>{t('内容')}</th>
                <th>{t('来源')}</th>
                <th className={s.end}>{t('置信度')}</th>
                <th>{t('用于')}</th>
                <th>{t('状态')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {g.items.map((m, i) => {
                const st = memSt[g.key + i] ?? m.st;
                const forgotten = st === 'forgotten';
                const conf = st === 'confirmed' ? 100 : m.conf;
                const shown = forgotten ? 0 : conf;
                return (
                  <tr key={m.k} style={{ opacity: forgotten ? 0.45 : 1 }}>
                    <td className={s.memKey}>{t(m.k)}</td>
                    <td className={s.memVal}>{t(m.v)}</td>
                    <td className={s.cellBasis}>{t(m.src)}</td>
                    <td className={'num ' + s.end}>
                      <div className={s.conf}>
                        <div className={s.confTrack}>
                          <div className={s.confBar} style={{ width: `${shown}%`, background: confColor(conf) }} />
                        </div>
                        {shown}%
                      </div>
                    </td>
                    <td className={s.cellBasis}>{t(m.use)}</td>
                    <td>
                      <Chip tone={forgotten ? 'gray' : st === 'confirmed' ? 'green' : 'blue'}>
                        {forgotten ? t('已删除') : st === 'confirmed' ? t('已确认') : t('观察到')}
                      </Chip>
                    </td>
                    <td>
                      <div className={s.rowActions}>
                        <Button size="sm" className={s.btnSm} onClick={() => onSetState(g.key, i, 'confirmed')}>
                          {st === 'confirmed' ? t('已确认') : t('确认')}
                        </Button>
                        <Button
                          size="sm"
                          className={s.btnSm}
                          onClick={() => onSetState(g.key, i, forgotten ? m.st : 'forgotten')}
                        >
                          {forgotten ? t('恢复') : t('删除')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
        <div className={s.memNotes}>
          <div className={s.memNote}>
            <div className={s.memNoteTitle}>{t('记忆如何形成')}</div>
            <div className={s.memNoteBody}>
              {t('同一行为重复 ≥ 3 次才形成「观察到」的记忆；你确认过的记忆置信度置为 100%；一次「不要这样做」立即降权并询问是否删除。')}
            </div>
          </div>
          <div className={s.memNote}>
            <div className={s.memNoteTitle}>{t('记忆存在哪里')}</div>
            <div className={s.memNoteBody}>
              {t('员工记忆属于员工本人，存于其所属数据中心；供应商特征属于法人，对该法人的 AP 共享；对账规则由财务共享中心维护，全局可读。')}
            </div>
          </div>
          <div className={s.memNote}>
            <div className={s.memNoteTitle}>{t('不会被记住的')}</div>
            <div className={s.memNoteBody}>
              {t('银行账号、个人证件、票面影像本身；记忆只存结构化的偏好与特征，不存原始数据。')}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
