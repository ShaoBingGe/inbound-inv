import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  ButtonLink,
  Card,
  Empty,
  ErrorState,
  Icon,
  Input,
  PageBody,
  PageHeader,
  PageLoading,
  Spinner,
  Table,
} from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { useAsync } from '@/lib/useAsync';
import { CountrySelect, useCountryPicker } from '@/features/supplier-wallet/components/CountrySelect';
import { NoMatchData } from '@/features/supplier-wallet/components/match/NoMatchData';
import { fetchTrainingOverview } from './api';
import type { TrainingSupplier } from './types';
import s from './MatchTraining.module.css';

/** 导出报告（CSV，客户端生成） */
function exportCsv(rows: TrainingSupplier[], headers: string[]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = rows.map((r) => [r.name, r.materials, r.names, r.learned, `${r.coverage}%`].map(esc).join(','));
  const csv = '﻿' + [headers.map(esc).join(','), ...body].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'match-training.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** 数据管理 · 匹配训练成果：按供应商查看发票品名与最近 12 个月供货物料的对应学习情况 */
export default function MatchTrainingPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cp = useCountryPicker();
  const cty = cp.country?.code;
  const data = useAsync(() => (cty ? fetchTrainingOverview(cty) : Promise.resolve(null)), [cty]);
  const [q, setQ] = useState(params.get('q') ?? '');
  useEffect(() => setQ(params.get('q') ?? ''), [params]);

  if (cp.loading) return <PageLoading />;
  if (cp.error) return <ErrorState error={cp.error} onRetry={cp.reload} />;

  const rows = data.data?.suppliers ?? [];
  const query = q.trim().toLowerCase();
  const shown = rows.filter((r) => !query || r.name.toLowerCase().includes(query));
  const cols = ['供应商', '最近12个月供货物料数', '最近12个月供货物料品名数', '已学会品名数', '物料覆盖率'];

  return (
    <>
      <PageHeader
        crumb={`${t('数据管理')} / ${t('匹配训练成果')}`}
        title={t('匹配训练成果')}
        subtitle={data.data ? t('数据更新于 ' + data.data.updatedAt) : undefined}
        actions={
          <div className={s.actions}>
            {cp.country ? (
              <CountrySelect countries={cp.countries} value={cp.country.code} onChange={cp.setCountry} />
            ) : null}
            <ButtonLink to={ROUTES.dataMatchRelations}>{t('三单匹配关系')}</ButtonLink>
            <Button
              icon={<Icon name="download" size={14} />}
              disabled={!rows.length}
              onClick={() =>
                exportCsv(
                  shown,
                  cols.map((c) => t(c)),
                )
              }
            >
              {t('导出报告')}
            </Button>
          </div>
        }
      />
      <PageBody className={s.body}>
        {data.error ? (
          <ErrorState error={data.error} onRetry={data.reload} />
        ) : !data.data ? (
          <Spinner label={t('加载中')} />
        ) : !rows.length ? (
          <NoMatchData onPickCountry={cty !== 'CN' ? () => cp.setCountry('CN') : undefined} />
        ) : (
          <>
            <Card padded={false} className={s.info}>
              <div className={s.infoNum}>
                <span className="kick">{t('覆盖供应商')}</span>
                <span className="num">
                  {rows.length} <small>{t('家')}</small>
                </span>
              </div>
              <p className={s.infoText}>
                {t('训练成果按供应商查看：每家供应商的发票品名与最近 12 个月供货物料的对应学习情况，点击行查看明细。')}
              </p>
            </Card>

            <Card padded={false}>
              <div className={s.toolbar}>
                <Input
                  className={s.search}
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('搜索供应商名称')}
                  aria-label={t('搜索供应商名称')}
                />
                <span className={s.muted}>{t('共 ' + shown.length + ' 家供应商（按已学会品名数降序）')}</span>
              </div>
              <Table hoverRows className={s.table}>
                <thead>
                  <tr>
                    {cols.map((c, i) => (
                      <th key={c} className={i ? s.r : undefined}>
                        {t(c)}
                      </th>
                    ))}
                    <th aria-label={t('操作')} />
                  </tr>
                </thead>
                <tbody>
                  {[...shown]
                    .sort((a, b) => b.learned - a.learned)
                    .map((r) => {
                      const to = ROUTES.matchTrainingDetail(r.code, cty);
                      return (
                        <tr key={r.code} className={s.clickRow} onClick={() => navigate(to)}>
                          <td translate="no" className={s.strong}>
                            {r.name}
                          </td>
                          <td className={cx('num', s.r)}>{r.materials.toLocaleString('en-US')}</td>
                          <td className={cx('num', s.r)}>{r.names.toLocaleString('en-US')}</td>
                          <td className={cx('num', s.r, s.good)}>{r.learned.toLocaleString('en-US')}</td>
                          <td className={cx('num', s.r, s.good)}>{r.coverage}%</td>
                          <td className={s.r}>
                            <Link to={to} onClick={(e) => e.stopPropagation()}>
                              {t('查看明细')}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  {!shown.length ? (
                    <tr>
                      <td colSpan={6}>
                        <Empty />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </Card>
          </>
        )}
      </PageBody>
    </>
  );
}
