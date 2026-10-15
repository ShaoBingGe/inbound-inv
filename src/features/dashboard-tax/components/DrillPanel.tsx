import { Link } from 'react-router-dom';
import { Button, Card, Spinner, Table } from '@/components/ui';
import { PROTOTYPE_ROUTE } from '@/app/routes';
import { useT } from '@/i18n';
import type { DrillInvoice } from '../types';
import styles from '../TaxDashboardPage.module.css';

export function DrillPanel({
  stateLabel,
  scopeName,
  period,
  rows,
  onClose,
}: {
  stateLabel: string;
  scopeName: string;
  period: string;
  /** undefined = 加载中 */
  rows: DrillInvoice[] | undefined;
  onClose: () => void;
}) {
  const t = useT();
  const lifecycle = PROTOTYPE_ROUTE['Lifecycle.dc.html'];
  return (
    <Card padded={false} aria-label={t('下钻')}>
      <div className={styles.tableHead}>
        <h2 className={styles.h2Lg}>{t('下钻：' + stateLabel)}</h2>
        {rows ? (
          <span className={styles.desc}>{t(scopeName + ' · ' + period + ' · 示例 ' + rows.length + ' 张')}</span>
        ) : null}
        <div className={styles.spacer} />
        <Button onClick={onClose}>{t('收起')}</Button>
      </div>
      <div className={styles.tableTop}>
        {rows ? (
          <Table hoverRows className={`${styles.tbl} ${styles.tblDrill}`}>
            <thead>
              <tr>
                <th>{t('发票')}</th>
                <th>{t('国家 / 法人')}</th>
                <th>{t('供应商')}</th>
                <th>{t('税种')}</th>
                <th className={styles.right}>{t('税额')}</th>
                <th>{t('申报期')}</th>
                <th>{t('状态原因')}</th>
                <th aria-label={t('生命周期')} />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.no}>
                  <td className="mono" translate="no">
                    {d.no}
                  </td>
                  <td>{t(d.country)}</td>
                  <td>{t(d.supplier)}</td>
                  <td>{t(d.tax)}</td>
                  <td className={`num ${styles.right}`} translate="no">
                    {d.amount}
                  </td>
                  <td>{t(d.period)}</td>
                  <td className={`${styles.wrap} ${styles.soft}`}>{t(d.reason)}</td>
                  <td>
                    <Link to={lifecycle}>{t('生命周期')}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className={styles.loadingRow}>
            <Spinner label={t('加载中')} />
          </div>
        )}
      </div>
    </Card>
  );
}
