import { Icon } from '@/components/ui';
import { cx } from '@/lib/sample';
import type { UiText } from '../i18n';
import { ICON } from './icons';
import s from './InvoiceList.module.css';

/** 当前发生地 + 采集方式（税局取票 / 上传 / 手机拍票 / 扫描仪 / 邮箱转发 / 手动录入） */
export function CaptureToolbar({
  T,
  name,
  rateLine,
  can,
  phoneOn,
  onCapture,
  onPhone,
  onManual,
}: {
  T: UiText;
  name: string;
  rateLine: string;
  can: { tax: boolean; scan: boolean; mail: boolean };
  phoneOn: boolean;
  onCapture: () => void;
  onPhone: () => void;
  onManual: () => void;
}) {
  return (
    <div className={s.toolbar}>
      <span className={s.curName}>{name}</span>
      <span className={s.vsep} aria-hidden="true" />
      {can.tax ? (
        <button type="button" className={cx(s.method, s.methodAccent)} onClick={onCapture}>
          <Icon d={ICON.taxBureau} size={14} strokeWidth={1.4} />
          {T.mTax}
        </button>
      ) : null}
      <button type="button" className={s.method} onClick={onCapture}>
        <Icon d={ICON.upload} size={14} strokeWidth={1.4} />
        {T.mUpload}
      </button>
      <button type="button" className={cx(s.method, phoneOn && s.methodOn)} aria-pressed={phoneOn} onClick={onPhone}>
        <Icon d={ICON.phone} size={14} strokeWidth={1.4} />
        {T.mPhone}
      </button>
      {can.scan ? (
        <button type="button" className={s.method} onClick={onCapture}>
          <Icon d={ICON.scan} size={14} strokeWidth={1.4} />
          {T.mScan}
        </button>
      ) : null}
      {can.mail ? (
        <button type="button" className={s.method} onClick={onCapture}>
          <Icon d={ICON.mail} size={14} strokeWidth={1.4} />
          {T.mMail}
        </button>
      ) : null}
      <button type="button" className={s.method} onClick={onManual}>
        <Icon name="edit" size={14} strokeWidth={1.4} />
        {T.mManual}
      </button>
      <div className={s.grow} />
      <span className={cx('num', s.rateLine)}>{rateLine}</span>
    </div>
  );
}
