import { Button, Card, Chip, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { CheckItem, CountryProfile } from '../types';
import s from '../DataRulesPage.module.css';

/** 标注数据格式检查 */
export function FormatCheck({
  country,
  items,
  checked,
  busy,
  onRun,
  fmt,
}: {
  country: CountryProfile;
  items: CheckItem[];
  checked: boolean;
  busy: boolean;
  onRun: () => void;
  fmt: (n: number) => string;
}) {
  const t = useT();
  const last = items.length - 1;
  return (
    <Card padded={false} aria-label={t('标注格式检查')}>
      <div className={s.head}>
        <h2 className={s.h2}>{t('标注数据格式检查')}</h2>
        <span className={s.desc}>
          {t('批次')} <span translate="no">{country.batch}</span> · {fmt(country.batchN)} {t('张 · 模式 invoice-label/')}
          {country.code.toLowerCase()}@v5
        </span>
        <div className={s.spacer} />
        <Button variant="primary" onClick={onRun} disabled={busy}>
          {t(checked ? '重新检查' : '运行格式检查')}
        </Button>
      </div>
      <div className={s.checkCols}>
        <div className={s.schemaCol}>
          <div className={cx('kick', s.kickGap)}>{t('字段模式')}</div>
          <div className={s.boxed}>
            <Table>
              <thead>
                <tr>
                  <th>{t('字段')}</th>
                  <th>{t('必填')}</th>
                  <th>{t('格式')}</th>
                </tr>
              </thead>
              <tbody>
                {country.schema.map((f) => (
                  <tr key={f.key}>
                    <td className="mono" translate="no">
                      {f.key}
                    </td>
                    <td>{t(f.required)}</td>
                    <td className={cx('mono', s.dim)}>{t(f.format)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
        <div className={s.resultCol}>
          <div className={cx('kick', s.kickGap)}>{t('检查结果')}</div>
          <div className={s.boxed}>
            <Table style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th>{t('检查项')}</th>
                  <th className={s.end}>{t('问题数')}</th>
                  <th>{t('处理')}</th>
                  <th>{t('状态')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((k, i) => {
                  const n = checked && i < 5 ? (i === 1 ? 2 : 0) : k.value;
                  const red = typeof k.value === 'number' && !checked && k.value > 0;
                  const good = i === last || checked;
                  return (
                    <tr key={k.label}>
                      <td>{t(k.label)}</td>
                      <td className={cx('num', s.end, red && s.bad)}>{n}</td>
                      <td className={s.dim}>{t(k.action)}</td>
                      <td>
                        <Chip tone={good ? 'green' : 'orange'}>
                          {t(i === last ? '合格' : checked ? '已处理' : '待处理')}
                        </Chip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </div>
      </div>
    </Card>
  );
}
