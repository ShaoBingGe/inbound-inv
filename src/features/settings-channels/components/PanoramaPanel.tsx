import { Card, Chip, type Tone } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { FamKey, Family, PolicyKey, SampleTicket } from '../types';
import s from '../ChannelsPage.module.css';

type CodeTone = 'ok' | 'bad' | 'warn';
function codeTone(code: string): CodeTone {
  if (/OK|BYPASS|NA/.test(code)) return 'ok';
  if (/BANK|SANCTION|STATUS|NEAR|RATE|PEPPOL/.test(code)) return 'bad';
  return 'warn';
}

/** 问题全景：一张示例票在选中渠道里按五类校验的结果 */
export function PanoramaPanel({
  channelName,
  sample,
  families,
  row,
}: {
  channelName: string;
  sample: SampleTicket;
  families: Family[];
  row: Record<FamKey, PolicyKey>;
}) {
  const t = useT();
  return (
    <Card padded={false} className={s.half} aria-label={t('问题全景示例')}>
      <h2 className={s.secTitleSm}>
        {t('问题全景 · 一张票在「')}
        {t(channelName)}
        {t('」里的样子')}
      </h2>
      <div className={s.sampleBox}>
        <div className={s.sampleTop}>
          <span className={s.sampleSup} translate="no">
            {sample.sup}
          </span>
          <span className={`mono ${s.sampleNo}`} translate="no">
            {sample.no}
          </span>
        </div>
        <div className={s.sampleMeta}>{t(sample.meta)}</div>
      </div>
      <div className={s.lanes}>
        {families.map((f) => {
          const items = (sample.lanes[f.k] ?? []).map((i) => ({ ...i, tone: codeTone(i.code) }));
          const pol = row[f.k];
          const bad = items.some((i) => i.tone === 'bad');
          const sum = pol === 'na' ? '不适用' : bad ? '有问题' : items.length ? '可处理' : '通过';
          const tone: Tone = pol === 'na' ? 'gray' : bad ? 'red' : items.length ? 'blue' : 'green';
          return (
            <div key={f.k} className={s.lane}>
              <div>
                <div className={s.laneName}>{t(f.name)}</div>
                <Chip tone={tone}>{t(sum)}</Chip>
              </div>
              <div className={s.laneItems}>
                {items.map((i, n) => (
                  <div key={i.code + n} className={s.laneItem}>
                    <span className={cx('mono', s.laneCode, s[`code_${i.tone}`])}>{i.code}</span>
                    <span className={s.laneMsg}>{t(i.msg)}</span>
                    <span className={s.laneAct}>· {t(i.act)}</span>
                  </div>
                ))}
                {!items.length ? <span className={s.laneEmpty}>{t(pol === 'na' ? '该渠道不适用' : '无问题')}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className={cx(s.verdict, sample.ok ? s.verdictOk : s.verdictWarn)}>{t(sample.verdict)}</div>
    </Card>
  );
}
