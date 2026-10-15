import { Link } from 'react-router-dom';
import { Card, Chip, Segmented, Table, type Tone } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { Channel, CheckRule, FamKey, Family, RuleAction } from '../types';
import s from '../ChannelsPage.module.css';

const ACT_TONE: Record<RuleAction, Tone> = { 提示: 'orange', 拦截: 'red', 复核: 'blue', 自动: 'green' };

export type RuleFilter = 'all' | FamKey;

/** 校验与纠正规则库（按五类校验筛选） */
export function RuleLibrary({
  rules,
  families,
  channels,
  filter,
  onFilter,
}: {
  rules: CheckRule[];
  families: Family[];
  channels: Channel[];
  filter: RuleFilter;
  onFilter: (f: RuleFilter) => void;
}) {
  const t = useT();
  const tabs: Array<{ k: RuleFilter; name: string; n: number }> = [
    { k: 'all', name: '全部', n: rules.length },
    ...families.map((f) => ({ k: f.k, name: f.name, n: rules.filter((r) => r.fam === f.k).length })),
  ];
  const shown = rules.filter((r) => filter === 'all' || r.fam === filter);
  const famName = (k: FamKey) => families.find((f) => f.k === k)?.name ?? k;
  const chName = (k: string) => channels.find((c) => c.k === k)?.short ?? k;

  return (
    <Card padded={false} id="rules" tabIndex={-1} className={s.anchor} aria-label={t('校验与纠正规则库')}>
      <div className={s.secHead}>
        <h2 className={s.secTitle}>{t('校验与纠正规则库')}</h2>
        <span className={s.secDesc}>
          {t('按五类校验归类；矩阵中的子项引用这里的规则，按发生地自动套用。税率与抵扣规则见')}{' '}
          <Link to={ROUTES.settingsTaxRules}>{t('税务规则设置')}</Link>
        </span>
        <div className={s.grow} />
        <Segmented<RuleFilter>
          ariaLabel={t('按类别筛选')}
          value={filter}
          onChange={onFilter}
          options={tabs.map((x) => ({
            value: x.k,
            label: (
              <>
                {t(x.name)}
                <span className={cx('num', s.tabCount)}>{x.n}</span>
              </>
            ),
          }))}
        />
      </div>
      <div className={s.tableTop}>
        <Table className={cx(s.rulesTable, s.topCells)} wrapCells>
          <thead>
            <tr>
              <th>#</th>
              <th>{t('类别')}</th>
              <th>{t('校验项')}</th>
              <th>{t('检查内容')}</th>
              <th>{t('自动纠正 / 处置')}</th>
              <th>{t('适用国家')}</th>
              <th>{t('适用渠道')}</th>
              <th>{t('未通过时')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u, i) => (
              <tr key={u.fam + u.label}>
                <td className={cx('num', s.mutedCell)}>{i + 1}</td>
                <td>
                  <Chip tone="gray">{t(famName(u.fam))}</Chip>
                </td>
                <td className={s.strongCell}>{t(u.label)}</td>
                <td className={s.softCell}>{t(u.what)}</td>
                <td className={s.softCell}>{t(u.fix)}</td>
                <td className={s.softCell}>{t(u.where)}</td>
                <td>
                  <div className={s.chips}>
                    {u.chs.map((c) => (
                      <Chip key={c} tone="blue" className={s.chipSm}>
                        {t(chName(c))}
                      </Chip>
                    ))}
                  </div>
                </td>
                <td>
                  <Chip tone={ACT_TONE[u.act]}>{t(u.act)}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
