import { Button, Drawer, Icon } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { UiText } from '../i18n';
import type { CheckView, EditView, FieldView } from '../model';
import { ChecksPanel } from './ChecksPanel';
import { ICON } from './icons';
import s from './EditDrawer.module.css';

/** 票据明细 / 手动录入：发生地锁定、金额折算、票面字段（可标注有误）、校验与纠正、附件、影像 */
export function EditDrawer({
  T,
  v,
  onClose,
  onSave,
  onFix,
  onMark,
}: {
  T: UiText;
  v: EditView | null;
  onClose: () => void;
  onSave: () => void;
  onFix: (c: CheckView) => void;
  onMark: (f: FieldView) => void;
}) {
  const t = useT();
  return (
    <Drawer
      open={!!v}
      onClose={onClose}
      width={960}
      title={
        v ? (
          <div>
            <div className={s.title}>{v.title}</div>
            <div className={cx('num', s.crumb)}>{v.crumb}</div>
          </div>
        ) : (
          ''
        )
      }
      footer={
        v ? (
          <>
            <div className={cx(s.status, s['tone_' + v.statusTone])}>{v.statusLine}</div>
            <Button size="lg" onClick={onClose}>
              {T.cancel}
            </Button>
            <Button size="lg" variant="primary" onClick={onSave}>
              {v.saveLabel}
            </Button>
          </>
        ) : null
      }
    >
      {v ? (
        <div className={s.grid}>
          <div className={s.left}>
            <div className={s.geo}>
              <div className="kick">{T.geoLocked}</div>
              <div className={s.geoTop}>
                <span className={s.geoName}>{v.country}</span>
                <span className={cx('num', s.geoCur)}>{v.currency}</span>
              </div>
              <div className={cx('num', s.geoTax)}>{v.taxLine}</div>
              <div className={s.geoNote}>{v.lockNote}</div>
            </div>

            <div className={cx('kick', s.sectionHead)}>{T.amount}</div>
            <div className={s.ruled}>
              <div className={s.amtRow}>
                <div className={s.grow}>
                  <div className={s.amtLabel}>{T.origAmount}</div>
                  <div className={cx('num', s.bigNum)}>{v.orig}</div>
                </div>
                <div className={s.times} aria-hidden="true">
                  ×
                </div>
                <div className={s.rateBox}>
                  <div className={s.amtLabel}>{T.rate}</div>
                  <div className={cx('num', s.rate)}>{v.rate}</div>
                </div>
              </div>
              <div className={s.convRow}>
                <div className={s.rateNote}>{v.rateNote}</div>
                <div className={s.convBox}>
                  <div className={s.amtLabel}>{v.convLabel}</div>
                  <div className={cx('num', s.bigNum, s.convNum)}>{v.conv}</div>
                </div>
              </div>
            </div>

            <div className={cx('kick', s.sectionHead)}>{T.faceFields}</div>
            <div className={s.ruled}>
              {v.fields.map((f) => (
                <div key={f.key} className={s.field}>
                  <div className={s.fieldLabel}>{f.label}</div>
                  <div className={s.fieldMain}>
                    <div
                      className={cx('num', s.fieldValue, f.missing && s.fieldMissing, f.marked && s.fieldMarked)}
                      translate={f.missing ? 'yes' : 'no'}
                    >
                      {f.missing ? t('待填写') : f.value}
                    </div>
                    {f.hint ? <div className={cx(s.fieldHint, f.hintAlert && s.fieldHintAlert)}>{f.hint}</div> : null}
                  </div>
                  <div className={cx('kick', s.fieldSrc, f.srcManual && s.fieldSrcManual)}>{f.src}</div>
                  <button
                    type="button"
                    className={cx(s.mark, f.marked && s.markOn)}
                    disabled={f.locked}
                    title={f.markTitle}
                    aria-pressed={f.locked ? undefined : f.marked}
                    onClick={() => onMark(f)}
                  >
                    {f.markLabel}
                  </button>
                </div>
              ))}
            </div>

            <ChecksPanel v={v} onFix={onFix} />

            <div className={cx('kick', s.sectionHead)}>{T.attachments}</div>
            <div className={cx(s.ruled, s.attachList)}>
              {v.attachments.map((at) => (
                <div key={at.name} className={s.attach}>
                  <Icon d={ICON.clip} size={13} strokeWidth={1.4} className={s.attachIcon} />
                  <span className={s.attachName} translate="no">
                    {at.name}
                  </span>
                  <span className={cx('num', s.attachSize)}>{at.size}</span>
                </div>
              ))}
              <button type="button" className={s.addAttach}>
                <Icon name="plus" size={13} strokeWidth={1.5} />
                {T.addAttachment}
              </button>
            </div>
          </div>

          <div className={s.right}>
            <div className={s.imageHead}>
              <span className={cx('kick', s.grow)}>{T.image}</span>
              <span className={cx('num', s.imageNote)}>{v.imageNote}</span>
            </div>
            <div className={s.imageStage}>
              <div className={s.imageFrame}>
                <div className={s.imagePaper}>
                  <div className={s.paper}>
                    <i aria-hidden="true" className={cx(s.inkDark, s.m1)} />
                    <i aria-hidden="true" className={cx(s.inkMid, s.m2)} />
                    <i aria-hidden="true" className={cx(s.inkLight, s.m3)} />
                    <i aria-hidden="true" className={cx(s.inkLight, s.m4)} />
                    <i aria-hidden="true" className={cx(s.inkLight, s.m5)} />
                    <i aria-hidden="true" className={cx(s.box, s.m6)} />
                    <div className={s.paperCaption}>{t('票面影像 · 原件只读存证')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
