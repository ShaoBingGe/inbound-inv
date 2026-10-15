import { Icon } from '@/components/ui';
import { cx } from '@/lib/sample';
import type { PhoneView } from '../model';
import { ICON } from './icons';
import s from './PhonePreview.module.css';

export interface PhoneHandlers {
  onShutter: () => void;
  onAcceptTax: () => void;
  onRetake: () => void;
  onUse: () => void;
  onAgain: () => void;
}

/**
 * 手机端（扫码后打开）：同一会话的第二块屏。
 * 语言取票据发生地（LANG_OF），与电脑界面语言相互独立，因此整块不翻译（translate="no"）。
 */
export function PhonePreview({ v, h }: { v: PhoneView; h: PhoneHandlers }) {
  return (
    <aside className={s.wrap} aria-label={v.caption}>
      <div className={s.caption}>
        <span className={s.captionTitle}>{v.caption}</span>
        <span className={cx('num', s.captionLocale)}>{v.locale}</span>
      </div>

      <div className={s.device}>
        <div translate="no" className={cx(s.screen, v.dark ? s.dark : s.light)}>
          <div className={s.status}>
            <span className="num">9:41</span>
            <span className="num">Chrome · {v.locale}</span>
          </div>

          {v.stage === 'waiting' ? (
            <div className={s.idle}>
              <Icon d={ICON.qr} size={42} strokeWidth={1.2} className={s.idleIcon} />
              <div>
                <div className={s.idleTitle}>{v.idleTitle}</div>
                <div className={s.idleBody}>{v.idleBody}</div>
              </div>
            </div>
          ) : null}

          {v.stage === 'cam' ? (
            <>
              <div className={s.camTop}>
                <div className={s.geoPill}>
                  <Icon name="globe" size={14} strokeWidth={1.5} className={s.geoIcon} />
                  <span className={s.geoName}>{v.geoName}</span>
                  <span className={cx('num', s.geoCur)}>{v.currency}</span>
                </div>
                <div className={s.ruleNote}>{v.ruleNote}</div>
              </div>
              <div className={s.viewfinder}>
                <div className={cx(s.corner, s.cTL)} />
                <div className={cx(s.corner, s.cTR)} />
                <div className={cx(s.corner, s.cBL)} />
                <div className={cx(s.corner, s.cBR)} />
                <div className={s.camHint}>
                  <div>{v.camHint}</div>
                </div>
              </div>
              <div className={s.shutterRow}>
                <span className={cx('num', s.shotLine)}>{v.shotLine}</span>
                <button type="button" className={s.shutter} onClick={h.onShutter} aria-label={v.shutterLabel}>
                  <span className={s.shutterInner} />
                </button>
                <div className={s.lastShotWrap}>
                  <div className={s.lastShot} />
                </div>
              </div>
            </>
          ) : null}

          {v.stage === 'result' ? (
            <>
              <div className={s.resultHead}>
                <div className={s.resultTitle}>{v.resultTitle}</div>
                <div className={cx('num', s.apiLine)}>{v.apiLine}</div>
              </div>
              <div className={s.resultBody}>
                <div className={s.doc}>
                  <div className={s.docThumb} />
                  <div className={s.docText}>
                    <div className={s.docSeller}>{v.seller}</div>
                    <div className={cx('num', s.docLine)}>{v.docLine}</div>
                  </div>
                </div>
                <div className={s.fieldsBox}>
                  <div className={s.fieldRow}>
                    <span className={s.fieldLabel}>{v.fAmount}</span>
                    <span className={cx('num', s.amount)}>{v.amount}</span>
                  </div>
                  <div className={cx(s.fieldRow, v.taxAsk && s.taxAsk)}>
                    <span className={s.fieldLabel}>{v.fTax}</span>
                    <div className={s.taxVal}>
                      <span className={cx('num', s.tax)}>{v.tax}</span>
                      {v.taxAsk ? (
                        <button type="button" className={s.taxBtn} onClick={h.onAcceptTax}>
                          {v.taxAsk}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className={s.resultNote}>{v.resultNote}</div>
              </div>
              <div className={s.resultActions}>
                <button type="button" className={s.retake} onClick={h.onRetake}>
                  {v.retake}
                </button>
                <button type="button" className={s.use} onClick={h.onUse}>
                  {v.use}
                </button>
              </div>
            </>
          ) : null}

          {v.stage === 'sent' ? (
            <div className={s.sent}>
              <div className={s.sentIcon}>
                <Icon d={ICON.tick} size={26} strokeWidth={1.7} />
              </div>
              <div>
                <div className={s.sentTitle}>{v.sentTitle}</div>
                <div className={s.sentBody}>{v.sentBody}</div>
              </div>
              <button type="button" className={s.again} onClick={h.onAgain}>
                {v.again}
              </button>
            </div>
          ) : null}

          <div className={s.homeBar}>
            <div />
          </div>
        </div>
      </div>

      <div className={s.footNote}>{v.footNote}</div>
    </aside>
  );
}
