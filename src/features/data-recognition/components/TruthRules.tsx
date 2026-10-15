import { Card, Chip, Table } from '@/components/ui';
import { useT } from '@/i18n';
import type { ConflictRule, TruthRule } from '../types';
import s from '../DataRecognitionPage.module.css';

/** 核验规则 · 真值优先级 + 冲突裁决 */
export function TruthRules({ truth, conflicts }: { truth: TruthRule[]; conflicts: ConflictRule[] }) {
  const t = useT();
  return (
    <Card padded={false} className={`${s.card} ${s.col420}`} aria-label={t('核验规则')}>
      <h2 className={s.h2sm}>{t('核验规则 · 真值优先级')}</h2>
      <div className={s.desc}>{t('一条修正要被采纳，需要满足其来源对应的核验条件；高优先级真值可直接覆盖低优先级')}</div>
      <div className={s.tableBox}>
        <Table wrapCells style={{ minWidth: 520 }}>
          <thead>
            <tr>
              <th>{t('优先级')}</th>
              <th>{t('真值来源')}</th>
              <th>{t('采纳条件')}</th>
              <th>{t('权重')}</th>
            </tr>
          </thead>
          <tbody>
            {truth.map((r) => (
              <tr key={r.priority}>
                <td className={`num ${s.strong}`}>{r.priority}</td>
                <td>{t(r.source)}</td>
                <td className={s.soft}>{t(r.condition)}</td>
                <td>
                  <Chip tone={r.tone}>{t(r.weight)}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className={`kick ${s.subKick}`}>{t('冲突裁决')}</div>
      {conflicts.map((c) => (
        <div key={c.when} className={s.conflict}>
          <span className={s.conflictWhen}>{t(c.when)}</span>
          <span className={s.soft}>→ {t(c.then)}</span>
        </div>
      ))}
    </Card>
  );
}
