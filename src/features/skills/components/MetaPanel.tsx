import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Chip, Icon, Progress } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { fileSize, formatBytes, TOTAL_MAX_BYTES, type ParsedFrontmatter } from '../frontmatter';
import type { Skill, SkillFile, ValidationIssue } from '../types';
import { FmValue } from './FileViewer';
import { AgentChips, useFmtTime } from './shared';
import s from './parts.module.css';

function Block({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className={s.metaBlock} aria-label={title}>
      <div className={s.metaHead}>
        <h2 className={s.panelTitle}>{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function MetaPanel({
  skill,
  files,
  fm,
  issues,
  canEdit,
  onPickIssue,
}: {
  skill: Skill;
  files: SkillFile[];
  fm: ParsedFrontmatter | null;
  issues: ValidationIssue[];
  canEdit: boolean;
  onPickIssue: (path: string) => void;
}) {
  const t = useT();
  const fmt = useFmtTime();
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.length - errors;
  const total = files.reduce((n, f) => n + fileSize(f), 0);

  return (
    <aside className={s.meta} aria-label={t('Skill 信息')}>
      <Block title={t('Frontmatter 解析结果')}>
        {!fm ? (
          <div className={s.metaMuted}>{t('缺少 SKILL.md')}</div>
        ) : !fm.present ? (
          <div className={s.metaMuted}>{t('SKILL.md 没有 frontmatter')}</div>
        ) : fm.data ? (
          <dl className={s.kv} translate="no">
            {Object.keys(fm.data).length === 0 ? <div className={s.metaMuted}>—</div> : null}
            {Object.entries(fm.data).map(([k, v]) => (
              <div key={k} className={s.kvRow}>
                <dt className="mono">{k}</dt>
                <dd>
                  <FmValue value={v} />
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className={s.fmErr}>
            {t('frontmatter 不是合法的 YAML 映射')}
            {fm.error ? <code className="mono">{fm.error}</code> : null}
          </div>
        )}
      </Block>

      <Block
        title={t('校验')}
        extra={
          issues.length === 0 ? (
            <Chip tone="green">{t('通过')}</Chip>
          ) : (
            <span className={s.metaChips}>
              {errors ? <Chip tone="red">{t(errors + ' 个错误')}</Chip> : null}
              {warnings ? <Chip tone="orange">{t(warnings + ' 个提醒')}</Chip> : null}
            </span>
          )
        }
      >
        {issues.length === 0 ? (
          <div className={s.metaMuted}>{t('name、description、文件路径与大小均符合平台要求。')}</div>
        ) : (
          <ul className={s.issues}>
            {issues.map((i, k) => (
              <li key={k} className={cx(s.issue, i.level === 'error' ? s.issueErr : s.issueWarn)}>
                <Icon name={i.level === 'error' ? 'warn' : 'info'} size={14} />
                <div className={s.issueBody}>
                  <span className="sr-only">{i.level === 'error' ? t('错误') : t('提醒')}</span>
                  <div>{t(i.message)}</div>
                  {i.path || i.detail ? (
                    <div className={s.issueMeta} translate="no">
                      {i.path ? (
                        <button type="button" className={s.issuePath} onClick={() => onPickIssue(i.path ?? '')}>
                          {i.path}
                        </button>
                      ) : null}
                      {i.detail ? <code className="mono">{i.detail}</code> : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {errors > 0 ? <div className={s.metaWarn}>{t('有错误时不能发布；草稿仍可保存。')}</div> : null}
      </Block>

      <Block title={t('绑定 agent')}>
        <AgentChips agents={skill.agents} />
        <div className={s.metaMuted} style={{ marginTop: 6 }}>
          {t('绑定关系由统一 agent 平台维护；发布后按绑定关系下发。')}{' '}
          <Link to={ROUTES.settingsAgents}>{t('AI agent能力设置')}</Link>
        </div>
      </Block>

      <Block title={t('权限')}>
        <dl className={s.kv}>
          <div className={s.kvRow}>
            <dt>{t('你的权限')}</dt>
            <dd>{canEdit ? <Chip tone="blue">{t('可编辑')}</Chip> : <Chip tone="gray">{t('只读')}</Chip>}</dd>
          </div>
          <div className={s.kvRow}>
            <dt>{t('查看')}</dt>
            <dd className={s.roleList}>
              {skill.permissions.viewRoles.map((r) => (
                <code key={r} className={s.fmTag}>
                  {r}
                </code>
              ))}
            </dd>
          </div>
          <div className={s.kvRow}>
            <dt>{t('编辑 / 发布')}</dt>
            <dd className={s.roleList}>
              {[...skill.permissions.editRoles, 'admin'].map((r) => (
                <code key={r} className={s.fmTag}>
                  {r}
                </code>
              ))}
            </dd>
          </div>
          <div className={s.kvRow}>
            <dt>{t('负责人')}</dt>
            <dd translate="no">{skill.owner}</dd>
          </div>
          <div className={s.kvRow}>
            <dt>{t('维护人')}</dt>
            <dd translate="no">{skill.permissions.editors.join('、')}</dd>
          </div>
        </dl>
      </Block>

      <Block title={t('版本')}>
        <dl className={s.kv}>
          <div className={s.kvRow}>
            <dt>{t('当前版本')}</dt>
            <dd className="mono num">{skill.version}</dd>
          </div>
          <div className={s.kvRow}>
            <dt>{t('线上版本')}</dt>
            <dd className="mono num">{skill.publishedVersion ?? '—'}</dd>
          </div>
          {skill.lastPublished ? (
            <div className={s.kvRow}>
              <dt>{t('最近发布')}</dt>
              <dd>
                <div>
                  <span translate="no">{skill.lastPublished.by}</span> · <span className="num">{fmt(skill.lastPublished.at)}</span>
                </div>
                <div className={s.metaNote} translate="no">
                  {skill.lastPublished.note}
                </div>
              </dd>
            </div>
          ) : (
            <div className={s.kvRow}>
              <dt>{t('最近发布')}</dt>
              <dd className={s.metaMuted}>{t('尚未发布')}</dd>
            </div>
          )}
          <div className={s.kvRow}>
            <dt>{t('最近修改')}</dt>
            <dd>
              <span translate="no">{skill.updatedBy}</span> · <span className="num">{fmt(skill.updatedAt)}</span>
            </dd>
          </div>
          <div className={s.kvRow}>
            <dt>{t('创建时间')}</dt>
            <dd className="num">{fmt(skill.createdAt)}</dd>
          </div>
        </dl>
      </Block>

      <Block title={t('大小')}>
        <div className={s.sizeRow}>
          <span className="num">
            {formatBytes(total)} / 5 MB
          </span>
          <span className={s.metaMuted}>{t(files.length + ' 个文件')}</span>
        </div>
        <Progress
          value={(total / TOTAL_MAX_BYTES) * 100}
          label={t('Skill 大小')}
          color={total > TOTAL_MAX_BYTES ? 'var(--alert)' : undefined}
        />
        <div className={s.metaMuted} style={{ marginTop: 6 }}>
          {t('单个文件不超过 512 KB，整个 Skill 不超过 5 MB。')}
        </div>
      </Block>
    </aside>
  );
}
