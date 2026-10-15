import { Link } from 'react-router-dom';
import { Button, Card, Chip, LinkButton, Table } from '@/components/ui';
import { PROTOTYPE_ROUTE } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { AP_LABEL, EXP_LABEL, MATCH_LABEL } from '../data';
import { effective, errPct, isHighErr, routeLabel } from '../helpers';
import type { InvoiceOverride, WalletInvoice, WalletSupplier } from '../types';
import styles from '../SupplierWalletPage.module.css';

export function InvoiceTable({
  supplier,
  selectedInv,
  over,
  onOpen,
}: {
  supplier: WalletSupplier;
  selectedInv: string | null;
  over: Record<string, InvoiceOverride>;
  onOpen: (inv: WalletInvoice) => void;
}) {
  const t = useT();
  return (
    <Card padded={false} className={styles.invCard} aria-label={t('供应商发票')}>
      <div className={styles.invHead}>
        <h2 className={styles.h2}>{t(supplier.name)}</h2>
        <span className={styles.invMeta}>
          {t(supplier.code + ' · ' + supplier.ind + ' · ' + supplier.invs.length + ' 张发票')}
        </span>
        <Link className={styles.invHeadLink} to={PROTOTYPE_ROUTE['Portal.dc.html']}>
          {t('在供应商门户查看')}
        </Link>
      </div>
      <div className={styles.tableTop}>
        <Table hoverRows className={styles.invTable}>
          <thead>
            <tr>
              <th>{t('发票')}</th>
              <th>{t('日期')}</th>
              <th className={styles.r}>{t('金额')}</th>
              <th className={styles.r}>{t('识别误差')}</th>
              <th>{t('路由')}</th>
              <th>{t('三单匹配')}</th>
              <th>{t('AP 自动化')}</th>
              <th>{t('费控')}</th>
              <th aria-label={t('查看')} />
            </tr>
          </thead>
          <tbody>
            {supplier.invs.map((i) => {
              const e = effective(i, over);
              const pct = errPct(i);
              const m = MATCH_LABEL[e.m];
              const ap = AP_LABEL[e.ap];
              const ex = EXP_LABEL[e.ex];
              return (
                <tr key={i.no} className={selectedInv === i.no ? styles.rowOn : undefined}>
                  <td>
                    <LinkButton className="mono" onClick={() => onOpen(i)}>
                      {i.no}
                    </LinkButton>
                    <div className={styles.kindSub}>{t(i.kind)}</div>
                  </td>
                  <td className="num">{i.date}</td>
                  <td className={cx('num', styles.r)}>{i.amt}</td>
                  <td className={cx('num', styles.r, isHighErr(pct) && styles.bad)}>{pct.toFixed(1)}%</td>
                  <td>{t(routeLabel(i.route))}</td>
                  <td>
                    <Chip tone={m.tone}>{t(m.label)}</Chip>
                  </td>
                  <td>
                    <Chip tone={ap.tone}>{t(ap.label)}</Chip>
                  </td>
                  <td>
                    <Chip tone={ex.tone}>{t(ex.label)}</Chip>
                  </td>
                  <td>
                    <Button onClick={() => onOpen(i)}>{t('查看')}</Button>
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
