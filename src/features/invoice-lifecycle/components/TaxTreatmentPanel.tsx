import { Link } from 'react-router-dom';
import { Card, Chip, Table } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { InvoiceLifecycle } from '../types';
import s from '../InvoiceLifecyclePage.module.css';

/** 本票的税务处理：多税种明细 + 适用规则要点 */
export function TaxTreatmentPanel({ inv }: { inv: InvoiceLifecycle }) {
  const t = useT();
  return (
    <Card padded={false} className={s.col} aria-label={t('税务处理')}>
      <div className={s.blockHead}>
        <h2 className={s.blockTitleSm}>
          {t('本票的税务处理 ·')} {t(inv.country)}
        </h2>
        <Link to={ROUTES.settingsTaxRules}>{t('查看规则库')}</Link>
      </div>
      <div className={s.taxTable}>
        <Table wrapCells>
          <thead>
            <tr>
              <th>{t('税种')}</th>
              <th className={s.right}>{t('税率')}</th>
              <th className={s.right}>{t('税额')}</th>
              <th>{t('处理')}</th>
              <th>{t('状态')}</th>
            </tr>
          </thead>
          <tbody>
            {inv.taxes.map((x) => (
              <tr key={x.name}>
                <td className={s.taxName}>{t(x.name)}</td>
                <td className={cx('num', s.right)}>{x.rate}</td>
                <td className={cx('num', s.right)}>{x.amt}</td>
                <td className={s.taxTreat}>{t(x.treat)}</td>
                <td>
                  <Chip tone={x.tone}>{t(x.st)}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className={s.ruleLines}>
        {inv.rules.map((r) => (
          <div key={r.k} className={s.ruleLine}>
            <span className={s.ruleKey}>{t(r.k)}</span>
            <span>{t(r.v)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
