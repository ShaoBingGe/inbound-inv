import { Link } from 'react-router-dom';
import { Card, Chip, Table } from '@/components/ui';
import { PROTOTYPE_ROUTE } from '@/app/routes';
import { useI18n } from '@/i18n';
import type { EvalRun, HotField } from '../types';
import s from '../DataRecognitionPage.module.css';

/** 定期评测 · 识别样本集 + 本期修正最集中的字段 */
export function EvalPanel({ evals, hot, total }: { evals: EvalRun[]; hot: HotField[]; total: number }) {
  const { t, locale } = useI18n();
  const fmt = new Intl.NumberFormat(locale);
  const hmax = hot[0]?.count || 1;
  return (
    <Card padded={false} className={`${s.card} ${s.col480}`} aria-label={t('定期评测')}>
      <div className={s.headLine}>
        <h2 className={s.h2sm}>{t('定期评测 · 识别样本集')}</h2>
        <span className={s.muted}>{t('每两周对线上模型跑一次；每季度刷新冻结测试集')}</span>
        <div className={s.spacer} />
        <Link to={PROTOTYPE_ROUTE['ModelBoard.dc.html']}>{t('看各版本效果')}</Link>
      </div>
      <div className={s.tableBox}>
        <Table wrapCells style={{ minWidth: 620 }}>
          <thead>
            <tr>
              <th>{t('评测')}</th>
              <th>{t('日期')}</th>
              <th>{t('范围')}</th>
              <th className={s.end}>{t('新增修正样本')}</th>
              <th className={s.end}>{t('修正样本上准确率')}</th>
              <th className={s.end}>{t('较上期')}</th>
              <th>{t('结论')}</th>
            </tr>
          </thead>
          <tbody>
            {evals.map((e) => {
              const up = e.delta >= 0;
              return (
                <tr key={e.id}>
                  <td className={`mono ${s.nowrap}`} translate="no">
                    {e.id}
                  </td>
                  <td className={`num ${s.nowrap}`}>{e.date}</td>
                  <td className={s.nowrap}>{t(e.scope)}</td>
                  <td className={`num ${s.end} ${s.nowrap}`}>{fmt.format(e.newSamples)}</td>
                  <td className={`num ${s.end} ${s.nowrap}`}>{e.accuracy.toFixed(1)}%</td>
                  <td className={`num ${s.end} ${s.nowrap}`} style={{ color: up ? 'var(--green-ink)' : 'var(--red-ink)' }}>
                    {(up ? '+' : '') + e.delta.toFixed(1) + ' pp'}
                  </td>
                  <td className={s.nowrap}>
                    <Chip tone={up ? 'green' : 'red'}>{t(e.verdict)}</Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      <div className={`kick ${s.subKick}`}>{t('本期修正最集中的字段（进入下一版训练优先级）')}</div>
      <div className={s.hotList}>
        {hot.map((h) => {
          const ratio = h.count / hmax;
          return (
            <div key={h.label} className={s.hotRow}>
              <span>{t(h.label)}</span>
              <div className={s.hotTrack} aria-hidden="true">
                <div
                  className={s.hotFill}
                  style={{ width: `${(ratio * 100).toFixed(0)}%`, background: ratio > 0.8 ? 'var(--alert)' : 'var(--accent)' }}
                />
              </div>
              <span className={`num ${s.end} ${s.nowrap}`}>
                {h.count} {t('条 ·')} {((h.count / total) * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
