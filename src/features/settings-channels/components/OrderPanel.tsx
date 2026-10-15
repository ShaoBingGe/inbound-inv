import { Card, Chip, type Tone } from '@/components/ui';
import { useT } from '@/i18n';
import type { Channel, FamKey, PolicyKey, PolicyStyle } from '../types';
import s from '../ChannelsPage.module.css';

export const POLICY_TONE: Record<PolicyKey, Tone> = { na: 'gray', auto: 'green', hint: 'blue', review: 'orange', block: 'red' };

/** 选中渠道的校验执行顺序与组合切换条件 */
export function OrderPanel({
  channel,
  row,
  policies,
}: {
  channel: Channel;
  row: Record<FamKey, PolicyKey>;
  policies: PolicyStyle[];
}) {
  const t = useT();
  return (
    <Card padded={false} className={s.half} aria-label={t('渠道执行顺序')}>
      <h2 className={s.secTitleSm}>
        {t(channel.name)}
        {t(' · 校验执行顺序与组合逻辑')}
      </h2>
      <div className={s.logic}>{t(channel.logic)}</div>
      <div className={s.steps}>
        {channel.order.map((o, i) => {
          const v = row[o.fam];
          const p = policies.find((x) => x.k === v);
          return (
            <div key={o.fam + i} className={s.step}>
              <span className={`num ${s.stepNum}`}>{i + 1}</span>
              <div className={s.stepBody}>
                <div className={s.stepLabel}>{t(o.label)}</div>
                <div className={s.stepSub}>{t(o.sub)}</div>
              </div>
              <Chip tone={POLICY_TONE[v]}>{t(p?.label ?? '')}</Chip>
            </div>
          );
        })}
      </div>
      <div className={`kick ${s.switchKick}`}>{t('组合切换条件（按单票动态选择组合）')}</div>
      {channel.rules.map((u) => (
        <div key={u.when} className={s.switchRow}>
          <span className={`mono ${s.switchWhen}`}>{t(u.when)}</span>
          <span className={s.switchThen}>→ {t(u.then)}</span>
        </div>
      ))}
    </Card>
  );
}
