import { Chip, Section, type Tone } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { DataCenter } from '../types';
import s from '../DataOpsPage.module.css';

const HEALTH_TONE: Record<string, Tone> = { 正常: 'green', 同步延迟: 'orange' };
export const healthTone = (h: string): Tone => HEALTH_TONE[h] ?? 'gray';

/** 数据驻留拓扑：主数据中心 + 区域数据中心卡片 */
export function Topology({
  dcs,
  selected,
  onPickMaster,
  onPickRegional,
}: {
  dcs: DataCenter[];
  selected: string;
  onPickMaster: (code: string) => void;
  onPickRegional: (code: string) => void;
}) {
  const t = useT();
  const master = dcs.find((x) => x.master);
  const regional = dcs.filter((x) => !x.master);
  return (
    <Section title={t('数据驻留拓扑')} desc={t('票面、影像与个人信息留在所属数据中心；只有聚合统计指标同步到主数据中心')}>
      {master ? (
        <div className={s.masterWrap}>
          <button
            type="button"
            className={cx(s.dcCard, s.masterCard)}
            aria-pressed={master.code === selected}
            onClick={() => onPickMaster(master.code)}
          >
            <div className={s.cardLine}>
              <Chip tone="blue">{t('主数据中心')}</Chip>
              <span className={cx('mono', s.strong)}>{master.code}</span>
              <span>{t(master.name)}</span>
              <Chip tone={healthTone(master.health)}>{t(master.health)}</Chip>
            </div>
            <div className={s.masterSub}>
              {t('采集全球统计数据并提供全球统一看板 · 同时服务')} {t(master.countries.map((c) => c.name).join('、'))}
            </div>
          </button>
        </div>
      ) : null}
      <div className={s.flowNote}>
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
          {t('聚合指标（按国家 / 省份 / 行业 / 状态的数量、金额、准确率、时长），每 15 分钟，mTLS + 签名')}
        </span>
      </div>
      <div className={s.regionalGrid}>
        {regional.map((x) => (
          <button
            key={x.code}
            type="button"
            className={cx(s.dcCard, s.regionalCard)}
            aria-pressed={x.code === selected}
            onClick={() => onPickRegional(x.code)}
          >
            <div className={s.cardRow}>
              <span className={cx('mono', s.strong)}>{x.code}</span>
              <Chip tone={healthTone(x.health)}>{t(x.health)}</Chip>
            </div>
            <div className={s.cardName}>{t(x.name)}</div>
            <div className={s.cardCountries}>{t(x.countries.map((c) => c.name).join('、') || '尚未分配国家')}</div>
            <div className={cx('num', s.cardSync)}>
              {t('最近同步')} {t(x.sync)}
            </div>
          </button>
        ))}
      </div>
    </Section>
  );
}
