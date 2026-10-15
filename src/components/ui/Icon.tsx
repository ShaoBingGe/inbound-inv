import type { CSSProperties } from 'react';

/** 线性图标（stroke），路径与设计稿一致。新增图标：在 PATHS 里加一条。 */
const PATHS = {
  close: 'M18 6 6 18M6 6l12 12',
  chevronDown: 'm6 9 6 6 6-6',
  chevronLeft: 'm15 6-6 6 6 6',
  chevronRight: 'm9 6 6 6-6 6',
  globe: 'M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'm5 12 5 5 9-10',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  rotate: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5',
  folder: 'M3 6h6l2 2h10v11H3z',
  code: 'm8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  warn: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  invoice: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  agent: 'M12 2v4M5 8h14v12H5zM9 13h.01M15 13h.01M9 17h6',
  skill: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  d,
  size = 16,
  strokeWidth = 1.7,
  label,
  style,
  className,
}: {
  name?: IconName;
  /** 直接传 path（迁移设计稿中的自定义图标时使用） */
  d?: string;
  size?: number;
  strokeWidth?: number;
  /** 有意义的图标提供 label；装饰性图标省略 */
  label?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const path = d ?? (name ? PATHS[name] : '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={path} />
    </svg>
  );
}
