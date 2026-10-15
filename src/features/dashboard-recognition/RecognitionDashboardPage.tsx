import { useState } from 'react';
import { Card, Chip, ErrorState, PageBody, PageHeader, PageLoading, Segmented } from '@/components/ui';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { fetchRecognitionBoard } from './api';
import { DEFAULT_SELECTED, LINE_STYLES, MAX_SELECTED, METRICS, METRIC_KEYS } from './metrics';
import type { AxisKey, MetricKey } from './types';
import { TrendPanel } from './components/TrendPanel';
import { HeatTable } from './components/HeatTable';
import { ReleaseList } from './components/ReleaseList';
import s from './RecognitionDashboardPage.module.css';

export default function RecognitionDashboardPage() {
  const t = useT();
  const { data, loading, error, reload } = useAsync(fetchRecognitionBoard, []);
  const [metric, setMetric] = useState<MetricKey>('acc');
  const [axis, setAxis] = useState<AxisKey>('ver');
  const [sel, setSel] = useState<string[]>(DEFAULT_SELECTED);

  const toggle = (k: string) => {
    let next = sel.slice();
    if (next.includes(k)) next = next.filter((x) => x !== k);
    else if (next.length < MAX_SELECTED) next.push(k);
    if (next.length) setSel(next);
  };

  const header = (
    <PageHeader
      crumb={`${t('看板')} / ${t('识别效果看板')}`}
      title={t('识别效果看板')}
      badges={<Chip tone="gray">{t('示例数据')}</Chip>}
      actions={<span className={s.muted}>{t('评测口径：各国冻结测试集（按季度冻结），与线上真实流量指标分开统计')}</span>}
    />
  );

  if (loading && !data) {
    return (
      <>
        {header}
        <PageLoading />
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        {header}
        <PageBody>
          <ErrorState error={error ?? new Error(t('加载失败'))} onRetry={reload} />
        </PageBody>
      </>
    );
  }

  return (
    <div>
      {header}
      <PageBody className={s.body}>
        <Card padded={false} aria-label={t('筛选')} className={s.block}>
          <div className={s.filterRow}>
            <span className="kick">{t('指标')}</span>
            <Segmented<MetricKey>
              ariaLabel={t('指标')}
              value={metric}
              onChange={setMetric}
              options={METRIC_KEYS.map((k) => ({ value: k, label: t(METRICS[k].label) }))}
            />
            <span className="kick">{t('横轴')}</span>
            <Segmented<AxisKey>
              ariaLabel={t('横轴')}
              value={axis}
              onChange={setAxis}
              options={[
                { value: 'ver', label: t('按模型版本') },
                { value: 'month', label: t('按月份（线上版本）') },
              ]}
            />
          </div>
          <div className={s.pillRow}>
            <span className="kick">{t('国家（最多 5 个）')}</span>
            {data.countries.map((c) => {
              const i = sel.indexOf(c.code);
              const on = i >= 0;
              return (
                <button
                  key={c.code}
                  type="button"
                  className={s.pill}
                  aria-pressed={on}
                  onClick={() => toggle(c.code)}
                >
                  <span
                    className={s.pillDot}
                    style={{ background: on ? LINE_STYLES[i].color : 'var(--axis)' }}
                    aria-hidden="true"
                  />
                  {t(c.name)}
                </button>
              );
            })}
          </div>
        </Card>

        <TrendPanel board={data} metric={metric} axis={axis} selected={sel} />
        <HeatTable board={data} metric={metric} />
        <ReleaseList releases={data.releases} />
      </PageBody>
    </div>
  );
}
