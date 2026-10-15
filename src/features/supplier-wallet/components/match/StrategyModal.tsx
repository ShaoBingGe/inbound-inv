import { useEffect, useState } from 'react';
import { Button, Input, Modal, Segmented } from '@/components/ui';
import { useT } from '@/i18n';
import { DEFAULT_STRATEGY, NO_QTY_LABEL } from '../../match/data';
import type { NoQtyStrategy, StrategyForm, TolMode } from '../../match/types';
import s from './match.module.css';

type T = ReturnType<typeof useT>;

function Seg<V extends string>({
  label,
  value,
  options,
  onChange,
  t,
}: {
  label: string;
  value: V;
  options: Array<[V, string]>;
  onChange: (v: V) => void;
  t: T;
}) {
  return (
    <div className={s.optRow}>
      <span className={s.optLabel}>{t(label)}</span>
      <Segmented
        ariaLabel={t(label)}
        value={value}
        onChange={onChange}
        options={options.map(([v, l]) => ({ value: v, label: t(l) }))}
      />
    </div>
  );
}

const BOOL: Array<['yes' | 'no', string]> = [
  ['yes', '是'],
  ['no', '否'],
];
const JOIN: Array<['yes' | 'no', string]> = [
  ['yes', '参与'],
  ['no', '不参与'],
];
const yn = (b: boolean) => (b ? 'yes' : 'no');

/** 调整策略（匹配口径配置）：保存后以新口径重新执行该组匹配 */
export function StrategyModal({
  mg,
  onClose,
  onSave,
}: {
  mg: string | null;
  onClose: () => void;
  onSave: (mg: string, form: StrategyForm) => Promise<void>;
}) {
  const t = useT();
  const [f, setF] = useState<StrategyForm>(DEFAULT_STRATEGY);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (mg) setF(DEFAULT_STRATEGY);
  }, [mg]);
  const set = <K extends keyof StrategyForm>(k: K, v: StrategyForm[K]) => setF((x) => ({ ...x, [k]: v }));

  const tolRow = (
    label: string,
    mode: 'amtMode' | 'qtyMode' | 'priceMode',
    pct: 'amtPct' | 'qtyPct' | 'pricePct',
    abs: 'amtAbs' | 'qtyAbs' | 'priceAbs',
    unit: string,
  ) => {
    const isPct = f[mode] === 'pct';
    const key = isPct ? pct : abs;
    return (
      <div className={s.optRow}>
        <span className={s.optLabel}>{t(label)}</span>
        <div className={s.tolLine}>
          <Segmented<TolMode>
            ariaLabel={t(label)}
            value={f[mode]}
            onChange={(v) => set(mode, v)}
            options={[
              { value: 'pct', label: t('百分比') },
              { value: 'abs', label: t('绝对值') },
            ]}
          />
          <span className={s.unit}>{t('偏差值')}</span>
          <Input
            className={s.numInput}
            type="number"
            min={0}
            step="any"
            aria-label={t(label) + ' · ' + t('偏差值')}
            value={f[key]}
            onChange={(e) => set(key, Number(e.target.value))}
          />
          <span className={s.unit}>{isPct ? '%' : t(unit)}</span>
        </div>
      </div>
    );
  };

  const noQty = (
    label: string,
    on: 'blueInv' | 'redInv',
    strat: 'blueStrategy' | 'redStrategy',
    opts: NoQtyStrategy[],
  ) => (
    <div className={s.noQty}>
      <Seg label={label + '是否参与'} value={yn(f[on])} options={JOIN} onChange={(v) => set(on, v === 'yes')} t={t} />
      {f[on] ? (
        <Seg<NoQtyStrategy>
          label="参与策略"
          value={f[strat]}
          options={opts.map((o) => [o, NO_QTY_LABEL[o]])}
          onChange={(v) => set(strat, v)}
          t={t}
        />
      ) : null}
    </div>
  );

  return (
    <Modal
      open={!!mg}
      onClose={onClose}
      width={580}
      title={
        <div>
          <div>{t('匹配策略调整')}</div>
          <div className={s.docSub}>
            <span className="mono">{mg}</span> · {t('调整以下口径后重新执行匹配')}
          </div>
        </div>
      }
      footer={
        <div className={s.foot}>
          <Button variant="ghost" className={s.footNote} onClick={() => setF(DEFAULT_STRATEGY)}>
            {t('恢复默认')}
          </Button>
          <Button onClick={onClose}>{t('取消')}</Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              if (!mg) return;
              setBusy(true);
              try {
                await onSave(mg, f);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('确认策略调整')}
          </Button>
        </div>
      }
    >
      <h3 className={s.secTitle}>{t('金额计算与误差容忍')}</h3>
      <Seg
        label="金额计算口径"
        value={f.taxBasis}
        options={[
          ['gross', '含税'],
          ['net', '不含税'],
        ]}
        onChange={(v) => set('taxBasis', v)}
        t={t}
      />
      {tolRow('金额容差', 'amtMode', 'amtPct', 'amtAbs', '元 / 单')}
      {tolRow('数量容差', 'qtyMode', 'qtyPct', 'qtyAbs', '单位 / 行')}
      {tolRow('单价容差', 'priceMode', 'pricePct', 'priceAbs', '元 / 单位')}

      <hr className={s.secRule} />
      <h3 className={s.secTitle}>{t('换算类（汇率 / 单位）')}</h3>
      <Seg
        label="是否开启汇率换算"
        value={yn(f.fxOn)}
        options={BOOL}
        onChange={(v) => set('fxOn', v === 'yes')}
        t={t}
      />
      {f.fxOn ? (
        <Seg
          label="汇率转换"
          value={f.fxRule}
          options={[
            ['invoiceDate', '开票日'],
            ['fixed', '固定汇率'],
          ]}
          onChange={(v) => set('fxRule', v)}
          t={t}
        />
      ) : null}
      <Seg
        label="单位转换"
        value={f.unitConv}
        options={[
          ['exact', '必须精确'],
          ['convert', '允许换算'],
        ]}
        onChange={(v) => set('unitConv', v)}
        t={t}
      />

      <hr className={s.secRule} />
      <h3 className={s.secTitle}>{t('无数量发票处理')}</h3>
      <p className={s.secNote}>{t('针对不带数量的发票，如服务费、折让票')}</p>
      {noQty('蓝票', 'blueInv', 'blueStrategy', ['merge', 'prorate', 'separate'])}
      {noQty('红票', 'redInv', 'redStrategy', ['merge', 'offset', 'separate'])}
    </Modal>
  );
}
