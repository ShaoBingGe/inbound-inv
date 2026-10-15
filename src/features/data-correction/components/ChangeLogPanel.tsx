import { Button, Card, Chip, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { CompensationEvent, FieldChange } from '../types';
import s from '../DataCorrectionPage.module.css';

const SCHEMAS = [
  { name: 'invoice_original', desc: '原件文件与影像，写入即封存，SHA-256 存证；任何角色不可修改或删除' },
  { name: 'invoice_parsed (id, ver)', desc: '每次生效的更正生成新版本快照；下游单据引用具体版本号' },
  { name: 'invoice_field_change', desc: '逐字段 before / after、来源、错误类型、操作人与复核人' },
  { name: 'compensation_event', desc: '下游补偿事件（撤回、冲销、红冲、差额），按 Saga 逐步执行，可追踪可重试' },
];

const COMP_STATUS: Record<CompensationEvent['status'], { label: string; tone: 'blue' | 'orange' }> = {
  running: { label: '执行中', tone: 'blue' },
  initiated: { label: '已发起', tone: 'orange' },
};

/** 后台数据记录：invoice_field_change（只追加）+ 表结构说明 + compensation_event */
export function ChangeLogPanel({
  log,
  comps,
  busy,
  onApprove,
}: {
  log: FieldChange[];
  comps: CompensationEvent[];
  busy: boolean;
  onApprove: (change: FieldChange) => void;
}) {
  const t = useT();
  return (
    <Card className={s.workCard} aria-label={t('后台数据记录')}>
      <div className={s.headRow}>
        <h2 className={s.h2}>{t('后台数据记录')}</h2>
        <span className={s.muted}>{t('表 invoice_field_change · 只追加，不更新，不删除')}</span>
      </div>
      <div className={cx(s.tableBox, s.tableBoxGap)}>
        <Table hoverRows wrapCells className={s.w980}>
          <thead>
            <tr>
              <th>change_id</th>
              <th>ver</th>
              <th>field</th>
              <th>before</th>
              <th>after</th>
              <th>source</th>
              <th>error_type</th>
              <th>operator</th>
              <th>reviewer</th>
              <th>status</th>
              <th>created_at</th>
            </tr>
          </thead>
          <tbody>
            {log.map((l) => (
              <tr key={l.cid}>
                <td className="mono">{l.cid}</td>
                <td className="mono">{l.ver}</td>
                <td className="mono">{l.field}</td>
                <td className={cx('mono', s.logBefore)} translate="no">
                  {l.before}
                </td>
                <td className={cx('mono', s.logAfter)} translate="no">
                  {l.after}
                </td>
                <td>{t(l.source)}</td>
                <td>{t(l.etype)}</td>
                <td>{t(l.op)}</td>
                <td>{t(l.rev)}</td>
                <td>
                  <Chip tone={l.status === 'applied' ? 'green' : 'orange'}>{l.status}</Chip>
                  {l.status === 'pending' ? (
                    <Button size="sm" className={s.approveBtn} disabled={busy} onClick={() => onApprove(l)}>
                      {t('复核通过')}
                    </Button>
                  ) : null}
                </td>
                <td className="mono num">{l.at}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className={s.schemaGrid}>
        {SCHEMAS.map((x) => (
          <div key={x.name} className={s.schemaCard}>
            <div className={cx('mono', s.schemaName)}>{x.name}</div>
            <div className={s.schemaDesc}>{t(x.desc)}</div>
          </div>
        ))}
      </div>

      <div className={s.mt14}>
        <div className={cx('kick', s.kickGap)}>{t('补偿事件 · compensation_event')}</div>
        <div className={s.tableBox}>
          <Table wrapCells className={s.w760}>
            <thead>
              <tr>
                <th>event_id</th>
                <th>{t('类型')}</th>
                <th>{t('Saga 步骤')}</th>
                <th>{t('对象')}</th>
                <th>{t('状态')}</th>
              </tr>
            </thead>
            <tbody>
              {comps.map((c) => (
                <tr key={c.eid}>
                  <td className="mono">{c.eid}</td>
                  <td>{t(c.type)}</td>
                  <td className={s.sub}>{t(c.steps)}</td>
                  <td className="mono">{c.obj}</td>
                  <td>
                    <Chip tone={COMP_STATUS[c.status].tone}>{t(COMP_STATUS[c.status].label)}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {comps.length === 0 ? <div className={s.noComps}>{t('本票暂无补偿事件。')}</div> : null}
      </div>
    </Card>
  );
}
