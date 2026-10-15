import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cx } from '@/lib/sample';
import s from './controls.module.css';

type Variant = 'default' | 'primary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

function btnClass(variant: Variant = 'default', size: Size = 'md', block?: boolean, iconOnly?: boolean, extra?: string) {
  return cx(
    s.btn,
    variant !== 'default' && s[variant],
    size !== 'md' && s[size],
    block && s.block,
    iconOnly && s.iconOnly,
    extra,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
  /** 只有图标时必须提供 aria-label */
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, icon, iconOnly, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={btnClass(variant, size, block, iconOnly, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
});

export interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

/** 外观为按钮的路由链接 */
export function ButtonLink({ variant, size, block, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={btnClass(variant, size, block, false, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export function LinkButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cx(s.linkBtn, className)} {...rest} />;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className, ...rest }, ref) {
  return <input ref={ref} className={cx(s.input, invalid && s.invalid, className)} aria-invalid={invalid || undefined} {...rest} />;
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <textarea ref={ref} className={cx(s.textarea, invalid && s.invalid, className)} aria-invalid={invalid || undefined} {...rest} />
  );
});

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options?: SelectOption[];
  onChange?: (value: string) => void;
}
export function Select({ options, onChange, className, children, ...rest }: SelectProps) {
  return (
    <select className={cx(s.select, className)} onChange={(e) => onChange?.(e.target.value)} {...rest}>
      {options
        ? options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  );
}

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  inline?: boolean;
  className?: string;
  /** 传入函数可拿到 id，绑定到输入控件 */
  children: ReactNode | ((id: string) => ReactNode);
}
export function Field({ label, hint, error, inline, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={cx(s.field, inline && s.fieldInline, className)}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      {typeof children === 'function' ? children(id) : children}
      {error ? <span className={s.error}>{error}</span> : hint ? <span className={s.hint}>{hint}</span> : null}
    </div>
  );
}

export interface SegOption<V extends string> {
  value: V;
  label: ReactNode;
  disabled?: boolean;
}
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegOption<V>[];
  value: V;
  onChange: (v: V) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={cx(s.seg, className)} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={s.switch}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className={s.switchTrack} aria-hidden="true" />
      {label}
    </label>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={s.check}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
