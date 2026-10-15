import { Card, Table } from '@/components/ui';
import { useT } from '@/i18n';
import type { MatrixRow, RouteStep } from '../types';
import s from '../InvoiceLifecyclePage.module.css';

/** 一张票如何被划入处理规则：六级判定卡片 + 五国阶段对照矩阵 */
export function RuleRouting({ route, matrix }: { route: RouteStep[]; matrix: MatrixRow[] }) {
  const t = useT();
  return (
    <Card padded={false} aria-label={t('规则路由')}>
      <div className={`${s.blockHead} ${s.routeHead}`}>
        <h2 className={s.blockTitle}>{t('一张票如何被划入处理规则')}</h2>
        <span className={s.blockDesc}>{t('按发生地、购方法人、票种、交易类型逐级判定；判定结果和规则版本一起冻结在票上')}</span>
      </div>
      <div className={s.routeGrid}>
        {route.map((r, i) => (
          <div key={r.k} className={s.routeCard}>
            <div className="kick">
              {i + 1} · {t(r.k)}
            </div>
            <div className={s.routeValue}>{t(r.v)}</div>
            <div className={s.routeWhy}>{t(r.why)}</div>
          </div>
        ))}
      </div>
      <div className={s.matrixWrap}>
        <Table wrapCells>
          <thead>
            <tr>
              <th>{t('阶段')}</th>
              <th>{t('中国大陆')}</th>
              <th>{t('日本')}</th>
              <th>{t('德国')}</th>
              <th>{t('美国')}</th>
              <th>{t('巴西')}</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((m) => (
              <tr key={m.k}>
                <td className={s.matrixStage}>{t(m.k)}</td>
                {m.cells.map((c, i) => (
                  <td key={i} className={s.matrixCell}>
                    {t(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
