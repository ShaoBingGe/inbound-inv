import { Card, Chip, Icon } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { InvoiceLifecycle } from '../types';
import s from '../InvoiceLifecyclePage.module.css';

/** 正向与逆向流程关联：原票 → 红字 / Gutschrift / Credit memo 等逆向单据，以及净额 */
export function ReverseLinkPanel({ inv }: { inv: InvoiceLifecycle }) {
  const t = useT();
  const rev = inv.rev;
  return (
    <Card padded={false} className={s.col} aria-label={t('正逆向关联')}>
      <div className={s.blockHead}>
        <h2 className={s.blockTitleSm}>{t('正向与逆向流程关联')}</h2>
        <span className={s.blockDesc}>{t(rev.mech)}</span>
      </div>
      <div className={s.docList}>
        <div className={s.origDoc}>
          <div className={s.docHead}>
            <span className={s.docKind}>
              {t('原票 ·')} {t(inv.kind)}
            </span>
            <span className="mono" translate="no">
              {inv.no}
            </span>
          </div>
          <div className={cx('num', s.docLine)}>{t(rev.origLine)}</div>
        </div>
        {rev.docs.map((d) => (
          <div key={d.no} className={s.revRow}>
            <div className={s.revConnector} aria-hidden="true">
              <div className={s.revConnectorLine} />
              <Icon d="M12 5v14M6 13l6 6 6-6" size={14} strokeWidth={2} />
            </div>
            <div className={s.revDoc}>
              <div className={s.docHead}>
                <span className={s.revKind}>{t(d.kind)}</span>
                <span className="mono" translate="no">
                  {d.no}
                </span>
              </div>
              <div className={cx('num', s.docLine)}>{t(d.line)}</div>
              <div className={s.revEffect}>{t(d.effect)}</div>
              <div className={s.revChips}>
                <Chip tone={d.tone}>{t(d.st)}</Chip>
                <Chip tone="gray">{t(d.link)}</Chip>
              </div>
            </div>
          </div>
        ))}
        {rev.docs.length === 0 ? (
          <div className={s.revNone}>
            {t('尚无逆向单据。若需冲减：')}
            {t(rev.how ?? '')}
          </div>
        ) : null}
      </div>
      <div className={s.netBox}>
        <div className="kick">{t('净额')}</div>
        <div className={cx('num', s.netLine)}>
          <span>
            {t('原票')} <b>{rev.gross}</b>
          </span>
          <span>
            {t('逆向冲减')} <b className={s.netNeg}>{rev.reduced}</b>
          </span>
          <span>
            {t('净额')} <b>{rev.net}</b>
          </span>
          <span>
            {t('进项税净额')} <b>{rev.netTax}</b>
          </span>
        </div>
        <div className={s.netRule}>{t(rev.linkRule)}</div>
      </div>
    </Card>
  );
}
