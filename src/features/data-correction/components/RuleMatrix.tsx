import { Card, Chip, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { CorrectionReference } from '../types';
import s from '../DataCorrectionPage.module.css';

/** 更正规则矩阵：字段类别 × 发票所处环节，锁定格写明补偿方式；下方为补偿方式说明 */
export function RuleMatrix({ reference }: { reference: CorrectionReference }) {
  const t = useT();
  return (
    <Card className={s.matrixCard} aria-label={t('更正规则矩阵')}>
      <div className={s.headRow}>
        <h2 className={s.h2Lg}>{t('更正规则矩阵：哪些能改，哪些不得更正')}</h2>
        <span className={s.muted}>{t('字段类别 × 发票所处环节；锁定格写明补偿方式')}</span>
      </div>
      <div className={cx(s.tableBox, s.tableBoxGap)}>
        <Table wrapCells className={s.w1080}>
          <thead>
            <tr>
              <th className={s.catCol}>{t('字段类别')}</th>
              {reference.matrixStages.map((st) => (
                <th key={st}>{t(st)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reference.matrix.map((m) => (
              <tr key={m.label}>
                <td className={s.top}>
                  <div className={s.strong}>{t(m.label)}</div>
                  <div className={cx(s.small, s.muted)}>{t(m.eg)}</div>
                </td>
                {m.cells.map((c, i) => (
                  <td key={i} className={s.matrixCell}>
                    <Chip tone={c.tone}>{t(c.label)}</Chip>
                    <div className={s.cellNote}>{t(c.note)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className={s.compGrid}>
        {reference.compTypes.map((c) => (
          <div key={c.title} className={s.schemaCard}>
            <div className={s.strong}>{t(c.title)}</div>
            <div className={s.when}>{t('触发：' + c.when)}</div>
            <div className={s.how}>{t(c.how)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
