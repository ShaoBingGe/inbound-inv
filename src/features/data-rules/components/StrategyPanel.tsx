import { Button, Chip, Section, Switch } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { MixKind, MixPart } from '../logic';
import type { CountryProfile, CountryStrategy, TriggerDef, TriggerKey } from '../types';
import s from '../DataRulesPage.module.css';

export const MIX_COLOR: Record<MixKind, string> = {
  flood: 'var(--chart-3)',
  random: 'var(--accent)',
  template: 'var(--blue-mid)',
  synthetic: 'var(--blue-light)',
};

/** 某国 · 采集与检测策略 */
export function StrategyPanel({
  country,
  strategy,
  saved,
  saving,
  onSave,
  onChange,
  triggerDefs,
  mix,
  strata,
  fmt,
}: {
  country: CountryProfile;
  strategy: CountryStrategy;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
  onChange: (patch: Partial<CountryStrategy>) => void;
  triggerDefs: TriggerDef[];
  mix: MixPart[];
  strata: string[];
  fmt: (n: number) => string;
}) {
  const t = useT();
  const sz = strategy.size;
  const toggle = (k: TriggerKey, on: boolean) => onChange({ trig: { ...strategy.trig, [k]: on } });
  return (
    <Section
      className={s.colStrategy}
      title={
        <>
          {t(country.name)} {t('· 采集与检测策略')}
        </>
      }
      desc={<Chip tone={saved ? 'green' : 'orange'}>{t(saved ? '已生效' : '未保存')}</Chip>}
      extra={
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {t('保存策略')}
        </Button>
      }
    >
      <div className={cx('kick', s.subKick)}>{t('数据集规模')}</div>
      <label className={s.rangeLabel}>
        <span className={s.rangeRow}>
          <span>{t('目标样本量')}</span>
          <span className={cx('num', s.strong)}>
            {fmt(sz)} {t('张')}
          </span>
        </span>
        <input
          type="range"
          className={s.range}
          min={1000}
          max={20000}
          step={500}
          value={sz}
          onChange={(e) => onChange({ size: parseInt(e.target.value, 10) })}
          aria-label={t('目标样本量')}
        />
      </label>
      <div className={cx('num', s.splitGrid)}>
        <div className={s.box}>
          <div className="kick">{t('训练 70%')}</div>
          <div className={s.strong}>{fmt(Math.round(sz * 0.7))}</div>
        </div>
        <div className={s.box}>
          <div className="kick">{t('验证 15%')}</div>
          <div className={s.strong}>{fmt(Math.round(sz * 0.15))}</div>
        </div>
        <div className={s.box}>
          <div className="kick">{t('测试 15%（冻结）')}</div>
          <div className={s.strong}>{fmt(Math.round(sz * 0.15))}</div>
        </div>
      </div>

      <div className={cx('kick', s.subKick16)}>{t('不定期触发条件（任一满足即启动一轮采集与检测）')}</div>
      {triggerDefs.map((d) => (
        <div key={d.key} className={s.triggerRow}>
          <Switch
            checked={!!strategy.trig[d.key]}
            onChange={(v) => toggle(d.key, v)}
            label={
              <span className={s.triggerText}>
                <span>{t(d.label)}</span>
                <span className={s.triggerSub}>{t(d.sub)}</span>
              </span>
            }
          />
        </div>
      ))}

      <div className={cx('kick', s.subKick16)}>{t('样本来源构成')}</div>
      <label className={s.rangeLabel}>
        <span className={s.rangeRow}>
          <span>{t('高频修正回流样本占比上限')}</span>
          <span className={cx('num', s.strong)}>{strategy.cap}%</span>
        </span>
        <input
          type="range"
          className={s.range}
          min={0}
          max={60}
          step={5}
          value={strategy.cap}
          onChange={(e) => onChange({ cap: parseInt(e.target.value, 10) })}
          aria-label={t('回流占比上限')}
        />
      </label>
      <div className={s.mixBar}>
        {mix.map((m) => (
          <span key={m.kind} title={t(m.label)} style={{ width: `${m.pct}%`, background: MIX_COLOR[m.kind] }} />
        ))}
      </div>
      <div className={s.legend}>
        {mix.map((m) => (
          <span key={m.kind} className={s.legendItem}>
            <span className={s.swatch} style={{ background: MIX_COLOR[m.kind] }} aria-hidden="true" />
            {t(m.label)} {m.pct}%
          </span>
        ))}
      </div>

      <div className={cx('kick', s.subKick16)}>{t('分层维度与约束')}</div>
      <div className={s.chips}>
        {strata.map((x) => (
          <Chip key={x} tone="blue">
            {t(x)}
          </Chip>
        ))}
      </div>
      <div className={s.note}>
        {t('单一供应商 ≤ 3% · 单一版式模板 ≤ 5% · 测试集按季度冻结、回流样本不进入测试集 · 影像与个人信息在')} {country.dc}{' '}
        {t('内脱敏后才可用于训练')}
      </div>
    </Section>
  );
}
