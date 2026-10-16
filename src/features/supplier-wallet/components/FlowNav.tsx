import type { ReactNode } from 'react';
import { Chip, Icon } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { MatchSummary } from '../match/types';
import s from './FlowNav.module.css';

export type WalletView = 'wallet' | 'match' | 'ap' | 'drugs';

export interface WalletStats {
  invoices: number;
  suppliers: number;
  /** 有 PO、进入三单匹配的发票 */
  po: number;
}

/**
 * 供应商票夹的流程导航：票夹收票 → 三单匹配 → 应付单，药品匹配关系作为匹配的知识库。
 * 每一步既是页签也是概况卡片，让三单匹配的入口和待处理量一眼可见。
 */
export function FlowNav({
  view,
  onView,
  wallet,
  match,
}: {
  view: WalletView;
  onView: (v: WalletView) => void;
  wallet: WalletStats | null;
  match: MatchSummary | null;
}) {
  const t = useT();
  const pending = match ? match.manual + match.auto + match.drafts : 0;
  const dash = '—';

  const step = (v: WalletView, no: string | null, title: string, body: ReactNode, extra?: ReactNode, cls?: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === v}
      className={cx(s.step, view === v && s.on, cls)}
      onClick={() => onView(v)}
    >
      <span className={s.head}>
        {no ? <span className={s.no}>{no}</span> : null}
        <span className={s.title}>{t(title)}</span>
        {extra}
      </span>
      {body}
    </button>
  );

  return (
    <nav className={s.flow} aria-label={t('供应商票夹流程')}>
      <div className={s.steps} role="tablist" aria-label={t('票夹视图')}>
        {step(
          'wallet',
          '1',
          '供应商票夹',
          <>
            <span className={cx('num', s.metric)}>
              {wallet ? wallet.invoices : dash} <small>{t('张发票')}</small> · {wallet ? wallet.suppliers : dash}{' '}
              <small>{t('家供应商')}</small>
            </span>
            <span className={s.sub}>{t('有 PO 的发票 ' + (wallet ? wallet.po : dash) + ' 张进入三单匹配')}</span>
          </>,
        )}
        <span className={s.arrow} aria-hidden="true">
          <Icon name="chevronRight" size={18} />
        </span>
        {step(
          'match',
          '2',
          '三单匹配',
          <>
            <span className={cx('num', s.metric)}>
              {t('未完全')} <b className={s.warn}>{match ? match.manual : dash}</b> · {t('待确认')}{' '}
              <b className={s.ok}>{match ? match.auto : dash}</b> · {t('已确认')} {match ? match.done : dash}
            </span>
            <span className={s.sub}>
              {t(
                '未匹配发票 ' +
                  (match ? match.unmatchedInvoices : dash) +
                  ' 张 · 待匹配入库单 ' +
                  (match ? match.pendingInbounds : dash) +
                  ' 单',
              )}
            </span>
            {view !== 'match' ? (
              <span className={s.cta}>
                {t('进入三单匹配')}
                <Icon name="chevronRight" size={14} />
              </span>
            ) : null}
          </>,
          pending ? (
            <Chip tone="orange" className={s.badge}>
              <span className={s.pulse} aria-hidden="true" />
              {t(pending + ' 组待处理')}
            </Chip>
          ) : null,
          s.primary,
        )}
        <span className={s.arrow} aria-hidden="true">
          <Icon name="chevronRight" size={18} />
        </span>
        {step(
          'ap',
          '3',
          '应付单',
          <>
            <span className={cx('num', s.metric)}>
              {match ? match.payables : dash} <small>{t('张')}</small>
            </span>
            <span className={s.sub}>{t('确认匹配或下推后生成，仅查询')}</span>
          </>,
        )}
        <span className={s.sep} aria-hidden="true" />
        {step(
          'drugs',
          null,
          '药品匹配关系',
          <>
            <span className={cx('num', s.metric)}>
              {match ? match.drugs : dash} <small>{t('个物料')}</small> · {t('匹配率')}{' '}
              {match ? `${match.drugRate}%` : dash}
            </span>
            <span className={s.sub}>{t('智能匹配（向量化）的品规与换算依据')}</span>
          </>,
          <Chip tone="gray">{t('知识库')}</Chip>,
          s.kb,
        )}
      </div>
    </nav>
  );
}
