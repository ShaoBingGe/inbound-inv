import { useT } from '@/i18n';
import { Icon } from '@/components/ui';
import s from '../CaptureMobilePage.module.css';

const FLASH = 'M13 2 4 14h7l-1 8 9-12h-7z';

/** 取景器（示意）：虚线取景框 + 略微倾斜的票据 + 快门 */
export function CameraScreen({ hint, onShoot, onCancel }: { hint: string; onShoot: () => void; onCancel: () => void }) {
  const t = useT();
  return (
    <div className={s.cam}>
      <div className={s.viewfinder}>
        <div className={s.frameGuide} aria-hidden="true" />
        <div className={s.paper} aria-hidden="true">
          <div className={s.paperTitle} />
          <div className={s.paperSub} />
          <div className={s.paperLine} style={{ marginTop: 40 }} />
          <div className={s.paperLine} />
          <div className={s.paperLine} />
          <div className={s.paperTotal} />
        </div>
        <div className={s.camHintWrap}>
          <span className={s.camHint}>{t(hint)}</span>
        </div>
      </div>
      <div className={s.camBar}>
        <button type="button" className={s.camRound} aria-label={t('闪光灯')}>
          <Icon d={FLASH} size={20} strokeWidth={1.6} />
        </button>
        <button type="button" className={s.shutter} onClick={onShoot} aria-label={t('拍摄')} />
        <button type="button" className={s.camRound} onClick={onCancel}>
          {t('取消')}
        </button>
      </div>
    </div>
  );
}
