import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink, Chip, ErrorState, Icon, PageBody, PageHeader, PageLoading, Select, useToast } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { decideTodo, fetchAgentSettings, runAutoTodos, setAutomationLevel, setMemoryState, undoRun } from './api';
import { AgentCapabilities } from './components/AgentCapabilities';
import { FlowPanel } from './components/FlowPanel';
import { LevelPanel } from './components/LevelPanel';
import { MemoryPanel } from './components/MemoryPanel';
import { RunsPanel } from './components/RunsPanel';
import { TodayPanel } from './components/TodayPanel';
import type { Level, MemState, MemTab, Todo, TodoDecision, UserId } from './types';
import s from './AgentsPage.module.css';

const isUserId = (v: string): v is UserId => v === 'chen' || v === 'li' || v === 'wang';

export default function AgentsPage() {
  const t = useT();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(fetchAgentSettings, []);

  const [who, setWho] = useState<UserId>('li');
  /** key: who + todoId */
  const [done, setDone] = useState<Record<string, TodoDecision | undefined>>({});
  const [mtab, setMtab] = useState<MemTab>('sup');
  /** key: tab + index */
  const [memSt, setMemSt] = useState<Record<string, MemState | undefined>>({});
  const [lv, setLv] = useState<Record<number, Level | undefined>>({});
  /** key: who + runIndex */
  const [undone, setUndone] = useState<Record<string, boolean | undefined>>({});
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 3000);
  }, []);

  const fail = useCallback(
    (e: unknown) => toast(e instanceof Error ? e.message : t('操作失败'), { error: true }),
    [toast, t],
  );

  if (loading && !data) return <PageLoading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const user = data.users.find((u) => u.id === who) ?? data.users[0];
  const decisions: Record<string, TodoDecision | undefined> = {};
  user.todos.forEach((x) => {
    decisions[x.id] = done[who + x.id];
  });
  const runUndone: Record<number, boolean | undefined> = {};
  user.runs.forEach((_r, i) => {
    runUndone[i] = undone[who + i];
  });

  const onDecide = (todo: Todo, d: TodoDecision) => {
    setDone((prev) => ({ ...prev, [who + todo.id]: d }));
    decideTodo(who, todo.id, d).catch(fail);
  };

  const onRunAll = () => {
    const autos = user.todos.filter((x) => !done[who + x.id] && x.lv === 'auto');
    setDone((prev) => {
      const next = { ...prev };
      autos.forEach((x) => {
        next[who + x.id] = 'ok';
      });
      return next;
    });
    flash(
      autos.length
        ? t('已执行 ' + autos.length + ' 项自动提交级别的作业，24 小时内可在运行记录撤回')
        : t('没有待执行的自动提交作业'),
    );
    if (autos.length)
      runAutoTodos(
        who,
        autos.map((x) => x.id),
      ).catch(fail);
  };

  const onMemState = (tab: MemTab, index: number, st: MemState) => {
    setMemSt((prev) => ({ ...prev, [tab + index]: st }));
    setMemoryState(tab, index, st).catch(fail);
  };

  const onLevel = (index: number, level: Level) => {
    setLv((prev) => ({ ...prev, [index]: level }));
    setAutomationLevel(data.levels[index].task, level).catch(fail);
  };

  const onUndo = (index: number) => {
    setUndone((prev) => ({ ...prev, [who + index]: true }));
    undoRun(who, index).catch(fail);
  };

  return (
    <>
      <PageHeader
        crumb={`${t('设置')} / ${t('AI agent能力设置')}`}
        title={t('AI agent能力设置')}
        badges={<Chip tone="gray">{t('示例数据')}</Chip>}
        actions={
          <>
            <ButtonLink to={ROUTES.settingsSkills} icon={<Icon name="skill" />}>
              {t('Skill 管理')}
            </ButtonLink>
            <label className={s.whoLabel}>
              <span className="kick">{t('以谁的身份查看')}</span>
              <Select
                value={who}
                onChange={(v) => {
                  if (isUserId(v)) setWho(v);
                }}
                options={data.users.map((u) => ({ value: u.id, label: t(u.option) }))}
              />
            </label>
          </>
        }
      />
      <PageBody className={s.body}>
        <div className={s.notice} role="note">
          <Icon name="info" className={s.noticeIcon} />
          <span>{t('agent 由统一 agent 平台运行与调度，本页展示能力配置；Skill 的查看与编辑见 Skill 管理。')}</span>
          <Link to={ROUTES.settingsSkills} className={s.noticeLink}>
            {t('Skill 管理')}
          </Link>
        </div>

        <AgentCapabilities agents={data.agents} memories={data.memories} />

        <TodayPanel user={user} decisions={decisions} msg={msg} onDecide={onDecide} onRunAll={onRunAll} />

        <MemoryPanel groups={data.memories} tab={mtab} onTab={setMtab} memSt={memSt} onSetState={onMemState} />

        <div className={s.twoCol}>
          <LevelPanel levels={data.levels} current={lv} onPick={onLevel} />
          <FlowPanel inv={data.flowInv} steps={data.flow} />
        </div>

        <RunsPanel runs={user.runs} stats={data.stats} undone={runUndone} onUndo={onUndo} />

      </PageBody>
    </>
  );
}
