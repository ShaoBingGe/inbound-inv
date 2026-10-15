import { Card, Chip, Input, Select, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { useAsync } from '@/lib/useAsync';
import { simulateTaxRules } from '../api';
import { TREAT, TXN_TYPES, USES } from '../meta';
import type { SimInput, SimTxnType, SimUse, TaxRegime } from '../types';
import s from '../TaxRulesPage.module.css';

function isTxnType(v: string): v is SimTxnType {
  return TXN_TYPES.some((o) => o.value === v);
}
function isUse(v: string): v is SimUse {
  return USES.some((o) => o.value === v);
}

/** 规则模拟：输入一张假想发票，看该国当前版本如何处理 */
export function RuleSimulator({
  regime: c,
  sim,
  onChange,
}: {
  regime: TaxRegime;
  /** kind 为空表示使用该国第一个票种 */
  sim: SimInput;
  onChange: (next: SimInput) => void;
}) {
  const t = useT();
  const input: SimInput = { ...sim, kind: sim.kind || c.kinds[0] };
  const { data: res, loading } = useAsync(
    () => simulateTaxRules(c, input),
    [c, input.kind, input.type, input.use, input.amt],
  );

  return (
    <Card padded={false} className={s.sim} aria-label={t('规则模拟')}>
      <div className={cx(s.overviewHead)}>
        <h2 className={s.h2}>{t('规则模拟')}</h2>
        <span className={s.desc}>
          {t('输入一张假想发票，看')} {t(c.name)} {t('当前版本如何处理')}
        </span>
      </div>
      <div className={s.simInputs}>
        <label className={s.simField}>
          <span className="kick">{t('票种')}</span>
          <Select
            value={input.kind}
            onChange={(v) => onChange({ ...sim, kind: v })}
            options={c.kinds.map((k) => ({ value: k, label: t(k) }))}
          />
        </label>
        <label className={s.simField}>
          <span className="kick">{t('交易类型')}</span>
          <Select
            value={input.type}
            onChange={(v) => {
              if (isTxnType(v)) onChange({ ...sim, type: v });
            }}
            options={TXN_TYPES.map((o) => ({ value: o.value, label: t(o.label) }))}
          />
        </label>
        <label className={s.simField}>
          <span className="kick">{t('用途')}</span>
          <Select
            value={input.use}
            onChange={(v) => {
              if (isUse(v)) onChange({ ...sim, use: v });
            }}
            options={USES.map((o) => ({ value: o.value, label: t(o.label) }))}
          />
        </label>
        <label className={s.simField}>
          <span className="kick">{t('不含税金额（本币）')}</span>
          <Input
            className="num"
            inputMode="decimal"
            value={input.amt}
            onChange={(e) => onChange({ ...sim, amt: e.target.value })}
          />
        </label>
      </div>

      <div className={cx(s.simOut, loading && s.simBusy)} aria-busy={loading || undefined}>
        <div className={s.simTableBox}>
          <Table wrapCells className={s.tbl}>
            <thead>
              <tr>
                <th>{t('税种')}</th>
                <th className={s.amtCol}>{t('税额')}</th>
                <th>{t('处理')}</th>
              </tr>
            </thead>
            <tbody>
              {(res?.lines ?? []).map((l) => (
                <tr key={l.name}>
                  <td>{t(l.name)}</td>
                  <td className={cx('num', s.amtCol)}>{l.amt}</td>
                  <td>
                    <Chip tone={TREAT[l.treat][1]}>{t(TREAT[l.treat][0])}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className={cx('num', s.totals)}>
            <span>
              {t('价税合计')} <b>{res?.total ?? '—'}</b>
            </span>
            <span>
              {t('可抵扣')} <b className={s.creditVal}>{res?.credit ?? '—'}</b>
            </span>
            <span>
              {t('计入成本')} <b>{res?.cost ?? '—'}</b>
            </span>
            <span>
              {t('预提')} <b>{res?.wht ?? '—'}</b>
            </span>
          </div>
        </div>
        <div className={s.notes}>
          {(res?.notes ?? []).map((n, i) => (
            <div key={`${n.code}-${i}`} className={s.note}>
              <span className={cx('mono', s.noteCode)}>{n.code}</span>
              <span>{t(n.text)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
