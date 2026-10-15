import { Button, Chip, Input, Table, type Tone } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { FieldRight, PortalInvoice } from '../types';
import s from './portal.module.css';

/** 字段更正权限：文案 + 色调 */
const RIGHT: Record<FieldRight, [string, Tone]> = {
  own: ['可直接更正', 'green'],
  review: ['可标注，买方复核', 'orange'],
  lock: ['不得更正', 'red'],
};

/** 选中发票的识别结果：逐字段展示置信度与更正权限，可填写建议值并标注 */
export function RecognitionDetail({
  inv,
  steps,
  sugg,
  marked,
  sent,
  sending,
  onSugg,
  onToggleMark,
  onSend,
}: {
  inv: PortalInvoice;
  steps: string[];
  /** 键为 发票号 + 字段 key */
  sugg: Record<string, string>;
  marked: Record<string, boolean>;
  sent: boolean;
  sending: boolean;
  onSugg: (k: string, v: string) => void;
  onToggleMark: (k: string) => void;
  onSend: () => void;
}) {
  const t = useT();
  const marks = inv.fields.filter((f) => marked[inv.no + f.key]).length;
  return (
    <div className={s.detail}>
      <div className={s.detailHead}>
        <span className={s.detailTitle}>
          {t('识别结果 ·')}{' '}
          <span className="mono" translate="no">
            {inv.no}
          </span>
        </span>
        <span className={s.muted}>{t('当前环节：' + steps[inv.stage] + '；您标注的错误会进入买方的数据修正队列')}</span>
      </div>
      <div className={s.detailTable}>
        <Table className={s.fieldTable}>
          <thead>
            <tr>
              <th>{t('字段')}</th>
              <th>{t('系统识别')}</th>
              <th className={s.right}>{t('置信度')}</th>
              <th>{t('您能否更正')}</th>
              <th className={s.markCol}>{t('标注 / 建议值')}</th>
            </tr>
          </thead>
          <tbody>
            {inv.fields.map((f) => {
              const k = inv.no + f.key;
              const m = !!marked[k];
              const lock = f.right === 'lock';
              const [right, tone] = RIGHT[f.right];
              const label = t(f.label);
              return (
                <tr key={f.key}>
                  <td>{label}</td>
                  <td className="mono">{t(f.value)}</td>
                  <td
                    className={cx('num', s.right)}
                    style={{ color: f.conf < 0.7 ? 'var(--red-ink)' : 'var(--ink)' }}
                  >
                    {f.conf ? Math.round(f.conf * 100) + '%' : t('未识别')}
                  </td>
                  <td>
                    <Chip tone={tone}>{t(right)}</Chip>
                    <div className={s.why}>{t(f.why)}</div>
                  </td>
                  <td>
                    {!lock ? (
                      <div className={s.markRow}>
                        <Input
                          className={cx('mono', s.markInput)}
                          value={sugg[k] ?? ''}
                          onChange={(e) => onSugg(k, e.target.value)}
                          aria-label={`${label} ${t('建议值')}`}
                          placeholder={t('正确值')}
                        />
                        <Button onClick={() => onToggleMark(k)} aria-pressed={m}>
                          {t(m ? '已标注' : f.right === 'own' ? '更正' : '标注错误')}
                        </Button>
                      </div>
                    ) : (
                      <span className={s.muted}>
                        {t(
                          f.key === 'iban' || f.key === 'bank'
                            ? '如需变更，请提交银行账户变更申请（双人复核 + 电话回拨）'
                            : '如票面有误，请开具更正票据',
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      <div className={s.detailFoot}>
        <span className={s.ink2}>{marks ? t('已标注 ' + marks + ' 个字段') : t('尚未标注')}</span>
        <div className={s.spacer} />
        <Button variant="primary" onClick={onSend} disabled={sending}>
          {t('提交标注')}
        </Button>
      </div>
      {sent ? (
        <div role="status" className={s.sentNote}>
          {t('已提交给买方 AP 团队复核。复核通过后更正生效，结果在此同步；被确认的识别错误会改进您这类票据的识别。')}
        </div>
      ) : null}
    </div>
  );
}
