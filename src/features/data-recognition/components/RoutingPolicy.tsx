import { Card, Chip, Table } from '@/components/ui';
import { useT } from '@/i18n';
import type { RoutingRule } from '../types';
import s from '../DataRecognitionPage.module.css';

/** 入集策略：修正类型 → 去向 */
export function RoutingPolicy({ routing }: { routing: RoutingRule[] }) {
  const t = useT();
  return (
    <Card padded={false} className={`${s.card} ${s.col400}`} aria-label={t('入集策略')}>
      <h2 className={s.h2sm}>{t('入集策略')}</h2>
      <div className={s.tableBox}>
        <Table wrapCells>
          <thead>
            <tr>
              <th>{t('修正类型')}</th>
              <th>{t('去向')}</th>
              <th>{t('说明')}</th>
            </tr>
          </thead>
          <tbody>
            {routing.map((r) => (
              <tr key={r.type}>
                <td className={s.medium}>{t(r.type)}</td>
                <td>
                  <Chip tone={r.tone}>{t(r.to)}</Chip>
                </td>
                <td className={s.soft125}>{t(r.why)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className={s.policyNote}>
        {t(
          '回流样本进入训练集前，在「数据识别规则管理」按分布上限重采样；冻结测试集只在季度评测时更新，且永不包含本季度回流样本。',
        )}
      </div>
    </Card>
  );
}
