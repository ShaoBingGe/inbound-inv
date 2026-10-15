import { Link } from 'react-router-dom';
import { Table } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { RbacRow } from '../types';
import s from '../DataOpsPage.module.css';

/** 主数据中心：全球汇总与看板（同步范围 + 看板可见范围） */
export function GlobalTab({ syncIn, syncOut, rbac }: { syncIn: string[]; syncOut: string[]; rbac: RbacRow[] }) {
  const t = useT();
  return (
    <>
      <div className={s.syncGrid}>
        <div className={s.syncBox}>
          <div className={s.strong}>{t('同步到主数据中心的内容')}</div>
          <ul className={s.syncList}>
            {syncIn.map((x) => (
              <li key={x} className={s.syncItem}>
                <span className={s.markIn} aria-hidden="true">
                  ✓
                </span>
                {t(x)}
              </li>
            ))}
          </ul>
        </div>
        <div className={s.syncBox}>
          <div className={s.strong}>{t('永不出境的内容')}</div>
          <ul className={s.syncList}>
            {syncOut.map((x) => (
              <li key={x} className={s.syncItem}>
                <span className={s.markOut} aria-hidden="true">
                  ×
                </span>
                {t(x)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={cx('kick', s.subKick)}>{t('看板可见范围')}</div>
      <div className={s.tableBox}>
        <Table className={s.minW640}>
          <thead>
            <tr>
              <th>{t('角色')}</th>
              <th>{t('全球统一看板')}</th>
              <th>{t('本国明细')}</th>
              <th>{t('他国明细')}</th>
            </tr>
          </thead>
          <tbody>
            {rbac.map((r) => (
              <tr key={r.role}>
                <td className={s.medium}>{t(r.role)}</td>
                <td>{t(r.g)}</td>
                <td>{t(r.own)}</td>
                <td>{t(r.other)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className={s.mt10}>
        <Link to={ROUTES.dashboardGlobal}>{t('打开全球统一看板')}</Link>
      </div>
    </>
  );
}
