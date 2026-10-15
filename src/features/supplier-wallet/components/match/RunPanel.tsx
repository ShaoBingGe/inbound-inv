import { Button, Chip, Icon } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { EXEC_STATE, RUN_STAGES, VERDICT_META, ZONE_META } from '../../match/data';
import { deriveVerdict, execStateIndex, signedPct, verdictZone } from '../../match/logic';
import type { MatchGroup, MatchRun, MatchTolerance, Zone } from '../../match/types';
import s from './match.module.css';

const ZONE_TONE: Record<Zone, 'orange' | 'green' | 'purple'> = {
  manual: 'orange',
  auto: 'green',
  done: 'purple',
};

/** AI 数据处理流水线：同步税务发票 → 按匹配组展示执行状态（队列中 / 向量化中 / 匹配中） */
export function RunPanel({
  run,
  groups,
  tol,
  onReplay,
}: {
  run: MatchRun;
  groups: MatchGroup[];
  tol: MatchTolerance;
  onReplay: () => void;
}) {
  const t = useT();
  if (run.phase === 'idle') return null;
  const active = groups.filter((g) => run.stages[g.mg] !== undefined);
  const pending = Math.max(0, groups.length - active.length - run.done.length);
  const phaseText =
    run.phase === 'sync' ? '正在同步税务发票…' : run.phase === 'processing' ? '匹配算法执行中…' : '处理完成';
  const syncPct = run.syncTotal ? (run.syncNow / run.syncTotal) * 100 : 0;

  const detail = (g: MatchGroup, st: number) => {
    if (st === 0) return t('解析发票 ' + g.invDocs + ' 张 / 入库 ' + g.inbDocs + ' 张，识别 ' + g.invCats + ' 个品规');
    if (st === 1) return t(g.strategy).split(/[（(]/)[0].trim() + ' · ' + t('容差 ±' + tol.priceTol + '%');
    if (st === 2) return t('计算吻合度 / 置信度 · 单位换算') + ' ' + g.ratio;
    return t('吻合度 ' + g.fit + '% · 置信度 ' + g.conf + '% · 价差 ' + signedPct(g.pv));
  };

  return (
    <section className={s.run} aria-label={t('AI 数据处理流水线')} aria-live="polite">
      <div className={s.runHead}>
        <span className={s.runBadge}>
          <span className={s.pulse} aria-hidden="true" />
          {t('AI 数据处理流水线')}
        </span>
        <span className={s.runPhase}>{t(phaseText)}</span>
        {run.phase !== 'sync' ? (
          <span className={cx('num', s.runCounts)}>
            {t(
              '待处理 ' +
                pending +
                ' · 处理中 ' +
                active.length +
                ' · 已分发 ' +
                run.done.length +
                ' / ' +
                groups.length,
            )}
          </span>
        ) : null}
        <Button size="sm" className={s.runReplay} icon={<Icon name="refresh" size={14} />} onClick={onReplay}>
          {t('重新运行')}
        </Button>
      </div>

      {run.phase === 'sync' ? (
        <div className={s.runSync}>
          <div className={s.runSyncNums}>
            <span>{t('税务机关定时同步发票')}</span>
            <span className={cx('num', s.runSyncBig)}>{run.syncNow}</span>
            <span className="num">
              / {run.syncTotal} {t('张')}
            </span>
          </div>
          <div
            className={s.flowBar}
            role="progressbar"
            aria-valuenow={Math.round(syncPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div style={{ width: `${syncPct}%` }} />
          </div>
        </div>
      ) : null}

      {run.phase === 'processing' ? (
        <div className={s.runCards}>
          {active.length === 0 ? (
            <div className={s.runDone}>{t('✓ 全部购销对处理完成 · 已按处理建议分发至下方各区域')}</div>
          ) : (
            active.map((g) => {
              const st = run.stages[g.mg];
              const verdict = deriveVerdict(g, tol);
              const zone = verdictZone(verdict);
              const exec = EXEC_STATE[execStateIndex(st)];
              return (
                <article key={g.mg} className={cx(s.runCard, s[`runCard_${ZONE_TONE[zone]}`])}>
                  <div className={s.runCardHead}>
                    <span className={cx('mono', s.runMg)}>{g.mg}</span>
                    <span className={cx('num', s.runPct)}>{Math.round((st / 4) * 100)}%</span>
                  </div>
                  <div className={s.runMeta}>
                    <Chip tone={exec.tone}>{t(exec.label)}</Chip>
                    <span className={s.ellipsis} translate="no">
                      {g.sup} → {g.buyer}
                    </span>
                  </div>
                  <ol className={s.steps} aria-label={t('处理阶段')}>
                    {RUN_STAGES.map((label, i) => (
                      <li
                        key={label}
                        className={cx(s.step, i < st && s.stepDone, i === st && s.stepNow)}
                        aria-current={i === st ? 'step' : undefined}
                      >
                        <span aria-hidden="true" />
                        {t(label)}
                      </li>
                    ))}
                  </ol>
                  <div className={s.runDetail}>
                    <b>{t(RUN_STAGES[st])} · </b>
                    {detail(g, st)}
                  </div>
                  {st >= 3 ? (
                    <div className={s.runFinal}>
                      <Chip tone={VERDICT_META[verdict].tone}>{t(VERDICT_META[verdict].sugg)}</Chip>
                      <span>
                        {t('分发至')} <b className={s[`ink_${ZONE_TONE[zone]}`]}>{t(ZONE_META[zone].title)}</b>
                      </span>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      ) : null}
    </section>
  );
}
