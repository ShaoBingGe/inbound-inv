import { Button, Card, Chip, Field, Select, Table, type Tone } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { RunModel, RunSplit, TestRun } from '../types';
import s from '../DataRulesPage.module.css';

const MODELS: { value: RunModel; label: string }[] = [
  { value: 'v4.2-rc1', label: 'v4.2-rc1（候选）' },
  { value: 'v4.1', label: 'v4.1（线上）' },
  { value: 'v4.0', label: 'v4.0' },
];
const SPLITS: { value: RunSplit; label: string }[] = [
  { value: 'test', label: '冻结测试集' },
  { value: 'hard', label: '高频修正困难集' },
  { value: 'val', label: '验证集' },
];
const isModel = (v: string): v is RunModel => MODELS.some((m) => m.value === v);
const isSplit = (v: string): v is RunSplit => SPLITS.some((m) => m.value === v);

function verdictTone(v: string): Tone {
  return v.indexOf('阻断') >= 0 ? 'red' : v === '基线' ? 'gray' : 'green';
}

/** 批量测试运行 */
export function BatchRuns({
  runs,
  model,
  split,
  onModel,
  onSplit,
  onStart,
  busy,
  note,
  fmt,
}: {
  runs: TestRun[];
  model: RunModel;
  split: RunSplit;
  onModel: (m: RunModel) => void;
  onSplit: (s: RunSplit) => void;
  onStart: () => void;
  busy: boolean;
  note: string;
  fmt: (n: number) => string;
}) {
  const t = useT();
  return (
    <Card padded={false} aria-label={t('批量测试')}>
      <div className={s.runHead}>
        <h2 className={cx(s.h2, s.runTitle)}>{t('批量测试运行')}</h2>
        <Field label={t('模型版本')} className={s.fieldModel}>
          {(id) => (
            <Select
              id={id}
              value={model}
              onChange={(v) => isModel(v) && onModel(v)}
              options={MODELS.map((m) => ({ value: m.value, label: t(m.label) }))}
            />
          )}
        </Field>
        <Field label={t('数据集')} className={s.fieldSplit}>
          {(id) => (
            <Select
              id={id}
              value={split}
              onChange={(v) => isSplit(v) && onSplit(v)}
              options={SPLITS.map((m) => ({ value: m.value, label: t(m.label) }))}
            />
          )}
        </Field>
        <Button variant="primary" onClick={onStart} disabled={busy}>
          {t('运行')}
        </Button>
        <span className={s.runNote} role="status">
          {note ? t(note) : null}
        </span>
      </div>
      <div className={s.tableTop}>
        <Table hoverRows style={{ minWidth: 980 }}>
          <thead>
            <tr>
              <th>{t('运行')}</th>
              <th>{t('国家')}</th>
              <th>{t('模型')}</th>
              <th>{t('数据集')}</th>
              <th className={s.end}>{t('样本')}</th>
              <th className={s.end}>{t('字段准确率')}</th>
              <th className={s.end}>{t('票级全对率')}</th>
              <th className={s.end}>{t('平均时长')}</th>
              <th className={s.end}>{t('较线上')}</th>
              <th>{t('结论')}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td>{t(r.country)}</td>
                <td className="mono">{r.model}</td>
                <td>{t(r.split)}</td>
                <td className={cx('num', s.end)}>{fmt(r.n)}</td>
                <td className={cx('num', s.end)}>{r.acc.toFixed(1)}%</td>
                <td className={cx('num', s.end)}>{r.full.toFixed(1)}%</td>
                <td className={cx('num', s.end)}>{t(r.dur.toFixed(1) + ' 秒')}</td>
                <td className={cx('num', s.end, r.delta > 0 ? s.ok : r.delta < 0 ? s.bad : undefined)}>
                  {(r.delta > 0 ? '+' : '') + r.delta.toFixed(1) + ' pp'}
                </td>
                <td>
                  <Chip tone={verdictTone(r.verdict)}>{t(r.verdict)}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
