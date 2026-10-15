import { Button, Card, Chip, Segmented, Table, type Tone } from '@/components/ui';
import { useT } from '@/i18n';
import type { CorrectionRecord, CorrectionStatus } from '../types';
import s from '../DataRecognitionPage.module.css';

export type RecordFilter = 'all' | CorrectionStatus;

const STATUS_META: Record<CorrectionStatus, { label: string; tone: Tone }> = {
  accepted: { label: '已采纳', tone: 'green' },
  pending: { label: '待核验', tone: 'blue' },
  rejected: { label: '已驳回', tone: 'orange' },
  dispute: { label: '争议', tone: 'red' },
};

const FILTERS: Array<[RecordFilter, string]> = [
  ['all', '全部'],
  ['pending', '待核验'],
  ['accepted', '已采纳'],
  ['dispute', '争议'],
  ['rejected', '已驳回'],
];

/** 修正记录与血缘 */
export function CorrectionRecords({
  records,
  filter,
  onFilter,
  onBatchVerify,
  onAct,
  busy,
}: {
  records: CorrectionRecord[];
  filter: RecordFilter;
  onFilter: (f: RecordFilter) => void;
  onBatchVerify: () => void;
  onAct: (r: CorrectionRecord) => void;
  /** 正在处理的修正 ID（或 '*' 表示批量） */
  busy: string | null;
}) {
  const t = useT();
  const count = (k: RecordFilter) => (k === 'all' ? records.length : records.filter((r) => r.status === k).length);
  const rows = records.filter((r) => filter === 'all' || r.status === filter);
  return (
    <Card padded={false} aria-label={t('修正记录')}>
      <div className={s.recHead}>
        <h2 className={s.h2}>{t('修正记录与血缘')}</h2>
        <Segmented
          ariaLabel={t('筛选')}
          value={filter}
          onChange={onFilter}
          options={FILTERS.map(([k, l]) => ({
            value: k,
            label: (
              <>
                {t(l)} <span className={`num ${s.filterCount}`}>{count(k)}</span>
              </>
            ),
          }))}
        />
        <div className={s.spacer} />
        <Button onClick={onBatchVerify} disabled={busy !== null}>
          {t('对待核验条目运行核验 Agent')}
        </Button>
      </div>
      <div className={s.recTable}>
        <Table hoverRows wrapCells style={{ minWidth: 1180 }}>
          <thead>
            <tr>
              <th>{t('修正 ID')}</th>
              <th>{t('发票 / 国家 / 渠道')}</th>
              <th>{t('字段')}</th>
              <th>{t('修正前 → 修正后')}</th>
              <th>{t('修正人')}</th>
              <th>{t('核验')}</th>
              <th>{t('清洗')}</th>
              <th>{t('去向')}</th>
              <th>{t('状态')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = STATUS_META[r.status];
              const canAct = r.status === 'pending' || r.status === 'dispute';
              return (
                <tr key={r.id}>
                  <td className={`mono ${s.nowrap}`} translate="no">
                    {r.id}
                  </td>
                  <td>
                    <div className={`mono ${s.small} ${s.nowrap}`} translate="no">
                      {r.invoiceId}
                    </div>
                    <div className={s.smallMuted}>
                      {t(r.country)} · {t(r.channel)}
                    </div>
                  </td>
                  <td>{t(r.field)}</td>
                  <td className={`mono ${s.small}`} translate="no">
                    <span className={s.before}>{r.before}</span> → <span className={s.after}>{r.after}</span>
                  </td>
                  <td>
                    <div>{t(r.who)}</div>
                    <div className={s.tinyMuted}>
                      {t('信任分')} {r.trust}
                    </div>
                  </td>
                  <td className={s.smallSoft}>{t(r.verify)}</td>
                  <td className={s.smallSoft}>{t(r.clean)}</td>
                  <td>
                    <Chip tone={r.toTone}>{t(r.to)}</Chip>
                  </td>
                  <td className={s.nowrap}>
                    <Chip tone={meta.tone}>{t(meta.label)}</Chip>
                  </td>
                  <td className={s.nowrap}>
                    {canAct ? (
                      <Button className={s.actBtn} onClick={() => onAct(r)} disabled={busy !== null}>
                        {r.status === 'dispute' ? t('转 AP 复核') : t('运行核验')}
                      </Button>
                    ) : null}
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
