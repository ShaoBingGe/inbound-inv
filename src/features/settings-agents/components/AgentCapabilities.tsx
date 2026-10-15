import { Link } from 'react-router-dom';
import { Chip, Icon, Section } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import type { AgentProfile, MemoryGroup } from '../types';
import s from '../AgentsPage.module.css';

/** 每个 agent 的能力配置：负责的作业、读取的记忆、挂载的 Skill（链接到 Skill 详情） */
export function AgentCapabilities({ agents, memories }: { agents: AgentProfile[]; memories: MemoryGroup[] }) {
  const t = useT();
  const memLabel = (k: string) => memories.find((m) => m.key === k)?.label ?? k;
  return (
    <Section title={t('Agent 能力配置')}>
      <div className={s.agentGrid}>
        {agents.map((a) => (
          <article key={a.id} className={s.agentCard} aria-label={t(a.name)}>
            <div className={s.agentName}>
              <Icon name="agent" />
              <span>{t(a.name)}</span>
            </div>
            <div className={s.agentLine}>
              <span className={s.agentKey}>{t('作业')}</span>
              {a.tasks.map((x) => (
                <Chip key={x} tone="gray">
                  {t(x)}
                </Chip>
              ))}
            </div>
            <div className={s.agentLine}>
              <span className={s.agentKey}>{t('记忆')}</span>
              {a.mems.map((m) => (
                <Chip key={m} tone="purple">
                  {t(memLabel(m))}
                </Chip>
              ))}
            </div>
            <div className={s.agentLine}>
              <span className={s.agentKey}>Skills</span>
              <span translate="no" style={{ display: 'contents' }}>
                {a.skills.map((id) => (
                  <Link key={id} to={ROUTES.skillDetail(id)} className={s.skillLink}>
                    {id}
                  </Link>
                ))}
              </span>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
