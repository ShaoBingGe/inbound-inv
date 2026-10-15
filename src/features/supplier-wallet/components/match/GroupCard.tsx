import { Link } from 'react-router-dom';
import { Button, Chip, Icon } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { VERDICT_META } from '../../match/data';
import { cny, rateTone, type CardModel } from '../../match/logic';
import type { DraftGroup, MatchGroup } from '../../match/types';
import s from './match.module.css';

const ZONE_DOT = { manual: 'orange', auto: 'green', done: 'purple' } as const;

/** 匹配组卡片：编号、组织、供应商、发票匹配率、两侧金额与操作 */
export function GroupCard({
  g,
  m,
  busy,
  onAdjust,
  onManual,
  onConfirm,
}: {
  g: MatchGroup;
  m: CardModel;
  busy: boolean;
  onAdjust: () => void;
  onManual: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  const meta = VERDICT_META[m.verdict];
  const confirmed = m.verdict === 'confirmed';
  const tone = rateTone(m.lineRate);
  const rec = (a: CardModel['recAction']) => (m.recAction === a ? 'primary' : 'default');
  return (
    <article className={s.card} aria-label={g.mg}>
      <div className={s.cardHead}>
        <span className={s.cardId}>
          <span className={cx(s.dot, s[`dot_${ZONE_DOT[m.zone]}`])} aria-hidden="true" />
          <span className={cx('mono', s.ellipsis)}>{g.mg}</span>
        </span>
        <Chip tone={meta.tone}>{t(meta.label)}</Chip>
      </div>
      <div className={cx(s.route, s.ellipsis)}>
        <span translate="no">
          {g.sup} → {g.buyer}
        </span>{' '}
        · <span className="mono">{confirmed ? g.ap : t(g.inv)}</span>
      </div>

      <div className={s.rateBox}>
        <div>
          <div className={s.rateLabel}>{t('发票匹配率')}</div>
          <div className={s.rateSub}>{t('按匹配行 / 总行数')}</div>
        </div>
        <div className={cx('num', s.rateVal, s[`ink_${tone}`])}>
          <span>{m.lineRate}%</span>
          <span>
            {m.matchedRows} / {m.totalRows} {t('明细行')}
          </span>
        </div>
      </div>

      <div className={s.pair}>
        <div className={s.pairBox}>
          <div className={s.pairLabel}>
            {t('发票')} · {g.invDocs}
          </div>
          <div className={cx('num', s.pairAmt)}>{cny(g.invAmt)}</div>
        </div>
        <span className={s.pairArrow} aria-hidden="true">
          ⇄
        </span>
        <div className={s.pairBox}>
          <div className={s.pairLabel}>
            {t('入库单')} · {g.inbDocs}
          </div>
          <div className={cx('num', s.pairAmt)}>{cny(g.inbAmt)}</div>
        </div>
      </div>

      <div className={s.cardActions}>
        {m.zone === 'manual' ? (
          <Button size="sm" variant={rec('adjust')} onClick={onAdjust} disabled={busy}>
            {t('调整策略')}
          </Button>
        ) : null}
        {m.zone !== 'done' ? (
          <Button size="sm" variant={rec('manual')} onClick={onManual} disabled={busy}>
            {t('手工匹配')}
          </Button>
        ) : null}
        {m.zone === 'auto' ? (
          <Button size="sm" variant={rec('confirm')} onClick={onConfirm} disabled={busy}>
            {t('确认匹配')}
          </Button>
        ) : null}
        {confirmed ? (
          <Button size="sm" onClick={onConfirm} icon={<Icon name="file" size={14} />}>
            {t('查看应付单')}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

/** 手工新增、待打开匹配详情确认的匹配组 */
export function DraftCard({ d }: { d: DraftGroup }) {
  const t = useT();
  return (
    <Link className={s.draftCard} to={ROUTES.matchWorkbench(d.id)}>
      <div className={s.cardHead}>
        <span className={cx('mono', s.cardId)}>{d.id}</span>
        <Chip tone="purple">{t('匹配中')}</Chip>
      </div>
      <div className={s.pair}>
        <div className={s.pairBox}>
          <div className={s.pairLabel}>
            {t('发票')} · {d.invDocs.length}
          </div>
          <div className={cx('num', s.pairAmt)}>{cny(d.invAmt)}</div>
        </div>
        <span className={s.pairArrow} aria-hidden="true">
          ⇄
        </span>
        <div className={s.pairBox}>
          <div className={s.pairLabel}>
            {t('入库单')} · {d.inbDocs.length}
          </div>
          <div className={cx('num', s.pairAmt)}>{cny(d.inbAmt)}</div>
        </div>
      </div>
    </Link>
  );
}
