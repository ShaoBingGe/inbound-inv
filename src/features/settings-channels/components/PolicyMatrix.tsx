import { Fragment } from 'react';
import { Button, Card, Segmented, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { Channel, ChannelKey, FamKey, Family, PolicyKey, PolicyMatrix as Matrix, PolicyStyle, Preset, PresetKey, SubOverrides } from '../types';
import s from '../ChannelsPage.module.css';

export const polClass = (k: PolicyKey) => s[`pol_${k}`];

/** 与预设组合比较（税局同步 / Peppol 不做 OCR） */
export function presetMatches(ch: ChannelKey, row: Record<FamKey, PolicyKey>, preset: Preset): boolean {
  const target: Record<FamKey, PolicyKey> = { ...preset.v, ...(ch === 'tax' || ch === 'peppol' ? { ocr: 'na' as const } : {}) };
  return (Object.keys(target) as FamKey[]).every((f) => row[f] === target[f]) && Object.keys(row).length === Object.keys(target).length;
}

export function PolicyMatrix({
  channels,
  families,
  policies,
  presets,
  sel,
  pol,
  sub,
  open,
  note,
  nextVer,
  saving,
  onCycle,
  onToggle,
  onApplyPreset,
  onReset,
  onSave,
}: {
  channels: Channel[];
  families: Family[];
  policies: PolicyStyle[];
  presets: Preset[];
  sel: ChannelKey;
  pol: Matrix;
  sub: SubOverrides;
  open: Partial<Record<FamKey, boolean>>;
  note: string;
  nextVer: number;
  saving: boolean;
  onCycle: (ch: ChannelKey, fam: FamKey, sub: string | null) => void;
  onToggle: (fam: FamKey) => void;
  onApplyPreset: (k: PresetKey) => void;
  onReset: () => void;
  onSave: () => void;
}) {
  const t = useT();
  const selCh = channels.find((c) => c.k === sel);
  const styleOf = (k: PolicyKey) => policies.find((p) => p.k === k) ?? policies[0];
  const activePreset = presets.find((p) => presetMatches(sel, pol[sel], p))?.k ?? '';

  const cell = (ch: ChannelKey, fam: FamKey, subKey: string | null) => {
    const key = `${ch}:${fam}:${subKey}`;
    const famPol = pol[ch][fam];
    const v = subKey ? sub[key] || famPol : famPol;
    const p = styleOf(v);
    const inherit = !!subKey && !sub[key];
    return (
      <td key={ch} className={s.polTd}>
        <button
          type="button"
          className={cx(s.pol, polClass(v), inherit && s.polInherit)}
          title={t(p.desc + (subKey ? '（点击单独设置）' : ''))}
          onClick={() => onCycle(ch, fam, subKey)}
        >
          {inherit ? t('继承 · ' + p.label) : t(p.label)}
        </button>
      </td>
    );
  };

  return (
    <Card padded={false} id="matrix" tabIndex={-1} className={s.anchor} aria-label={t('策略矩阵')}>
      <div className={s.secHead}>
        <h2 className={s.secTitle}>{t('校验策略矩阵')}</h2>
        <span className={s.secDesc}>{t('点一个格子切换该渠道对该类校验的处置；展开一类可看子项')}</span>
        <div className={s.grow} />
        <span className="kick">
          {t('给「')}
          {t(selCh?.name ?? '')}
          {t('」套用组合')}
        </span>
        <Segmented<string>
          ariaLabel={t('策略组合')}
          value={activePreset}
          onChange={(k) => onApplyPreset(k as PresetKey)}
          options={presets.map((p) => ({ value: p.k, label: t(p.label) }))}
        />
      </div>
      <div className={s.legend}>
        {policies.map((p) => (
          <span key={p.k} className={s.legendItem}>
            <span className={cx(s.swatch, polClass(p.k))} aria-hidden="true" />
            {t(p.label + '：' + p.desc)}
          </span>
        ))}
      </div>
      <div className={s.tableTop}>
        <Table className={s.matrixTable}>
          <thead>
            <tr>
              <th>{t('校验类别 / 子项')}</th>
              {channels.map((c) => (
                <th key={c.k} className={cx(s.chTh, c.k === sel && s.chThOn)}>
                  {t(c.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {families.map((f) => {
              const isOpen = !!open[f.k];
              return (
                <Fragment key={f.k}>
                  <tr className={s.famRow}>
                    <td>
                      <div className={s.rowLabel}>
                        <button
                          type="button"
                          className={s.toggleBtn}
                          aria-expanded={isOpen}
                          aria-label={t((isOpen ? '收起' : '展开') + f.name)}
                          onClick={() => onToggle(f.k)}
                        >
                          <svg
                            className={cx(s.chev, isOpen && s.chevOpen)}
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            aria-hidden="true"
                          >
                            <path d="m9 6 6 6-6 6" />
                          </svg>
                        </button>
                        <span className={s.famName}>{t(f.name)}</span>
                        <span className={s.note}>
                          {f.subs.length} {t('项')}
                        </span>
                      </div>
                    </td>
                    {channels.map((c) => cell(c.k, f.k, null))}
                  </tr>
                  {isOpen
                    ? f.subs.map((x) => (
                        <tr key={x.k}>
                          <td>
                            <div className={s.rowLabel}>
                              <span className={s.spacer24} />
                              <span>{t(x.name)}</span>
                              <span className={s.note}>{t(x.note)}</span>
                            </div>
                          </td>
                          {channels.map((c) => cell(c.k, f.k, x.k))}
                        </tr>
                      ))
                    : null}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      </div>
      <div className={s.matrixFoot}>
        <span className={s.footNote} role="status">
          {note}
        </span>
        <div className={s.grow} />
        <Button onClick={onReset}>{t('恢复默认')}</Button>
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {t('发布为 policy-v')}
          {nextVer}
        </Button>
      </div>
    </Card>
  );
}
