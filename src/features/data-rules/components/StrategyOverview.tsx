import { Button, Card, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { computeDistribution, psiLevel } from '../logic';
import type { CountryCode, CountryProfile, CountryStrategy } from '../types';
import s from '../DataRulesPage.module.css';

/** 各国数据集策略总览 */
export function StrategyOverview({
  countries,
  strategies,
  active,
  onPick,
  fmt,
}: {
  countries: CountryProfile[];
  strategies: Record<CountryCode, CountryStrategy>;
  active: CountryCode;
  onPick: (c: CountryCode) => void;
  fmt: (n: number) => string;
}) {
  const t = useT();
  return (
    <Card padded={false} aria-label={t('各国策略总览')}>
      <div className={s.head}>
        <h2 className={s.h2}>{t('各国数据集策略总览')}</h2>
      </div>
      <div className={s.tableTop}>
        <Table hoverRows style={{ minWidth: 980 }}>
          <thead>
            <tr>
              <th>{t('国家')}</th>
              <th>{t('数据中心')}</th>
              <th className={s.end}>{t('目标 / 当前')}</th>
              <th className={s.end}>{t('待回流')}</th>
              <th className={s.end}>{t('回流上限')}</th>
              <th>{t('最近触发')}</th>
              <th className={s.end}>PSI</th>
              <th>{t('线上模型')}</th>
              <th>
                <span className="sr-only">{t('配置')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {countries.map((x) => {
              const st = strategies[x.code];
              const p = computeDistribution(x, st.cap).psi;
              const lvl = psiLevel(p);
              return (
                <tr key={x.code} className={cx(x.code === active && s.rowOn)}>
                  <td className={s.weight}>{t(x.name)}</td>
                  <td className="mono">{x.dc}</td>
                  <td className={cx('num', s.end)}>
                    <bdi dir="ltr">
                      {fmt(st.size)} / {fmt(x.cur)}
                    </bdi>
                  </td>
                  <td className={cx('num', s.end)}>{fmt(x.pend)}</td>
                  <td className={cx('num', s.end)}>{st.cap}%</td>
                  <td className={s.dim}>{t(x.trig)}</td>
                  <td className={cx('num', s.end, lvl === 'ok' ? s.ok : lvl === 'warn' ? s.warn : s.bad)}>{p.toFixed(3)}</td>
                  <td className="mono">{x.model}</td>
                  <td>
                    <Button onClick={() => onPick(x.code)} aria-pressed={x.code === active}>
                      {t('配置')}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
