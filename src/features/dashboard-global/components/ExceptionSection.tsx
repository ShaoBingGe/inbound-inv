import { Button, ButtonLink, Card, Chip, Segmented, Table } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { BAD, INK } from '../model';
import type { ExcInvoice, ExcTab } from '../types';
import s from '../GlobalDashboardPage.module.css';

export const isTimeout = (e: ExcInvoice) => e.dur > 30;
export const isHighErr = (e: ExcInvoice) => e.errN / e.tot >= 0.2;

/** 需关注的单张发票（识别超时 / 识别误差率高） */
export function ExceptionSection({
  items,
  tab,
  onTab,
  onOpen,
}: {
  items: ExcInvoice[];
  tab: ExcTab;
  onTab: (t: ExcTab) => void;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const list = items.filter((e) => (tab === 'timeout' ? isTimeout(e) : isHighErr(e)));
  return (
    <Card padded={false} aria-label={t('识别异常发票')}>
      <div className={s.headBar}>
        <h2 className={s.h2}>{t('需关注的单张发票')}</h2>
        <Segmented<ExcTab>
          ariaLabel={t('异常类型')}
          value={tab}
          onChange={onTab}
          options={[
            { value: 'timeout', label: t('识别超时') },
            { value: 'err', label: t('识别误差率高') },
          ]}
        />
        <span className={s.muted}>{tab === 'timeout' ? t('识别耗时 > 30 秒') : t('被更正字段 ≥ 20%')}</span>
        <div className={s.spacer} />
        <ButtonLink to={ROUTES.dataCorrection}>{t('打开发票数据修正页')}</ButtonLink>
      </div>
      <div className={s.tableTop}>
        <Table hoverRows className={s.excTable}>
          <thead>
            <tr>
              <th>{t('发票')}</th>
              <th>{t('国家')}</th>
              <th>{t('供应商')}</th>
              <th>{t('票种 / 来源')}</th>
              <th className={s.end}>{t('识别时长')}</th>
              <th className={s.end}>{t('被更正字段')}</th>
              <th className={s.end}>{t('字段误差率')}</th>
              <th>{t('当前环节')}</th>
              <th>{t('原因')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td>
                  <button type="button" className={cx('mono', s.idBtn)} onClick={() => onOpen(e.id)} translate="no">
                    {e.id}
                  </button>
                </td>
                <td>{t(e.country)}</td>
                <td translate="no">{e.sup}</td>
                <td>{t(e.kind)}</td>
                <td className={cx('num', s.end)} style={{ color: isTimeout(e) ? BAD : INK }}>
                  {t(e.dur.toFixed(1) + ' 秒')}
                </td>
                <td className={cx('num', s.end)}>{e.errN + ' / ' + e.tot}</td>
                <td className={cx('num', s.end)} style={{ color: isHighErr(e) ? BAD : INK }}>
                  {((e.errN / e.tot) * 100).toFixed(1) + '%'}
                </td>
                <td>
                  <Chip tone="gray">{t(e.stage)}</Chip>
                </td>
                <td className={s.why}>{t(e.why)}</td>
                <td>
                  <Button onClick={() => onOpen(e.id)}>{t('查看')}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
