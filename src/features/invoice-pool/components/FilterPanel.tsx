import { Button, Card, Chip, Field, Input, Select } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { PoolFilters } from '../types';
import s from '../InvoicePoolPage.module.css';

type TextKey = Exclude<keyof PoolFilters, 'status'>;

const REVIEW_OPTS: [string, string][] = [
  ['AP单', 'AP 单'],
  ['费控单', '费控单'],
];
const CHANNEL_OPTS = ['税局同步', '供应商门户', 'ERP 嵌入 H5', '邮箱采集', 'Peppol'];
const IND_OPTS = ['原材料', '电子元器件', '物流运输', '设备与模具', '专业服务', '差旅与行政'];
const FLAG_OPTS: [string, string][] = [
  ['any', '仅需关注'],
  ['rev', '有逆向单据'],
  ['due', '30 天内到期待付'],
];

export function FilterPanel({
  f,
  kinds,
  curCode,
  resultN,
  resultAmt,
  statusLabel,
  onChange,
  onReset,
  onExport,
  exporting,
}: {
  f: PoolFilters;
  kinds: string[];
  curCode: string;
  resultN: number;
  resultAmt: string;
  /** 已选状态卡片（简体中文原文），全部时为空 */
  statusLabel: string;
  onChange: (k: TextKey, v: string) => void;
  onReset: () => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const t = useT();
  const all = { value: '', label: t('全部') };
  return (
    <Card aria-label={t('筛选')}>
      <div className={s.filterGrid}>
        <Field label={t('关键字')} className={s.span2}>
          {(id) => (
            <Input
              id={id}
              value={f.q}
              onChange={(e) => onChange('q', e.target.value)}
              placeholder={t('发票号码 / 供应商 / 供应商编码 / PO / 单据号')}
            />
          )}
        </Field>
        <Field label={t('票种')}>
          {(id) => (
            <Select id={id} value={f.kind} onChange={(v) => onChange('kind', v)} options={[all, ...kinds.map((o) => ({ value: o, label: t(o) }))]} />
          )}
        </Field>
        <Field label={t('审核单据')}>
          {(id) => (
            <Select
              id={id}
              value={f.review}
              onChange={(v) => onChange('review', v)}
              options={[all, ...REVIEW_OPTS.map(([v, l]) => ({ value: v, label: t(l) }))]}
            />
          )}
        </Field>
        <Field label={t('采集渠道')}>
          {(id) => (
            <Select
              id={id}
              value={f.channel}
              onChange={(v) => onChange('channel', v)}
              options={[all, ...CHANNEL_OPTS.map((o) => ({ value: o, label: t(o) }))]}
            />
          )}
        </Field>
        <Field label={t('供应商行业')}>
          {(id) => (
            <Select id={id} value={f.ind} onChange={(v) => onChange('ind', v)} options={[all, ...IND_OPTS.map((o) => ({ value: o, label: t(o) }))]} />
          )}
        </Field>
        <Field label={t('价税合计 ≥')}>
          {(id) => (
            <Input id={id} className="num" value={f.amtMin} onChange={(e) => onChange('amtMin', e.target.value)} placeholder={curCode} inputMode="decimal" />
          )}
        </Field>
        <Field label={t('价税合计 ≤')}>
          {(id) => (
            <Input id={id} className="num" value={f.amtMax} onChange={(e) => onChange('amtMax', e.target.value)} placeholder={curCode} inputMode="decimal" />
          )}
        </Field>
        <Field label={t('开票日期 从')}>
          {(id) => <Input id={id} type="date" value={f.dFrom} onChange={(e) => onChange('dFrom', e.target.value)} />}
        </Field>
        <Field label={t('开票日期 至')}>
          {(id) => <Input id={id} type="date" value={f.dTo} onChange={(e) => onChange('dTo', e.target.value)} />}
        </Field>
        <Field label={t('标记')}>
          {(id) => (
            <Select id={id} value={f.flag} onChange={(v) => onChange('flag', v)} options={[all, ...FLAG_OPTS.map(([v, l]) => ({ value: v, label: t(l) }))]} />
          )}
        </Field>
      </div>
      <div className={s.filterFoot}>
        <span className={cx('num', s.resultLine)}>
          {t('筛选结果')} <b>{resultN}</b> {t('张')} · {t('价税合计')} <b>{resultAmt}</b>
        </span>
        {statusLabel ? (
          <Chip tone="blue">{t('状态：' + statusLabel)}</Chip>
        ) : null}
        <span className={s.grow} />
        <Button onClick={onReset}>{t('重置筛选')}</Button>
        <Button onClick={onExport} disabled={exporting}>
          {t('导出')}
        </Button>
      </div>
    </Card>
  );
}
