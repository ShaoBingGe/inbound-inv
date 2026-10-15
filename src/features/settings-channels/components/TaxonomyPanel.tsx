import { Card, Chip, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { TaxonomyRow } from '../types';
import s from '../ChannelsPage.module.css';

const TIPS: Array<[string, string]> = [
  ['同一票多类问题的排序', '阻断类 → 税局/平台 → 重复 → 供应商 → 业务合规 → OCR 可纠正项。先展示会否决入账的问题，再展示能自动处理的问题。'],
  ['对员工与对供应商的措辞分开', '同一编码带两套文案：对内说明规则与处置，对供应商只说明需要补什么、改什么，不暴露内部规则与风险评分。'],
  ['问题即数据', '每条问题记录渠道、组合版本、字段、真值来源与最终处置，汇入看板的错误率，也作为修正数据集的标签。'],
];

/** 问题分类与展示规范 */
export function TaxonomyPanel({ rows }: { rows: TaxonomyRow[] }) {
  const t = useT();
  return (
    <Card padded={false} id="taxonomy" tabIndex={-1} className={s.anchor} aria-label={t('问题展示规范')}>
      <div className={s.secHead}>
        <h2 className={s.secTitle}>{t('问题分类与展示规范')}</h2>
        <span className={s.secDesc}>{t('五类问题统一编码；同一问题在采集页、供应商门户、票夹与看板的展示方式一致')}</span>
      </div>
      <div className={s.tableTop}>
        <Table className={cx(s.taxonomyTable, s.topCells)} wrapCells>
          <thead>
            <tr>
              <th>{t('类别')}</th>
              <th>{t('编码前缀 / 示例')}</th>
              <th>{t('严重度')}</th>
              <th>{t('展示位置')}</th>
              <th>{t('展示形式')}</th>
              <th>{t('可执行动作')}</th>
              <th>{t('来源与真值')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.prefix}>
                <td className={s.taxName}>{t(r.name)}</td>
                <td>
                  <div className={cx('mono', s.prefix)}>{r.prefix}</div>
                  <div className={s.eg}>{t(r.eg)}</div>
                </td>
                <td>
                  <div className={s.chips}>
                    {r.sev.map((x) => (
                      <Chip key={x.l} tone={x.tone}>
                        {t(x.l)}
                      </Chip>
                    ))}
                  </div>
                </td>
                <td className={s.softCell}>{t(r.where)}</td>
                <td className={s.softCell}>{t(r.how)}</td>
                <td className={s.softCell}>{t(r.act)}</td>
                <td className={s.softCell}>{t(r.truth)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className={s.tips}>
        {TIPS.map(([title, text]) => (
          <div key={title} className={s.tip}>
            <div className={s.tipTitle}>{t(title)}</div>
            <div className={s.tipText}>{t(text)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
