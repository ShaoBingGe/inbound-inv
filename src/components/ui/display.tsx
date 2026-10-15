import type { CSSProperties, HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react';
import { cx } from '@/lib/sample';
import { useT } from '@/i18n';
import s from './display.module.css';

export type Tone = 'blue' | 'red' | 'orange' | 'green' | 'gray' | 'purple';

export function Card({
  padded = true,
  className,
  as: Tag = 'section',
  ...rest
}: HTMLAttributes<HTMLElement> & { padded?: boolean; as?: 'section' | 'div' | 'article' | 'aside' }) {
  return <Tag className={cx(s.card, padded && s.padded, className)} {...rest} />;
}

/** 带标题的卡片区块 */
export function Section({
  title,
  desc,
  extra,
  children,
  className,
  id,
  padded = true,
}: {
  title: ReactNode;
  desc?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  padded?: boolean;
}) {
  return (
    <Card id={id} padded={padded} className={className} aria-label={typeof title === 'string' ? title : undefined}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>{title}</h2>
        {desc ? <span className={s.sectionDesc}>{desc}</span> : null}
        {extra ? <div className={s.sectionExtra}>{extra}</div> : null}
      </div>
      {children}
    </Card>
  );
}

export function Chip({ tone = 'gray', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cx(s.chip, s[tone], className)} {...rest} />;
}

export function Stat({
  label,
  value,
  sub,
  valueStyle,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  valueStyle?: CSSProperties;
}) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue} style={valueStyle}>
        {value}
      </span>
      {sub ? <span className={s.statSub}>{sub}</span> : null}
    </div>
  );
}

export function Table({
  className,
  hoverRows,
  wrapCells,
  ...rest
}: TableHTMLAttributes<HTMLTableElement> & { hoverRows?: boolean; wrapCells?: boolean }) {
  return (
    <div className={s.tableWrap}>
      <table className={cx(s.table, hoverRows && s.hoverRows, wrapCells && s.wrapCells, className)} {...rest} />
    </div>
  );
}

/** 表格单元格不换行：<td className={nowrapCell}> */
export const nowrapCell = s.nowrap;

export function Empty({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  const t = useT();
  return (
    <div className={s.empty}>
      <strong>{title ?? t('暂无数据')}</strong>
      {children}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return <span className={s.spinner} role="status" aria-label={label} />;
}

export function PageLoading() {
  const t = useT();
  return (
    <div className={s.pageLoading}>
      <Spinner label={t('加载中')} />
      <span>{t('加载中')}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const t = useT();
  return (
    <div className={s.errorBox} role="alert">
      <strong>{t('加载失败')}</strong>
      <div>{error.message}</div>
      {onRetry ? (
        <button type="button" onClick={onRetry} style={{ marginTop: 8 }}>
          {t('重试')}
        </button>
      ) : null}
    </div>
  );
}

export function Progress({ value, color, label }: { value: number; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={s.progress} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={s.progressBar} style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export interface TabItem<V extends string> {
  value: V;
  label: ReactNode;
}
export function Tabs<V extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  items: TabItem<V>[];
  value: V;
  onChange: (v: V) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={cx(s.tabs, className)} role="tablist" aria-label={ariaLabel}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={it.value === value}
          className={s.tab}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** 页面标题栏：面包屑 + 标题 + 右侧操作 */
export function PageHeader({
  crumb,
  title,
  subtitle,
  badges,
  actions,
  children,
}: {
  crumb?: ReactNode;
  title: ReactNode;
  /** 标题下方的一行说明 */
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={s.pageHeader}>
      <div style={{ minWidth: 0 }}>
        {crumb ? <div className="kick">{crumb}</div> : null}
        <h1 className={s.pageTitle}>{title}</h1>
        {subtitle ? <div className={s.pageSub}>{subtitle}</div> : null}
      </div>
      {badges}
      {actions ? <div className={s.pageActions}>{actions}</div> : null}
      {children}
    </header>
  );
}

/** 页面主体容器（统一内边距与最大宽度） */
export function PageBody({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cx(s.pageBody, className)} style={style}>
      {children}
    </div>
  );
}
