import { useEffect, useRef } from 'react';
import { Button, Icon } from '@/components/ui';
import { cx } from '@/lib/sample';
import type { QrView, StepState } from '../model';
import { ICON } from './icons';
import s from './QrDialog.module.css';

const STEP_CLASS: Record<StepState, string> = { done: s.stepDone, current: s.stepCurrent, todo: s.stepTodo };

/**
 * 手机拍票二维码弹窗。与设计稿一致，遮罩只覆盖导入窗口本身：
 * 右侧手机预览（第二块屏）在弹窗打开时仍可操作。
 */
export function QrDialog({
  v,
  closeLabel,
  onClose,
  onAdvance,
}: {
  v: QrView;
  closeLabel: string;
  onClose: () => void;
  onAdvance: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);

  return (
    <div className={s.overlay}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="false" aria-label={v.title} className={s.dialog}>
        <div className={s.head}>
          <div>
            <div className={s.title}>{v.title}</div>
            <div className={s.sub}>{v.sub}</div>
          </div>
          <button type="button" className={s.close} onClick={onClose} aria-label={closeLabel}>
            <Icon name="close" size={15} strokeWidth={1.5} />
          </button>
        </div>

        <div className={s.body}>
          <div className={s.codeCol}>
            <div className={s.codeBox}>
              <QrCode seed={v.seed} />
              {v.scanned ? (
                <div className={s.scanned}>
                  <div>
                    <Icon d={ICON.tick} size={30} strokeWidth={1.6} />
                    <div className={s.statusLabel}>{v.statusLabel}</div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className={cx('num', s.expire)}>{v.expire}</div>
          </div>

          <div className={s.info}>
            <div className={s.chrome}>
              <Icon d={ICON.chrome} size={16} strokeWidth={1.5} style={{ flex: 'none', marginTop: 1 }} />
              <div>{v.chrome}</div>
            </div>

            <dl className={s.facts}>
              <dt className="kick">{v.geoLabel}</dt>
              <dd>{v.geoValue}</dd>
              <dt className="kick">{v.localeLabel}</dt>
              <dd>{v.localeValue}</dd>
              <dt className="kick">{v.apiLabel}</dt>
              <dd className="num">{v.apiValue}</dd>
            </dl>

            <ol className={s.steps}>
              {v.steps.map((st) => (
                <li key={st.n} className={cx(s.step, STEP_CLASS[st.state])}>
                  <span className={cx('num', s.stepNo)}>{st.n}</span>
                  <span className={s.stepLabel}>{st.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className={s.foot}>
          <span className={cx('num', s.footNote)}>{v.foot}</span>
          <Button onClick={onClose}>{closeLabel}</Button>
          <Button variant="primary" onClick={onAdvance}>
            {v.advanceLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 二维码图形：装饰性矩阵（与设计稿同一算法），不参与编辑 */
function QrCode({ seed }: { seed: number }) {
  const N = 25;
  const c = 5;
  const pad = 6;
  const rnd = (x: number, y: number) => {
    const v = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + seed) * 43758.5453;
    return v - Math.floor(v);
  };
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (inFinder(x, y) || rnd(x, y) < 0.52) continue;
      cells.push({ x, y });
    }
  }
  const finders: [number, number][] = [
    [0, 0],
    [N - 7, 0],
    [0, N - 7],
  ];
  const size = N * c + pad * 2;
  return (
    <svg width={137} height={137} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={s.qr}>
      {cells.map((p) => (
        <rect key={p.x + '_' + p.y} x={pad + p.x * c} y={pad + p.y * c} width={c} height={c} fill="currentColor" />
      ))}
      {finders.map(([ox, oy]) => (
        <g key={ox + '_' + oy}>
          <rect
            x={pad + ox * c + c / 2}
            y={pad + oy * c + c / 2}
            width={c * 6}
            height={c * 6}
            fill="none"
            stroke="currentColor"
            strokeWidth={c}
          />
          <rect x={pad + (ox + 2) * c} y={pad + (oy + 2) * c} width={c * 3} height={c * 3} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
