import { ButtonLink, Card, Segmented, Table } from '@/components/ui';
import { PROTOTYPE_ROUTE } from '@/app/routes';
import { useT } from '@/i18n';
import type { CountrySort, CountryTaxRow } from '../types';
import { fmtCount, fmtDelta, fmtW } from '../format';
import styles from '../TaxDashboardPage.module.css';

const SORTS: Array<[CountrySort, string]> = [
  ['net', '按净额'],
  ['pend', '按待认证'],
  ['risk', '按风险'],
];

const sortValue = (r: CountryTaxRow, k: CountrySort) =>
  k === 'net' ? r.net : k === 'risk' ? r.riskCount : r.pendingAmount;

function filingColor(p: number): string {
  return p >= 90 ? 'var(--green-ink)' : p >= 50 ? 'var(--accent)' : 'var(--tb-withheld)';
}

export function CountryTable({
  rows,
  sort,
  onSort,
}: {
  rows: CountryTaxRow[];
  sort: CountrySort;
  onSort: (s: CountrySort) => void;
}) {
  const t = useT();
  const sorted = [...rows].sort((a, b) => sortValue(b, sort) - sortValue(a, sort));
  const lifecycle = PROTOTYPE_ROUTE['Lifecycle.dc.html'];
  return (
    <Card padded={false} aria-label={t('按国家')}>
      <div className={styles.tableHead}>
        <h2 className={styles.h2Lg}>{t('按国家 / 法人 · 申报进度与风险')}</h2>
        <span className={styles.desc}>{t('同比口径：相同法人、相同税种；逆向冲减已扣除')}</span>
        <div className={styles.spacer} />
        <Segmented
          ariaLabel={t('排序')}
          value={sort}
          onChange={onSort}
          options={SORTS.map(([value, label]) => ({ value, label: t(label) }))}
        />
      </div>
      <div className={styles.tableTop}>
        <Table hoverRows className={`${styles.tbl} ${styles.tblCountry}`}>
          <thead>
            <tr>
              <th>{t('国家 / 法人')}</th>
              <th>{t('税制')}</th>
              <th className={styles.right}>{t('进项税净额')}</th>
              <th className={styles.right}>{t('同比')}</th>
              <th className={styles.right}>{t('逆向冲减')}</th>
              <th className={styles.right}>{t('待认证 / 待匹配')}</th>
              <th>{t('申报期')}</th>
              <th>{t('申报进度')}</th>
              <th className={styles.right}>{t('风险发票')}</th>
              <th aria-label={t('查看发票')} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.code}>
                <td>
                  <div className={styles.cellName}>{t(r.name)}</div>
                  <div className={styles.cellSub}>{t(r.entities)}</div>
                </td>
                <td className={styles.soft}>{t(r.regime)}</td>
                <td className={`num ${styles.right}`}>{t('CNY ' + fmtW(r.net))}</td>
                <td className={`num ${styles.right}`}>{r.net ? fmtDelta(r.yoy) : '—'}</td>
                <td className={`num ${styles.right} ${styles.neg}`}>{r.rev ? t('−CNY ' + fmtW(r.rev)) : '—'}</td>
                <td className={`num ${styles.right}`} style={{ color: r.pendingCount > 150 ? 'var(--red-ink)' : 'var(--ink)' }}>
                  {r.pendingCount ? t(fmtCount(r.pendingCount) + ' 张 · ' + fmtW(r.pendingAmount)) : '—'}
                </td>
                <td className={styles.soft}>{t(r.filingPeriod)}</td>
                <td>
                  <div className={styles.filing}>
                    <div className={styles.filingTrack}>
                      <div className={styles.filingBar} style={{ width: `${r.filing}%`, background: filingColor(r.filing) }} />
                    </div>
                    <span className={`num ${styles.filingPct}`}>{r.filing + '%'}</span>
                  </div>
                </td>
                <td className={`num ${styles.right}`} style={{ color: r.riskCount >= 20 ? 'var(--red-ink)' : 'var(--ink)' }}>
                  {r.riskCount}
                </td>
                <td>
                  <ButtonLink to={lifecycle} size="sm" className={styles.rowBtn}>
                    {t('查看发票')}
                  </ButtonLink>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
