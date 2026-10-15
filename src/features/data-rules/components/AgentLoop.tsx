import { Button, Card, Chip } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { AgentDef, AgentKey, CountryProfile } from '../types';
import s from '../DataRulesPage.module.css';

/** 标注与清洗闭环 · Agent 编排 */
export function AgentLoop({
  agents,
  country,
  active,
  onPick,
  isGated,
  log,
  busy,
  onApprove,
  fmt,
}: {
  agents: AgentDef[];
  country: CountryProfile;
  active: AgentKey;
  onPick: (k: AgentKey) => void;
  isGated: (k: AgentKey) => boolean;
  log: string[];
  busy: boolean;
  onApprove: () => void;
  fmt: (n: number) => string;
}) {
  const t = useT();
  const ag = agents.find((a) => a.key === active) ?? agents[0];
  const showGate = !!ag.gate && !isGated(ag.key);
  return (
    <Card padded={false} aria-label={t('Agent 闭环')}>
      <div className={cx(s.head, s.headBaseline)}>
        <h2 className={cx(s.h2, s.h2Lg)}>{t('标注与清洗闭环 · Agent 编排')}</h2>
        <span className={s.desc}>{t('使用中被高频修正的发票持续回流；每个 Agent 产出可审计，关键关口由人确认')}</span>
      </div>
      <div className={s.agentGrid}>
        {agents.map((a, i) => {
          const g = isGated(a.key);
          return (
            <button
              key={a.key}
              type="button"
              className={s.agentCard}
              aria-pressed={a.key === active}
              onClick={() => onPick(a.key)}
            >
              <span className={s.agentTop}>
                <span className={cx('num', s.agentNo)}>{String(i + 1).padStart(2, '0')}</span>
                <Chip tone={g ? 'green' : a.tone}>{t(g ? '已放行' : a.status)}</Chip>
              </span>
              <span className={s.agentName}>
                {t(a.name + ' Agent')}
              </span>
              <span className={s.agentRole}>
                {t(a.role)}
              </span>
              <span className={cx('num', s.agentQueue)}>
                {t('队列')} {fmt(Math.round(country.pend / (i + 2)))} {t('· 今日')}{' '}
                {fmt(Math.round((country.pend / (i + 1.5)) * 0.6))}
              </span>
            </button>
          );
        })}
      </div>
      <div className={s.agentDetail}>
        <div className={s.agentDetailHead}>
          <span className={s.strong}>{t(ag.name + ' Agent')}</span>
          <span className={s.agentDetailDesc}>{t(ag.role)}</span>
          <div className={s.spacer} />
          {showGate ? (
            <Button variant="primary" onClick={onApprove} disabled={busy}>
              {t(ag.gate ?? '')}
            </Button>
          ) : null}
        </div>
        <div className={cx('mono', s.log)} aria-live="polite">
          {log.map((l, i) => (
            <div key={i} className={s.logLine}>
              {t(l)}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
