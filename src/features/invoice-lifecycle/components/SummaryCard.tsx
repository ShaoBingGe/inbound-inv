import { Card, Chip } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { InvoiceLifecycle } from '../types';
import s from '../InvoiceLifecyclePage.module.css';

/** 发票概要：国家 · 税制 · 票种、供应商、票号、渠道 / 法人 / 数据中心 / 规则版本 / 状态与关键金额 */
export function SummaryCard({ inv }: { inv: InvoiceLifecycle }) {
  const t = useT();
  return (
    <Card padded={false} className={s.summary} aria-label={t('发票概要')}>
      <div className={s.summaryRow}>
        <div className={s.summaryMain}>
          <div className="kick">
            {t(inv.country)} · {t(inv.regime)} · {t(inv.kind)}
          </div>
          <div className={s.supplier} translate="no">
            {inv.sup}
          </div>
          <div className={cx('mono', s.invNo)} translate="no">
            {inv.no}
          </div>
          <div className={s.chips}>
            <Chip tone="blue">
              {t('渠道：')}
              {t(inv.ch)}
            </Chip>
            <Chip tone="gray">
              {t('法人：')}
              {t(inv.entity)}
            </Chip>
            <Chip tone="gray">
              {t('数据中心：')}
              {inv.dc}
            </Chip>
            <Chip tone="purple">
              {t('规则版本：')}
              {inv.ruleVer}
            </Chip>
            <Chip tone={inv.statusTone}>{t(inv.status)}</Chip>
          </div>
        </div>
        <div className={s.facts}>
          {inv.facts.map((f) => (
            <div key={f.k} className={s.fact}>
              <div className="kick">{t(f.k)}</div>
              <div className={cx('num', s.factValue, f.good && s.factGood)}>{t(f.v)}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
