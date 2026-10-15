import { Button, Field, Input, Select } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { MigrationStepDef } from '../types';
import s from '../DataOpsPage.module.css';

/** 数据迁移：选择迁移对象与目标中心，按 7 个步骤逐步执行 */
export function MigrationTab({
  source,
  objs,
  targets,
  obj,
  to,
  step,
  steps,
  busy,
  onObj,
  onTo,
  onAdvance,
  onReset,
}: {
  source: string;
  /** 可迁移对象；为空时显示「—」并禁用 */
  objs: string[];
  targets: string[];
  obj: string;
  to: string;
  step: number;
  steps: MigrationStepDef[];
  busy: boolean;
  onObj: (v: string) => void;
  onTo: (v: string) => void;
  onAdvance: () => void;
  onReset: () => void;
}) {
  const t = useT();
  const done = step >= steps.length;
  const options = objs.length ? objs : ['—'];
  const cta = done ? t('迁移完成') : step === 0 ? t('开始迁移') : t('执行：' + steps[step].label);
  const note = !objs.length
    ? t('该中心没有可迁移的国家或实体')
    : done
      ? t(obj + ' 已迁移到 ' + to + '，源端只读保留 30 天')
      : t('将把「' + obj + '」从 ' + source + ' 迁移到 ' + to);
  return (
    <>
      <div className={s.migGrid}>
        <Field label={t('迁移对象')}>
          {(id) => <Select id={id} value={obj} onChange={onObj} options={options.map((o) => ({ value: o, label: t(o) }))} />}
        </Field>
        <Field label={t('源数据中心')}>{(id) => <Input id={id} className="mono" value={source} disabled readOnly />}</Field>
        <Field label={t('目标数据中心')}>
          {(id) => <Select id={id} value={to} onChange={onTo} options={targets.map((o) => ({ value: o, label: o }))} />}
        </Field>
      </div>
      <ol className={s.steps}>
        {steps.map((st, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'wait';
          return (
            <li key={st.label} className={cx(s.step, state === 'current' && s.stepCurrent)}>
              <span className={cx('num', s.stepDot, s[`dot_${state}`])} aria-hidden="true">
                {i < step ? '✓' : String(i + 1)}
              </span>
              <div className={s.stepText}>
                <div className={s.strong}>{t(st.label)}</div>
                <div className={s.stepSub}>{t(st.sub)}</div>
              </div>
              <span className={s.stepState}>{state === 'done' ? t('完成') : state === 'current' ? t('下一步') : t('等待')}</span>
            </li>
          );
        })}
      </ol>
      <div className={s.actionsRow}>
        <Button variant="primary" onClick={onAdvance} disabled={done || !objs.length || busy}>
          {cta}
        </Button>
        <Button onClick={onReset} disabled={busy}>
          {t('重置')}
        </Button>
        <span className={s.muted}>{note}</span>
      </div>
    </>
  );
}
