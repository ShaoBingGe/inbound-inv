import type { ReactNode } from 'react';
import { Button, Field, Input, Modal } from '@/components/ui';
import { useT } from '@/i18n';
import s from '../DataOpsPage.module.css';

export interface ConfirmDialogDef {
  title: string;
  body: string;
  okLabel: string;
  tone: 'primary' | 'danger';
  /** 需要输入口令确认时的口令（数据中心编码 / ROTATE / RESET） */
  ackWord?: string;
  blocked: boolean;
  fields?: ReactNode;
  onOk: () => void;
}

/** 设计稿中的统一确认弹窗：说明 + 可选表单 + 可选输入口令确认 */
export function ConfirmDialog({
  def,
  ack,
  onAck,
  busy,
  onClose,
}: {
  def: ConfirmDialogDef | null;
  ack: string;
  onAck: (v: string) => void;
  busy: boolean;
  onClose: () => void;
}) {
  const t = useT();
  if (!def) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={def.title}
      width={480}
      footer={
        <>
          <Button onClick={onClose}>{t('取消')}</Button>
          <Button variant={def.tone} onClick={def.onOk} disabled={def.blocked || busy}>
            {def.okLabel}
          </Button>
        </>
      }
    >
      <div className={s.dlgBody}>{def.body}</div>
      {def.fields ? <div className={s.dlgFields}>{def.fields}</div> : null}
      {def.ackWord ? (
        <div className={s.dlgAck}>
          <Field
            label={
              <>
                {t('输入')} <span className="mono">{def.ackWord}</span> {t('以确认')}
              </>
            }
          >
            {(id) => (
              <Input
                id={id}
                className="mono"
                value={ack}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => onAck(e.target.value)}
              />
            )}
          </Field>
        </div>
      ) : null}
    </Modal>
  );
}
