import { Card, Chip, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { STATUS, TREAT } from '../meta';
import type { TaxRegime } from '../types';
import s from '../TaxRulesPage.module.css';

/** 税种与进项处理 */
export function TaxTypesCard({ regime: c }: { regime: TaxRegime }) {
  const t = useT();
  return (
    <Card padded={false} className={s.colTaxes} aria-label={t('税种')}>
      <div className={cx(s.head, s.headSm)}>
        <h2 className={s.h2Sm}>{t('税种与进项处理')}</h2>
      </div>
      <div className={s.tableTop}>
        <Table wrapCells className={cx(s.tbl, s.minW640)}>
          <thead>
            <tr>
              <th>{t('税种')}</th>
              <th>{t('税率')}</th>
              <th>{t('进项处理')}</th>
              <th>{t('条件')}</th>
              <th>{t('申报表')}</th>
            </tr>
          </thead>
          <tbody>
            {c.taxes.map((x) => (
              <tr key={x.name}>
                <td className={cx(s.strong, s.taxName)}>
                  {t(x.name)}
                  <div className={s.sub}>{t(x.level)}</div>
                </td>
                <td className={cx('num', s.nowrap)}>{t(x.rate)}</td>
                <td>
                  <Chip tone={TREAT[x.treat][1]}>{t(TREAT[x.treat][0])}</Chip>
                </td>
                <td className={cx(s.soft, s.condCell)}>{t(x.cond)}</td>
                <td className={s.soft}>{t(x.form)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}

/** 逆向流程与特殊处理 + 预提 / 代扣 */
export function ReverseCard({ regime: c }: { regime: TaxRegime }) {
  const t = useT();
  return (
    <Card padded={false} className={s.colReverse} aria-label={t('逆向与特殊')}>
      <div className={cx(s.head, s.headSm)}>
        <h2 className={s.h2Sm}>{t('逆向流程与特殊处理')}</h2>
      </div>
      <div className={s.tableTop}>
        <Table wrapCells className={cx(s.tbl, s.minW420)}>
          <thead>
            <tr>
              <th>{t('情形')}</th>
              <th>{t('机制')}</th>
              <th>{t('对进项的影响')}</th>
            </tr>
          </thead>
          <tbody>
            {c.reverse.map((r) => (
              <tr key={r.k}>
                <td className={cx(s.strong, s.nowrap)}>{t(r.k)}</td>
                <td className={s.soft}>{t(r.how)}</td>
                <td className={s.soft}>{t(r.eff)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className={s.wht}>
        <div className={cx('kick', s.whtTitle)}>{t('预提 / 代扣')}</div>
        {c.wht.map((w) => (
          <div key={w.k} className={s.whtRow}>
            <span className={s.whtKey}>{t(w.k)}</span>
            <span className={s.whtVal}>{t(w.v)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** 规则条目 */
export function RulesCard({ regime: c }: { regime: TaxRegime }) {
  const t = useT();
  return (
    <Card padded={false} aria-label={t('规则条目')}>
      <div className={s.head}>
        <h2 className={s.h2}>
          {t('规则条目 ·')} {t(c.name)}
        </h2>
        <span className={s.desc}>{t('每条规则有编码、生效区间、来源依据；校验策略与税务处理都引用这里')}</span>
      </div>
      <div className={s.tableTop}>
        <Table wrapCells className={cx(s.tbl, s.minW1080)}>
          <thead>
            <tr>
              <th>{t('编码')}</th>
              <th>{t('类别')}</th>
              <th>{t('规则')}</th>
              <th>{t('参数')}</th>
              <th>{t('生效')}</th>
              <th>{t('依据')}</th>
              <th>{t('状态')}</th>
            </tr>
          </thead>
          <tbody>
            {c.rules.map((r) => (
              <tr key={r.code}>
                <td className={cx('mono', s.nowrap)}>{r.code}</td>
                <td>
                  <Chip tone="gray">{t(r.cat)}</Chip>
                </td>
                <td className={s.ruleText}>{t(r.text)}</td>
                <td className={cx('mono', s.param)}>{t(r.param)}</td>
                <td className={cx('num', s.smallNum)}>{r.eff}</td>
                <td className={s.softSm}>{t(r.basis)}</td>
                <td>
                  <Chip tone={STATUS[r.status][1]}>{t(STATUS[r.status][0])}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}

/** 版本记录 */
export function VersionsCard({ regime: c }: { regime: TaxRegime }) {
  const t = useT();
  return (
    <Card padded={false} aria-label={t('版本')}>
      <div className={s.head}>
        <h2 className={s.h2}>
          {t('版本记录 ·')} {t(c.name)}
        </h2>
        <span className={s.desc}>{t('规则变更不改历史发票；按开票日自动套用对应版本')}</span>
      </div>
      <div className={s.tableTop}>
        <Table wrapCells className={cx(s.tbl, s.minW760)}>
          <thead>
            <tr>
              <th>{t('版本')}</th>
              <th>{t('生效')}</th>
              <th>{t('变更')}</th>
              <th>{t('影响')}</th>
              <th>{t('状态')}</th>
            </tr>
          </thead>
          <tbody>
            {c.versions.map((v) => (
              <tr key={v.v}>
                <td className="mono">{v.v}</td>
                <td className="num">{v.eff}</td>
                <td>{t(v.change)}</td>
                <td className={s.soft}>{t(v.impact)}</td>
                <td>
                  <Chip tone={STATUS[v.status][1]}>{t(STATUS[v.status][0])}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
