import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Icon,
  Input,
  PageBody,
  PageHeader,
  PageLoading,
  Segmented,
  Select,
  Table,
  useToast,
} from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/auth/AuthProvider';
import { hasRole } from '@/auth/types';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { listBoundAgents, listSkills } from './api';
import { CreateSkillModal } from './components/CreateSkillModal';
import { AgentChips, StatusChip, useFmtTime } from './components/shared';
import type { SkillStatus } from './types';
import s from './SkillListPage.module.css';

type StatusFilter = SkillStatus | 'all';

export default function SkillListPage() {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = hasRole(user, ['skill_editor']);
  const fmt = useFmtTime();

  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [agent, setAgent] = useState('');
  const [creating, setCreating] = useState(false);

  // 搜索输入防抖
  useEffect(() => {
    const id = setTimeout(() => setQuery(input.trim()), 220);
    return () => clearTimeout(id);
  }, [input]);

  const { data, loading, error, reload } = useAsync(
    () => listSkills({ query, status: status === 'all' ? '' : status, agent }),
    [query, status, agent],
  );
  const agents = useAsync(listBoundAgents, []);

  const statusOptions = useMemo(
    () => [
      { value: 'all' as const, label: t('全部') },
      { value: 'draft' as const, label: t('草稿') },
      { value: 'published' as const, label: t('已发布') },
      { value: 'disabled' as const, label: t('已停用') },
    ],
    [t],
  );
  const agentOptions = useMemo(
    () => [{ value: '', label: t('全部 agent') }, ...(agents.data ?? []).map((a) => ({ value: a, label: t(a) }))],
    [agents.data, t],
  );

  const filtered = query !== '' || status !== 'all' || agent !== '';

  return (
    <>
      <PageHeader
        crumb={`${t('设置')} / ${t('Skill 管理')}`}
        title={t('Skill 管理')}
        actions={
          canEdit ? (
            <Button variant="primary" icon={<Icon name="plus" />} onClick={() => setCreating(true)}>
              {t('新建 Skill')}
            </Button>
          ) : null
        }
      />
      <PageBody>
        <div className={s.notice} role="note">
          <Icon name="info" size={16} />
          <div>
            <strong>{t('agent 运行在统一 agent 平台上')}</strong>
            <span>
              {t('agent 的运行、调度与记忆由统一 agent 平台管理；这里只查看和编辑 agent 使用的 Skill（SKILL.md 指令与辅助文件）。发布后由平台按绑定关系下发到 agent。')}
            </span>
          </div>
          <Link to={ROUTES.settingsAgents} className={s.noticeLink}>
            {t('AI agent能力设置')}
            <Icon name="chevronRight" size={14} />
          </Link>
        </div>

        <Card padded={false}>
          <div className={s.toolbar}>
            <div className={s.search}>
              <Icon name="search" size={15} className={s.searchIcon} />
              <Input
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('搜索名称或描述')}
                aria-label={t('搜索名称或描述')}
              />
            </div>
            <Segmented options={statusOptions} value={status} onChange={setStatus} ariaLabel={t('状态')} />
            <Select options={agentOptions} value={agent} onChange={setAgent} aria-label={t('绑定 agent')} />
            <div className={s.spacer} />
            {data ? (
              <span className={s.count}>
                {t('共 ' + data.length + ' 个 Skill')}
              </span>
            ) : null}
          </div>

          {error ? (
            <div className={s.pad}>
              <ErrorState error={error} onRetry={reload} />
            </div>
          ) : loading && !data ? (
            <PageLoading />
          ) : !data || data.length === 0 ? (
            <Empty title={filtered ? t('没有符合条件的 Skill') : t('还没有 Skill')}>
              {filtered ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setInput('');
                    setStatus('all');
                    setAgent('');
                  }}
                >
                  {t('清除筛选')}
                </Button>
              ) : null}
            </Empty>
          ) : (
            <Table hoverRows className={s.table} aria-label={t('Skill 列表')}>
              <thead>
                <tr>
                  <th>{t('Skill')}</th>
                  <th>{t('绑定 agent')}</th>
                  <th>{t('版本')}</th>
                  <th>{t('状态')}</th>
                  <th>{t('最近修改')}</th>
                  <th className={s.actionsCol}>{t('操作')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    <td className={s.nameCell}>
                      <Link to={ROUTES.skillDetail(row.id)} className={`mono ${s.name}`} translate="no">
                        {row.name}
                      </Link>
                      <div className={s.desc} title={row.description} translate="no">
                        {row.description}
                      </div>
                    </td>
                    <td className={s.agentsCell}>
                      <AgentChips agents={row.agents} />
                    </td>
                    <td>
                      <div className="mono num" translate="no">
                        {row.version}
                      </div>
                      {row.hasDraft && row.publishedVersion ? (
                        <div className={s.sub}>
                          {t('线上')} <span className="mono num">{row.publishedVersion}</span>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className={s.statusCell}>
                        <StatusChip status={row.status} />
                        {row.hasDraft && row.status !== 'draft' ? <span className={s.sub}>{t('有未发布草稿')}</span> : null}
                      </div>
                    </td>
                    <td>
                      <div translate="no">{row.updatedBy}</div>
                      <div className={`${s.sub} num`}>{fmt(row.updatedAt)}</div>
                    </td>
                    <td className={s.actionsCol}>
                      <div className={s.actions}>
                        <Link to={ROUTES.skillDetail(row.id)}>{t('查看')}</Link>
                        {canEdit ? <Link to={`${ROUTES.skillDetail(row.id)}?edit=1`}>{t('编辑')}</Link> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </PageBody>

      <CreateSkillModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(skill) => {
          setCreating(false);
          toast(t('已创建草稿 ' + skill.name));
          navigate(`${ROUTES.skillDetail(skill.id)}?edit=1`);
        }}
      />
    </>
  );
}
