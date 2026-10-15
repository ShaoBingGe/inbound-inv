import { Chip } from '@/components/ui';
import { useT } from '@/i18n';
import type { Channel, ChannelKey, Preset } from '../types';
import s from '../ChannelsPage.module.css';

export function ChannelCards({
  channels,
  presets,
  sel,
  onPick,
}: {
  channels: Channel[];
  presets: Preset[];
  sel: ChannelKey;
  onPick: (k: ChannelKey) => void;
}) {
  const t = useT();
  return (
    <section aria-label={t('采集渠道')} className={s.channelGrid}>
      {channels.map((c) => (
        <button key={c.k} type="button" className={s.channelCard} aria-pressed={c.k === sel} onClick={() => onPick(c.k)}>
          <div className={s.cardTop}>
            <span className={s.cardName}>{t(c.name)}</span>
            <Chip tone={c.formTone}>{t(c.form)}</Chip>
          </div>
          <div className={s.cardSub}>{t(c.sub)}</div>
          <div className={`num ${s.cardStats}`}>
            <span>
              {t('占比')} <b>{c.share}</b>
            </span>
            <span>
              {t('直通率')} <b>{c.stp}</b>
            </span>
            <span>
              {t('误差')} <b>{c.err}</b>
            </span>
          </div>
          <div className={s.cardChips}>
            <Chip tone="gray">
              {t('操作者：')}
              {t(c.who)}
            </Chip>
            <Chip tone="blue">
              {t('组合：')}
              {t(presets.find((p) => p.k === c.preset)?.label ?? '')}
            </Chip>
          </div>
        </button>
      ))}
    </section>
  );
}
