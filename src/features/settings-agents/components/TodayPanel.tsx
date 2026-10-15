import { Button, Card, Chip } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { LV } from '../data';
import type { AgentUser, Todo, TodoDecision } from '../types';
import s from '../AgentsPage.module.css';

const RESULT: Partial<Record<TodoDecision, string>> = {
  skip: '已跳过，Agent 下次不再这样建议，并降低相关记忆置信度',
  edit: '已按你的修改提交，差异已学习',
};

/** 今日作业：Agent 为当前身份准备的待办 */
export function TodayPanel({
  user,
  decisions,
  msg,
  onDecide,
  onRunAll,
}: {
  user: AgentUser;
  decisions: Record<string, TodoDecision | undefined>;
  msg: string;
  onDecide: (todo: Todo, d: TodoDecision) => void;
  onRunAll: () => void;
}) {
  const t = useT();
  const open = user.todos.filter((x) => !decisions[x.id]);
  const autoCount = open.filter((x) => x.lv === 'auto').length;
  return (
    <Card aria-label={t('今日作业')} style={{ padding: '16px 20px' }}>
      <div className={s.headRow}>
        <h2 className={s.h2}>
          {t(user.name)}
          {t('，Agent 今天为你准备了')} <span className="num">{open.length}</span> {t('项作业')}
        </h2>
        <span className={s.muted}>{t(user.hint)}</span>
        <div className={s.spacer} />
        <Button variant="primary" onClick={onRunAll}>
          {t('一键执行「自动提交」级别的')} {autoCount} {t('项')}
        </Button>
      </div>
      <div className={s.todoList}>
        {user.todos.map((todo) => {
          const d = decisions[todo.id];
          const result = d ? (RESULT[d] ?? todo.result) : '';
          return (
            <div key={todo.id} className={cx(s.todo, todo.lv === 'auto' && s.todoAuto, d && s.todoDone)}>
              <Chip tone={LV[todo.lv].tone} className={s.todoLv}>
                {t(LV[todo.lv].label)}
              </Chip>
              <div className={s.todoMain}>
                <div className={s.todoTitle}>{t(todo.title)}</div>
                <div className={s.todoBody}>{t(todo.body)}</div>
                <div className={s.memChips}>
                  {todo.mem.map((m) => (
                    <Chip key={m} tone="purple" title={t('Agent 用到的记忆')}>
                      {t('记忆：')}
                      {t(m)}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className={s.todoActions}>
                {!d ? (
                  <>
                    <Button variant="primary" onClick={() => onDecide(todo, 'ok')}>
                      {t(todo.cta)}
                    </Button>
                    <Button onClick={() => onDecide(todo, 'edit')}>{t('修改后提交')}</Button>
                    <Button onClick={() => onDecide(todo, 'skip')}>{t('不要这样做')}</Button>
                  </>
                ) : (
                  <span className={s.todoResult}>{t(result)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {msg ? (
        <div role="status" className={s.flash}>
          {msg}
        </div>
      ) : null}
    </Card>
  );
}
