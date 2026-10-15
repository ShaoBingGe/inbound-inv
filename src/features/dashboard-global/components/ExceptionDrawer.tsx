import { Button, ButtonLink, Chip, Drawer, Table } from '@/components/ui';
import { PROTOTYPE_ROUTE, ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { BAD, FIELD_STATUS, INK } from '../model';
import type { ExcInvoice } from '../types';
import { isHighErr, isTimeout } from './ExceptionSection';
import s from '../GlobalDashboardPage.module.css';

/** 发票识别详情抽屉：耗时分解、字段识别与更正，跳转修正 / 生命周期 / 回流样本 */
export function ExceptionDrawer({ inv, onClose }: { inv: ExcInvoice | null; onClose: () => void }) {
  const t = useT();
  if (!inv) return null;
  const tmax = Math.max(...inv.timing.map((x) => x.s));
  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      title={
        <div className={s.detHead}>
          <div className="kick">
            {t(inv.country)} · {t(inv.kind)}
          </div>
          <div className={cx('mono', s.detId)} translate="no">
            {inv.id}
          </div>
          <div className={s.detSup} translate="no">
            {inv.sup}
          </div>
        </div>
      }
      footer={
        <div className={s.detFoot}>
          <ButtonLink variant="primary" to={ROUTES.dataCorrection}>
            {t('进入发票数据修正页')}
          </ButtonLink>
          <ButtonLink to={PROTOTYPE_ROUTE['Lifecycle.dc.html'] ?? ROUTES.poolEnterprise}>{t('全生命周期')}</ButtonLink>
          <ButtonLink to={ROUTES.dataRules}>{t('查看回流样本')}</ButtonLink>
          <div className={s.spacer} />
          <Button onClick={onClose}>{t('关闭')}</Button>
        </div>
      }
    >
      <div className={cx(s.palette, s.detBody)}>
        <h2 className="sr-only">{t('发票识别详情')}</h2>
        <div className={s.detStats}>
          <div className={s.detStat}>
            <div className="kick">{t('识别时长')}</div>
            <div className={cx('num', s.detStatValue)} style={{ color: isTimeout(inv) ? BAD : INK }}>
              {t(inv.dur.toFixed(1) + ' 秒')}
            </div>
          </div>
          <div className={s.detStat}>
            <div className="kick">{t('字段误差率')}</div>
            <div className={cx('num', s.detStatValue)} style={{ color: isHighErr(inv) ? BAD : INK }}>
              {((inv.errN / inv.tot) * 100).toFixed(1) + '%'}
            </div>
          </div>
          <div className={s.detStat}>
            <div className="kick">{t('当前环节')}</div>
            <div className={s.detStatText}>{t(inv.stage)}</div>
          </div>
        </div>

        <div>
          <div className={s.detTitle}>{t('耗时分解')}</div>
          <div className={s.timing}>
            {inv.timing.map((x) => (
              <div key={x.label} className={s.timingRow}>
                <span>{t(x.label)}</span>
                <div className={s.timingTrack}>
                  <div
                    className={s.timingFill}
                    style={{
                      width: `${((x.s / tmax) * 100).toFixed(1)}%`,
                      background: x.s === tmax ? 'var(--alert)' : 'var(--gd-timing)',
                    }}
                  />
                </div>
                <span className={cx('num', s.end)}>{x.s.toFixed(1) + 's'}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className={s.detTitle}>{t('字段识别与更正')}</div>
          <div className={s.fieldBox}>
            <Table>
              <thead>
                <tr>
                  <th>{t('字段')}</th>
                  <th>{t('OCR 原值')}</th>
                  <th>{t('当前值')}</th>
                  <th className={s.end}>{t('置信度')}</th>
                  <th>{t('状态')}</th>
                </tr>
              </thead>
              <tbody>
                {inv.fields.map((f) => {
                  const st = FIELD_STATUS[f.status];
                  return (
                    <tr key={f.label}>
                      <td>{t(f.label)}</td>
                      <td className={cx('mono', f.ocr !== f.cur && s.ocrWrong)} translate="no">
                        {f.ocr}
                      </td>
                      <td className="mono" translate="no">
                        {f.cur}
                      </td>
                      <td className={cx('num', s.end)}>{f.conf ? (f.conf * 100).toFixed(0) + '%' : t('漏识')}</td>
                      <td>
                        <Chip tone={st.tone}>{t(st.label)}</Chip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </div>

        <div className={s.detWhy}>{t(inv.why)}</div>
      </div>
    </Drawer>
  );
}
