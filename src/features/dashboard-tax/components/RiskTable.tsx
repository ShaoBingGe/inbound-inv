import { Card, Table } from '@/components/ui';
import { useT } from '@/i18n';
import type { TaxRisk } from '../types';
import styles from '../TaxDashboardPage.module.css';

export function RiskTable({ risks }: { risks: TaxRisk[] }) {
  const t = useT();
  return (
    <Card padded={false} className={styles.colNarrow} aria-label={t('风险')}>
      <div className={styles.tableHeadCompact}>
        <h2 className={styles.h2}>{t('税务风险清单')}</h2>
        <span className={styles.desc}>{t('按金额排序')}</span>
      </div>
      <div className={styles.tableTop}>
        <Table hoverRows className={`${styles.tbl} ${styles.tblRisk}`}>
          <thead>
            <tr>
              <th>{t('风险')}</th>
              <th className={styles.right}>{t('张数')}</th>
              <th className={styles.right}>{t('涉及税额')}</th>
              <th>{t('处置')}</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.name}>
                <td className={styles.wrap}>
                  <div className={styles.cellName}>{t(r.name)}</div>
                  <div className={styles.cellSub}>{t(r.sub)}</div>
                </td>
                <td className={`num ${styles.right}`}>{r.count}</td>
                <td className={`num ${styles.right} ${styles.neg}`}>{t('CNY ' + r.amount.toFixed(1) + ' 万')}</td>
                <td className={`${styles.wrap} ${styles.action}`}>{t(r.action)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
