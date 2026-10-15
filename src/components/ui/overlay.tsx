import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/sample';
import { useT } from '@/i18n';
import { Icon } from './Icon';
import s from './overlay.module.css';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

function useFocusOnOpen<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus?.();
  }, [open]);
  return ref;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** 宽度（px），默认 640；size="full" 时铺满视口留 16px 边距 */
  width?: number;
  size?: 'default' | 'full';
  headerExtra?: ReactNode;
  bodyStyle?: CSSProperties;
}

export function Modal({ open, onClose, title, children, footer, width, size = 'default', headerExtra, bodyStyle }: ModalProps) {
  const t = useT();
  useEscape(open, onClose);
  const ref = useFocusOnOpen<HTMLDivElement>(open);
  if (!open) return null;
  return createPortal(
    <>
      <button type="button" className={s.backdrop} aria-label={t('关闭')} onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cx(s.modal, size === 'full' && s.full)}
        style={width ? ({ '--modal-w': `${width}px` } as CSSProperties) : undefined}
      >
        <div className={s.head}>
          <div className={s.title}>{title}</div>
          {headerExtra}
          <button type="button" className={s.close} onClick={onClose} aria-label={t('关闭')}>
            <Icon name="close" />
          </button>
        </div>
        <div className={s.body} style={bodyStyle}>
          {children}
        </div>
        {footer ? <div className={s.foot}>{footer}</div> : null}
      </div>
    </>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width,
}: Omit<ModalProps, 'size' | 'headerExtra' | 'bodyStyle'>) {
  const t = useT();
  useEscape(open, onClose);
  const ref = useFocusOnOpen<HTMLElement>(open);
  if (!open) return null;
  return createPortal(
    <>
      <button type="button" className={cx(s.backdrop, s.drawerBackdrop)} aria-label={t('关闭')} onClick={onClose} />
      <aside
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-label={typeof title === 'string' ? title : undefined}
        className={s.drawer}
        style={width ? ({ '--drawer-w': `${width}px` } as CSSProperties) : undefined}
      >
        <div className={s.head}>
          <div className={s.title}>{title}</div>
          <button type="button" className={s.close} onClick={onClose} aria-label={t('关闭')}>
            <Icon name="close" />
          </button>
        </div>
        <div className={s.body}>{children}</div>
        {footer ? <div className={s.foot}>{footer}</div> : null}
      </aside>
    </>,
    document.body,
  );
}

/** 点击按钮弹出的浮层（菜单、筛选面板） */
export function Popover({
  trigger,
  children,
  align = 'end',
  width,
}: {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  children: (p: { close: () => void }) => ReactNode;
  align?: 'start' | 'end';
  width?: number | string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEscape(open, close);
  return (
    <div className={s.popWrap}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <>
          <div className={s.popBackdrop} aria-hidden="true" onClick={close} />
          <div className={cx(s.pop, align === 'start' && s.popStart)} style={{ width }}>
            {children({ close })}
          </div>
        </>
      ) : null}
    </div>
  );
}

interface ToastItem {
  id: number;
  text: string;
  error?: boolean;
}
const ToastContext = createContext<(text: string, opts?: { error?: boolean; ms?: number }) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string, opts?: { error?: boolean; ms?: number }) => {
    const id = ++seq.current;
    setItems((xs) => [...xs, { id, text, error: opts?.error }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), opts?.ms ?? 2600);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className={s.toasts} role="status" aria-live="polite">
        {items.map((x) => (
          <div key={x.id} className={cx(s.toast, x.error && s.toastError)}>
            {x.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** const toast = useToast(); toast(t('已保存')) */
export function useToast() {
  return useContext(ToastContext);
}
