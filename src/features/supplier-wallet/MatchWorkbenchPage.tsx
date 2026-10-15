import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  ButtonLink,
  Chip,
  ErrorState,
  Icon,
  Input,
  Modal,
  PageBody,
  PageHeader,
  PageLoading,
  Segmented,
  Select,
  useToast,
} from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/auth/AuthProvider';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { useAsync } from '@/lib/useAsync';
import { createAdjustments, deleteMatchGroup, fetchWorkbench, pushWorkbenchToAp, saveWorkbench } from './match/api';
import { ADJ_LABEL, LINE_HINT_LABEL } from './match/data';
import {
  cny,
  effectiveHint,
  findInvLine,
  fitTone,
  groupOf,
  inbLineHasDiff,
  invLineHasDiff,
  lineDeviation,
  lineResult,
  linkedSets,
  signedPct,
  summarize,
  toggleDraftEndpoint,
  toggleLinkEndpoint,
  type LineResult,
} from './match/logic';
import type {
  AdjDoc,
  AdjType,
  LineFilter,
  LineHint,
  WbDoc,
  WbInbLine,
  WbInvLine,
  WbLink,
  Workbench,
} from './match/types';
import s from './MatchWorkbenchPage.module.css';

type Side = 'inv' | 'inb';
type ModalKind = 'addInv' | 'addInb' | 'delete' | 'adjust' | 'push' | 'save' | null;

const RESULT_LABEL: Record<LineResult, string> = {
  full: '完全匹配',
  partial: '未完全匹配',
  unmatched: '未匹配',
};
const FILTERS: LineFilter[] = ['all', 'suggest', 'diff', 'none'];
const ADJ_TYPES: AdjType[] = ['price', 'return', 'rounding', 'discount'];
const qtyStr = (v: number, unit: string) => `${v > 0 ? '+' : ''}${v} ${unit}`;

export default function MatchWorkbenchPage() {
  const { groupId = '' } = useParams();
  const wb = useAsync(() => fetchWorkbench(groupId), [groupId]);
  if (wb.error) return <ErrorState error={wb.error} onRetry={wb.reload} />;
  if (!wb.data || wb.data.mg !== groupId) return <PageLoading />;
  return <WorkbenchView key={groupId} initial={wb.data} />;
}

/** 三单匹配 · 手工匹配工作台：左侧发票行 / 右侧入库行，中间连线表示匹配对 */
function WorkbenchView({ initial }: { initial: Workbench }) {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mg = initial.mg;

  const [invDocs, setInvDocs] = useState(initial.invoices);
  const [inbDocs, setInbDocs] = useState(initial.inbounds);
  const [links, setLinks] = useState<WbLink[]>(initial.links);
  const [cardFilter, setCardFilter] = useState<Record<string, LineFilter>>({});
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [curLink, setCurLink] = useState<string | null>(null);
  const [forceNone, setForceNone] = useState<Record<string, boolean>>({});
  const [diffLine, setDiffLine] = useState<string | null>(null);
  const [edit, setEdit] = useState<{
    id: string;
    x: number;
    y: number;
    val: string;
  } | null>(null);
  const [autoSide, setAutoSide] = useState<Side | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [locked, setLocked] = useState(initial.locked);
  const [apNo, setApNo] = useState(initial.apNo);
  const [savedAt, setSavedAt] = useState(initial.savedAt ?? '');
  const [adjDocs, setAdjDocs] = useState<AdjDoc[]>(initial.adjDocs);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const matchRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const labelPos = useRef<Record<string, { x: number; y: number }>>({});

  const sum = useMemo(() => summarize(invDocs, inbDocs, links), [invDocs, inbDocs, links]);
  const linked = useMemo(() => linkedSets(links), [links]);
  const cur = links.find((g) => g.id === curLink);
  const pend = useMemo(() => new Set(cur ? [...cur.inv, ...cur.inb] : []), [cur]);
  const activeLinks = useMemo(() => {
    const id = selectedLink ?? activeGroup;
    return id ? links.filter((g) => g.id === id) : [];
  }, [links, selectedLink, activeGroup]);
  const activeIds = useMemo(() => new Set(activeLinks.flatMap((g) => [...g.inv, ...g.inb])), [activeLinks]);
  const diffInv = diffLine ? findInvLine(invDocs, diffLine) : undefined;
  const diffInbSet = useMemo(() => new Set(diffLine ? (groupOf(links, diffLine)?.inb ?? []) : []), [links, diffLine]);

  const guard = (msg = '已推送应付，匹配组不可修改') => {
    if (locked) toast(t(msg));
    return locked;
  };

  const startEdit = useCallback(
    (id: string) => {
      const p = labelPos.current[id];
      const g = links.find((x) => x.id === id);
      if (!p || !g) return;
      setEdit({ id, x: p.x, y: p.y, val: g.ratio });
      setSelectedLink(id);
      setActiveGroup(id);
    },
    [links],
  );

  /* ---------- 连线绘制（按 DOM 位置画 SVG 曲线；滚动、缩放时重画） ---------- */
  const draw = useCallback(() => {
    const svg = svgRef.current;
    const host = matchRef.current;
    if (!svg || !host) return;
    svg.replaceChildren();
    labelPos.current = {};
    const box = host.getBoundingClientRect();
    const NS = 'http://www.w3.org/2000/svg';
    const pos = (lid: string) => {
      const el = host.querySelector(`[data-lid="${CSS.escape(lid)}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        left: r.left - box.left,
        right: r.right - box.left,
        mid: r.top + r.height / 2 - box.top,
      };
    };
    activeLinks.forEach((g) => {
      const sel = g.id === selectedLink;
      const color = g.kind === 'n:n' || sel ? 'var(--amber)' : 'var(--accent)';
      const invPts = g.inv.map(pos).filter((p): p is NonNullable<typeof p> => !!p);
      const inbPts = g.inb.map(pos).filter((p): p is NonNullable<typeof p> => !!p);
      if (!invPts.length || !inbPts.length) return;
      const ends = (a: (typeof invPts)[number], b: (typeof inbPts)[number]) => {
        const ltr = a.left < b.left;
        return {
          x1: ltr ? a.right : a.left,
          x2: ltr ? b.left : b.right,
          y1: a.mid,
          y2: b.mid,
        };
      };
      invPts.forEach((a) =>
        inbPts.forEach((b) => {
          const { x1, x2, y1, y2 } = ends(a, b);
          const cxm = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${cxm} ${y1} ${cxm} ${y2} ${x2} ${y2}`;
          const p = document.createElementNS(NS, 'path');
          p.setAttribute('d', d);
          p.setAttribute('fill', 'none');
          p.setAttribute('stroke-width', sel ? '2.6' : '1.8');
          p.setAttribute('stroke-linecap', 'round');
          p.style.stroke = color;
          const hit = document.createElementNS(NS, 'path');
          hit.setAttribute('d', d);
          hit.setAttribute('fill', 'none');
          hit.setAttribute('stroke', 'transparent');
          hit.setAttribute('stroke-width', '14');
          hit.style.pointerEvents = 'stroke';
          hit.style.cursor = 'pointer';
          hit.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelectedLink(g.id);
            setActiveGroup(g.id);
          });
          svg.append(p, hit);
        }),
      );
      const { x1, x2, y1, y2 } = ends(invPts[0], inbPts[0]);
      const lx = (x1 + x2) / 2;
      const ly = (y1 + y2) / 2;
      labelPos.current[g.id] = { x: lx, y: ly };
      const w = Math.max(58, g.ratio.length * 8 + 20);
      const lg = document.createElementNS(NS, 'g');
      lg.style.pointerEvents = 'all';
      lg.style.cursor = 'text';
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', String(lx - w / 2));
      rect.setAttribute('y', String(ly - 11));
      rect.setAttribute('width', String(w));
      rect.setAttribute('height', '22');
      rect.setAttribute('rx', '7');
      rect.setAttribute('stroke-width', '1.2');
      rect.style.fill = 'var(--surface)';
      rect.style.stroke = color;
      const txt = document.createElementNS(NS, 'text');
      txt.setAttribute('x', String(lx));
      txt.setAttribute('y', String(ly + 4));
      txt.setAttribute('text-anchor', 'middle');
      txt.style.fill = color;
      txt.style.font = '700 11px var(--font-sans)';
      txt.textContent = g.ratio;
      lg.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedLink(g.id);
        setActiveGroup(g.id);
      });
      lg.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (locked) return;
        setEdit({ id: g.id, x: lx, y: ly, val: g.ratio });
        setSelectedLink(g.id);
        setActiveGroup(g.id);
      });
      lg.append(rect, txt);
      svg.append(lg);
    });
  }, [activeLinks, selectedLink, locked]);

  useLayoutEffect(() => {
    draw();
  });
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const on = () => requestAnimationFrame(() => drawRef.current());
    const els = [leftRef.current, rightRef.current];
    els.forEach((el) => el?.addEventListener('scroll', on, { passive: true }));
    window.addEventListener('resize', on);
    return () => {
      els.forEach((el) => el?.removeEventListener('scroll', on));
      window.removeEventListener('resize', on);
    };
  }, []);
  useEffect(() => {
    if (!autoSide) return;
    const timer = setTimeout(() => setAutoSide(null), 1000);
    return () => clearTimeout(timer);
  }, [autoSide]);

  /* ---------- 交互 ---------- */
  const clickLine = (side: Side, lid: string, st: LineHint) => {
    if (selectedLink) {
      if (guard()) return;
      const r = toggleLinkEndpoint(links, selectedLink, side, lid);
      setLinks(r.links);
      setForceNone((fn) => {
        const n = { ...fn };
        delete n[lid];
        r.dissolved?.forEach((x) => (n[x] = true));
        return n;
      });
      if (r.dissolved) {
        setSelectedLink(null);
        setActiveGroup(null);
        toast(t('连线两端已清空，连线已删除，相关明细行已置为无法匹配'));
      }
      return;
    }
    const other: Side = side === 'inv' ? 'inb' : 'inv';
    const otherDocs = other === 'inv' ? invDocs : inbDocs;
    setCardFilter((cf) => ({
      ...cf,
      ...Object.fromEntries(otherDocs.map((d) => [d.id, st])),
    }));
    setAutoSide(other);
    const scroller = other === 'inv' ? leftRef.current : rightRef.current;
    requestAnimationFrame(() => scroller?.scrollTo?.({ top: 0, behavior: 'smooth' }));

    if (st === 'none') {
      if (guard()) return;
      const r = toggleDraftEndpoint(links, curLink, side, lid, `gm${++seq.current}`);
      setLinks(r.links);
      setCurLink(r.curId);
      setActiveGroup(r.curId);
      return;
    }
    const g = groupOf(links, lid);
    const off = !!g && activeGroup === g.id;
    setActiveGroup(g && !off ? g.id : null);
    setCurLink(null);
    setDiffLine(g && !off && side === 'inv' ? lid : null);
  };

  const commitRatio = () => {
    if (!edit) return;
    const val = edit.val.trim() || '1 : 1';
    setLinks((ls) => ls.map((g) => (g.id === edit.id ? { ...g, ratio: val } : g)));
    setEdit(null);
  };

  const deleteLink = () => {
    if (!selectedLink || guard()) return;
    const g = links.find((x) => x.id === selectedLink);
    setForceNone((fn) => ({
      ...fn,
      ...Object.fromEntries((g ? [...g.inv, ...g.inb] : []).map((x) => [x, true])),
    }));
    setLinks((ls) => ls.filter((x) => x.id !== selectedLink));
    setSelectedLink(null);
    setActiveGroup(null);
    toast(t('连线已删除，两侧相关明细行已置为无法匹配'));
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    } finally {
      setBusy(false);
    }
  };

  /* ---------- 明细行渲染 ---------- */
  const renderDoc = <L extends WbInvLine | WbInbLine>(doc: WbDoc<L>, side: Side) => {
    const cf = cardFilter[doc.id] ?? 'all';
    const lines = doc.lines.filter((l) => {
      const isLinked = side === 'inv' ? linked.inv.has(l.id) : linked.inb.has(l.id);
      const st = effectiveHint(l.id, l.st, isLinked, forceNone);
      return cf === 'all' || st === cf || pend.has(l.id) || activeIds.has(l.id);
    });
    const remove = () => {
      if (guard()) return;
      if (side === 'inv') setInvDocs((ds) => ds.filter((d) => d.id !== doc.id));
      else setInbDocs((ds) => ds.filter((d) => d.id !== doc.id));
    };
    return (
      <article key={doc.id} className={s.doc} aria-label={doc.id}>
        <div className={cx(s.docHead, side === 'inb' && s.docHeadInb)}>
          <div className={s.docTop}>
            <span className={cx('mono', s.docId)}>{doc.id}</span>
            <span className={s.docTools}>
              <Chip tone={side === 'inv' ? 'blue' : 'green'}>
                <span translate="no">{doc.tag}</span>
              </Chip>
              <Button size="sm" variant="ghost" iconOnly aria-label={t('移出') + ' ' + doc.id} onClick={remove}>
                <Icon name="minus" size={14} />
              </Button>
            </span>
          </div>
          <div className={s.docSub}>
            <span translate="no">{doc.party}</span>
            {side === 'inb' ? t('收货') : ''} · <span className="num">{doc.date}</span>
          </div>
          <Segmented<LineFilter>
            className={s.filters}
            ariaLabel={t('筛选明细行')}
            value={cf}
            onChange={(v) => setCardFilter((x) => ({ ...x, [doc.id]: v }))}
            options={FILTERS.map((f) => ({
              value: f,
              label: t(f === 'all' ? '全部' : LINE_HINT_LABEL[f]),
            }))}
          />
        </div>
        <div className={s.lines}>
          {lines.map((l) => (side === 'inv' ? renderInvLine(l as WbInvLine) : renderInbLine(l as WbInbLine)))}
        </div>
      </article>
    );
  };

  const lineClass = (lid: string, st: LineHint, side: Side) =>
    cx(
      s.line,
      st === 'diff' && s.lineDiff,
      activeIds.has(lid) && s.lineOn,
      pend.has(lid) && s.linePend,
      autoSide === side && s.lineAnim,
    );

  const dot = (r: LineResult, cls: string) => (
    <>
      <span className={cx(s.dot, s[`dot_${r}`], cls)} aria-hidden="true" />
      <span className="sr-only">{t(RESULT_LABEL[r])}</span>
    </>
  );

  const renderInvLine = (l: WbInvLine) => {
    const isLinked = linked.inv.has(l.id);
    const st = effectiveHint(l.id, l.st, isLinked, forceNone);
    const res = lineResult(isLinked, invLineHasDiff(l));
    return (
      <button
        key={l.id}
        type="button"
        data-lid={l.id}
        className={lineClass(l.id, st, 'inv')}
        aria-pressed={activeIds.has(l.id) || pend.has(l.id)}
        onClick={() => clickLine('inv', l.id, st)}
      >
        <span className={s.lineTop}>
          <span className={s.lineName} translate="no">
            {l.name}
          </span>
          {st !== 'none' ? (
            <>
              <span className={cx('num', s.mPct, s[`ink_${fitTone(l.amtM)}`])}>
                {t('额')}
                {Math.round(l.amtM)}%
              </span>
              <span className={cx('num', s.mPct, s[`ink_${fitTone(l.qtyM)}`])}>
                {t('量')}
                {Math.round(l.qtyM)}%
              </span>
            </>
          ) : null}
          {dot(res, s.dotEnd)}
        </span>
        <span className={s.lineBottom}>
          <span className={s.lineSpec} translate="no">
            {l.spec} · {l.qty}
          </span>
          <span className={cx('num', s.lineAmt)}>{cny(l.amt)}</span>
        </span>
      </button>
    );
  };

  const renderInbLine = (l: WbInbLine) => {
    const isLinked = linked.inb.has(l.id);
    const st = effectiveHint(l.id, l.st, isLinked, forceNone);
    const res = lineResult(isLinked, inbLineHasDiff(l.id, links, invDocs));
    const showDiff = !!diffInv && diffInbSet.has(l.id) && invLineHasDiff(diffInv);
    return (
      <button
        key={l.id}
        type="button"
        data-lid={l.id}
        className={lineClass(l.id, st, 'inb')}
        aria-pressed={activeIds.has(l.id) || pend.has(l.id)}
        onClick={() => clickLine('inb', l.id, st)}
      >
        <span className={s.lineTop}>
          {dot(res, s.dotStart)}
          {showDiff && diffInv ? (
            <>
              <span className={cx('num', s.mPct, s.ink_red)}>
                {t('额差')}
                {cny(diffInv.amtDiff)}
              </span>
              <span className={cx('num', s.mPct, s.ink_orange)}>
                {t('量差')}
                <span translate="no">{qtyStr(diffInv.qtyDiff, diffInv.unit)}</span>
              </span>
            </>
          ) : null}
          <span className={s.lineName} translate="no">
            {l.name}
          </span>
        </span>
        <span className={s.lineBottom}>
          <span className={cx('num', s.lineAmt)}>{cny(l.amt)}</span>
          <span className={s.lineSpec} translate="no">
            {l.spec} · {l.qty}
          </span>
        </span>
        <span className={s.bal}>
          <span className={s.balTag}>
            {t('剩余')} <span translate="no">{l.bal}</span>
          </span>
          <span className={cx('num', s.balTag)}>
            {t('剩余')} {cny(l.balAmt)}
          </span>
        </span>
      </button>
    );
  };

  /* ---------- 选中行详情 ---------- */
  const dev = diffInv ? lineDeviation(diffInv) : null;
  const selLink = links.find((x) => x.id === selectedLink);

  const summary: Array<{
    title: string;
    num: ReactNode;
    unit?: string;
    tone?: string;
    sub: ReactNode;
  }> = [
    {
      title: '组内发票数',
      num: sum.invDocs,
      unit: '张',
      sub: (
        <>
          {t('发票行数')} <b className={s.ink_blue}>{sum.invLines}</b>
        </>
      ),
    },
    {
      title: '入库单数',
      num: sum.inbDocs,
      unit: '单',
      sub: (
        <>
          {t('入库行数')} <b className={s.ink_blue}>{sum.inbLines}</b>
        </>
      ),
    },
    {
      title: '已匹配 / 总发票行',
      num: `${sum.matchedInvLines} / ${sum.invLines}`,
      tone: 'green',
      sub: (
        <>
          {t('行级匹配率')} <b className={s.ink_green}>{sum.lineRate}%</b>
        </>
      ),
    },
    {
      title: '剩余未完全匹配发票行',
      num: sum.remainInvLines,
      unit: '行',
      tone: 'orange',
      sub: t('待处理发票行'),
    },
    {
      title: '剩余未完全匹配入库行',
      num: sum.remainInbLines,
      unit: '行',
      tone: 'orange',
      sub: t('待处理入库行'),
    },
    {
      title: '已匹配金额',
      num: cny(sum.matchedInvAmt),
      tone: 'green',
      sub: (
        <>
          {t('差异')} {cny(sum.diff)} ·{' '}
          <b className={sum.hasDiff ? s.ink_red : s.ink_green}>{sum.hasDiff ? `${sum.diffRatio.toFixed(2)}%` : '0%'}</b>{' '}
          {t('差异比例')}
        </>
      ),
    },
  ];

  const pushOrView = () => {
    if (locked) navigate(ROUTES.supplierWalletView('ap', apNo));
    else setModal('push');
  };

  return (
    <>
      <PageHeader
        crumb={`${t('票池')} / ${t('供应商票夹')} / ${t('三单匹配')}`}
        title={t('手工匹配工作台')}
        badges={
          <div className={s.headBadges}>
            <Chip tone="gray" className="mono">
              {mg}
            </Chip>
            <Chip tone="blue">{t('手工模式')}</Chip>
            {locked ? <Chip tone="purple">{t('已推送应付 · 不可修改')}</Chip> : null}
          </div>
        }
        actions={
          <>
            <ButtonLink to={ROUTES.supplierWalletView('match')} icon={<Icon name="chevronLeft" size={14} />}>
              {t('返回匹配列表')}
            </ButtonLink>
            <Button
              variant="danger"
              icon={<Icon name="trash" size={14} />}
              onClick={() => !guard('已推送应付，匹配组不可删除') && setModal('delete')}
            >
              {t('删除匹配组')}
            </Button>
          </>
        }
      />
      <PageBody className={s.body}>
        <div className={s.pair}>
          <span translate="no">{initial.pairFrom}</span>
          <span className={s.pairArrow} aria-label={t('购 → 销')}>
            {t('购')}
            <b aria-hidden="true">→</b>
            {t('销')}
          </span>
          <span translate="no">{initial.pairTo}</span>
          <ButtonLink size="sm" className={s.trainLink} to={ROUTES.supplierWalletView('drugs')}>
            {t('查看历史数据训练情况')}
          </ButtonLink>
        </div>

        <div className={s.summary} role="group" aria-label={t('匹配组看板')}>
          {summary.map((x) => (
            <div key={x.title} className={s.sum}>
              <div className={s.sumTitle}>{t(x.title)}</div>
              <div className={s.sumNum}>
                <span className={cx('num', x.tone && s[`ink_${x.tone}`])}>{x.num}</span>
                {x.unit ? <span className={s.sumUnit}>{t(x.unit)}</span> : null}
              </div>
              <div className={cx('num', s.sumSub)}>{x.sub}</div>
            </div>
          ))}
        </div>

        <div ref={matchRef} className={s.match}>
          <svg ref={svgRef} className={s.svg} aria-hidden="true" />
          {diffInv && dev ? (
            <div className={s.sel} role="status">
              <div className={s.selTop}>
                <span>{t('选中发票行 · 匹配明细')}</span>
                <Chip tone={dev.full ? 'green' : 'red'}>{t(dev.full ? '完全匹配' : '存在差异')}</Chip>
              </div>
              <div className={cx(s.selName, s.ellipsis)} translate="no">
                {diffInv.name}
              </div>
              <div className={s.docSub} translate="no">
                {diffInv.spec} · {diffInv.qty}
              </div>
              <div className={s.selPcts}>
                <div className={cx(s.selPct, s.pctAmt)}>
                  <b className="num">{signedPct(dev.amtPct, 1)}</b>
                  {t('金额差比例')}
                </div>
                <div className={cx(s.selPct, s.pctQty)}>
                  <b className="num">{signedPct(dev.qtyPct, 1)}</b>
                  {t('数量差比例')}
                </div>
                <div className={cx(s.selPct, s.pctPrice)}>
                  <b className="num">{signedPct(dev.pricePct, 1)}</b>
                  {t('单价差比例')}
                </div>
              </div>
              <div className={s.selDiffs}>
                <span>
                  {t('金额差')} <b className={cx('num', s.ink_red)}>{cny(diffInv.amtDiff)}</b>
                </span>
                <span>
                  {t('数量差')}{' '}
                  <b className={cx('num', s.ink_orange)} translate="no">
                    {qtyStr(diffInv.qtyDiff, diffInv.unit)}
                  </b>
                </span>
              </div>
            </div>
          ) : null}
          {edit ? (
            <Input
              autoFocus
              className={s.ratioInput}
              style={{ left: edit.x, top: edit.y }}
              aria-label={t('换算比例')}
              value={edit.val}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setEdit({ ...edit, val: e.target.value })}
              onBlur={commitRatio}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitRatio();
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  setEdit(null);
                }
              }}
            />
          ) : null}

          <section className={s.col} aria-labelledby="wb-inv">
            <div className={s.colHead}>
              <h2 id="wb-inv" className={s.colTitle}>
                {t('采购发票（全量收到）')}
              </h2>
              <span className={s.colMeta}>
                <span className="num">{t(sum.invLines + ' 明细行')}</span>
                <Button size="sm" icon={<Icon name="plus" size={13} />} onClick={() => !guard() && setModal('addInv')}>
                  {t('添加发票')}
                </Button>
              </span>
            </div>
            <div ref={leftRef} className={cx(s.scroll, s.scrollInv)}>
              {invDocs.map((d) => renderDoc(d, 'inv'))}
            </div>
          </section>

          <div className={s.center}>
            <div>
              <div>
                {t('点击「建议匹配」')}
                <br />
                {t('明细行展开连线')}
              </div>
              <ul className={s.legend}>
                {(['full', 'partial', 'unmatched'] as LineResult[]).map((r) => (
                  <li key={r}>
                    <span className={cx(s.dot, s[`dot_${r}`])} aria-hidden="true" />
                    {t(RESULT_LABEL[r])}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <section className={s.col} aria-labelledby="wb-inb">
            <div className={s.colHead}>
              <h2 id="wb-inb" className={s.colTitle}>
                {t('建议入库单')}
              </h2>
              <Button size="sm" icon={<Icon name="plus" size={13} />} onClick={() => !guard() && setModal('addInb')}>
                {t('添加入库单')}
              </Button>
            </div>
            <div ref={rightRef} className={cx(s.scroll, s.scrollInb)}>
              {inbDocs.map((d) => renderDoc(d, 'inb'))}
            </div>
          </section>
        </div>

        {adjDocs.length ? (
          <div className={s.adjBar}>
            <span className={s.adjTitle}>
              {t('已生成差额单')} · {adjDocs.length}
            </span>
            {adjDocs.map((d) => {
              const g = groupOf(links, d.lid);
              const on = !!g && activeGroup === g.id;
              const meta = ADJ_LABEL[d.type];
              return (
                <button
                  key={d.id}
                  type="button"
                  className={cx(s.adjDoc, on && s.adjDocOn)}
                  aria-pressed={on}
                  onClick={() => {
                    if (!g) {
                      toast(t('未找到该差额行对应的匹配连线'));
                      return;
                    }
                    setActiveGroup(on ? null : g.id);
                    setSelectedLink(null);
                    setCurLink(null);
                    setDiffLine(on ? null : d.lid);
                    if (!on)
                      matchRef.current
                        ?.querySelector(`[data-lid="${CSS.escape(d.lid)}"]`)
                        ?.scrollIntoView({ block: 'nearest' });
                  }}
                >
                  <span className="mono">{d.id}</span>
                  <Chip tone={meta.tone}>{t(meta.label)}</Chip>
                  <span className="mono">
                    {t('对应发票')} {d.invId}
                  </span>
                  <span translate="no">{d.name}</span>
                  <b className={cx('num', s.ink_red)}>{cny(d.amt)}</b>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className={s.bar}>
          {selectedLink && selLink ? (
            <div className={s.linkBar} role="status">
              <span>
                {t('已选连线')} {selLink.kind} · <span translate="no">{selLink.ratio}</span>
                {t('：点左右明细行增减端点，双击连线上的比例可编辑')}
              </span>
              {!locked ? (
                <Button size="sm" icon={<Icon name="edit" size={13} />} onClick={() => startEdit(selLink.id)}>
                  {t('编辑比例')}
                </Button>
              ) : null}
              <Button
                size="sm"
                onClick={() => {
                  setSelectedLink(null);
                  setActiveGroup(null);
                  setCurLink(null);
                }}
              >
                {t('完成')}
              </Button>
              {!locked ? (
                <Button size="sm" variant="danger" onClick={deleteLink}>
                  {t('删除连线')}
                </Button>
              ) : null}
            </div>
          ) : cur ? (
            <div className={s.linkBar} role="status">
              <span>
                {cur.inv.length && cur.inb.length ? (
                  <>
                    {t('已自动生成连线（')}
                    {cur.kind} · <span translate="no">{cur.ratio}</span>
                    {t('）：双击连线上的比例可修改，点「保存并更新匹配结果」即可')}
                  </>
                ) : (
                  t(
                    '手工建立连接：已选 发票 ' +
                      cur.inv.length +
                      ' 行 / 入库 ' +
                      cur.inb.length +
                      ' 行，请在另一侧选择明细行',
                  )
                )}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setCurLink(null);
                  setSelectedLink(null);
                  setActiveGroup(null);
                }}
              >
                {t('清除选择')}
              </Button>
            </div>
          ) : null}

          <div className={s.barStats}>
            <div className={s.barStat}>
              {t('发票未匹配')}
              <b className="num">
                {sum.invLeftLines} {t('明细行')} · {cny(sum.invLeftAmt)}
              </b>
            </div>
            <div className={s.barStat}>
              {t('入库未匹配')}
              <b className="num">
                {sum.inbLeftLines} {t('明细行')} · {cny(sum.inbLeftAmt)}
              </b>
            </div>
            <div className={s.barStat}>
              {t('已匹配金额差')}
              <b className={cx('num', sum.hasDiff ? s.ink_red : s.ink_green)}>{cny(sum.diff)}</b>
            </div>
          </div>

          <div className={s.barActions}>
            <Button disabled={busy} onClick={() => !guard() && setModal('save')}>
              {savedAt ? t('已保存 ' + savedAt) : t('保存并更新匹配结果')}
            </Button>
            <Button
              disabled={busy}
              aria-disabled={!sum.hasDiff || undefined}
              onClick={() => {
                if (guard()) return;
                if (sum.hasDiff) setModal('adjust');
                else toast(t('金额已平衡，无需差额单'));
              }}
            >
              {t('生成差额单')}
            </Button>
            <Button variant="primary" disabled={busy} onClick={pushOrView}>
              {locked ? t('已推送应付 · 查看应付单') : t('下推应付单')}
            </Button>
          </div>
        </div>
      </PageBody>

      <AddDocsModal
        open={modal === 'addInv' || modal === 'addInb'}
        side={modal === 'addInb' ? 'inb' : 'inv'}
        candidates={modal === 'addInb' ? initial.candInb : initial.candInv}
        added={new Set((modal === 'addInb' ? inbDocs : invDocs).map((d) => d.id))}
        onAdd={(doc) => {
          if (modal === 'addInb') setInbDocs((ds) => [...ds, doc as WbDoc<WbInbLine>]);
          else setInvDocs((ds) => [...ds, doc as WbDoc<WbInvLine>]);
          toast(t((modal === 'addInb' ? '已添加入库单 ' : '已添加发票 ') + doc.id));
        }}
        onClose={() => setModal(null)}
      />

      <Modal
        open={modal === 'delete'}
        onClose={() => setModal(null)}
        width={520}
        title={t('删除匹配组')}
        footer={
          <>
            <Button onClick={() => setModal(null)}>{t('取消')}</Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await deleteMatchGroup(mg);
                  toast(t('已删除匹配组 ' + mg));
                  navigate(ROUTES.supplierWalletView('match'));
                })
              }
            >
              {t('确认删除')}
            </Button>
          </>
        }
      >
        <p className={s.mSub}>{t('确认删除当前匹配组 ' + mg + '？')}</p>
        <div className={cx(s.note, s.noteDanger)}>
          {t('该操作将清空本次手工匹配的全部连线与数据，且不可恢复，确认后将返回匹配列表页面。')}
        </div>
      </Modal>

      <AdjustModal
        open={modal === 'adjust'}
        invDocs={invDocs}
        links={links}
        diff={sum.diff}
        hasDiff={sum.hasDiff}
        busy={busy}
        onClose={() => setModal(null)}
        onCreate={(rows) =>
          run(async () => {
            const docs = await createAdjustments(mg, rows);
            setAdjDocs((xs) => [...xs, ...docs]);
            setModal(null);
            toast(t('已生成差额单') + ' · ' + docs.length);
          })
        }
      />

      <Modal
        open={modal === 'push' || modal === 'save'}
        onClose={() => setModal(null)}
        width={520}
        title={
          <div>
            <div>{t(modal === 'push' ? '下推应付单' : '保存并更新匹配结果')}</div>
            <div className={s.mSub}>
              {t(modal === 'push' ? '将已匹配结果下推生成应付单' : '确认保存当前手工匹配结果并更新匹配状态')}
            </div>
          </div>
        }
        footer={
          <>
            <Button onClick={() => setModal(null)}>{t('取消')}</Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                modal === 'push'
                  ? run(async () => {
                      const r = await pushWorkbenchToAp(mg, user?.name ?? null);
                      setLocked(true);
                      setApNo(r.apNo);
                      setSelectedLink(null);
                      setCurLink(null);
                      setModal(null);
                      toast(t('已下推生成应付单 ' + r.apNo + ' · 匹配组已锁定'));
                    })
                  : run(async () => {
                      const r = await saveWorkbench(mg, {
                        invoices: invDocs,
                        inbounds: inbDocs,
                        links,
                      });
                      setSavedAt(r.savedAt);
                      setModal(null);
                      toast(t('已保存并更新匹配结果 · ' + r.savedAt));
                    })
              }
            >
              {t(modal === 'push' ? '确认下推' : '保存')}
            </Button>
          </>
        }
      >
        {modal === 'save' ? (
          <SummaryRow title="匹配组数" sub="含 1:n / n:1 / n:n" right={String(sum.linkCount)} tone="blue" />
        ) : null}
        <SummaryRow
          title={modal === 'push' ? '已匹配金额（发票口径）' : '已匹配金额'}
          sub={modal === 'push' ? '共 ' + sum.linkCount + ' 个匹配组' : '发票侧口径'}
          right={cny(sum.matchedInvAmt)}
          tone="green"
        />
        {modal === 'push' ? (
          <SummaryRow
            title="金额差异"
            sub={sum.hasDiff ? '建议先生成调差单据' : '已平衡'}
            right={cny(sum.diff)}
            tone={sum.hasDiff ? 'red' : 'green'}
          />
        ) : null}
        <SummaryRow
          title="未匹配行"
          sub={'发票 ' + sum.invLeftLines + ' · 入库 ' + sum.inbLeftLines}
          right={`${sum.invLeftLines + sum.inbLeftLines} ${t('明细行')}`}
          tone="orange"
        />
        {modal === 'push' && sum.hasDiff ? (
          <div className={s.note}>
            {t(
              '存在金额差异 ' +
                cny(sum.diff) +
                '，下推后差额部分将挂起待调差处理。下推后匹配组状态置为「已推送应付」，不可再修改。',
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function SummaryRow({ title, sub, right, tone }: { title: string; sub: string; right: string; tone: string }) {
  const t = useT();
  return (
    <div className={s.mRow}>
      <div className={s.mHead}>
        <div className={s.mMain}>
          <div className={s.mTitle}>{t(title)}</div>
          <div className={s.mSub}>{t(sub)}</div>
        </div>
        <span className={cx('num', s.mRight, s[`ink_${tone}`])}>{right}</span>
      </div>
    </div>
  );
}

/** 添加发票 / 入库单：搜索相关供应商待匹配的单据，点击可展开明细 */
function AddDocsModal({
  open,
  side,
  candidates,
  added,
  onAdd,
  onClose,
}: {
  open: boolean;
  side: Side;
  candidates: Array<WbDoc<WbInvLine> | WbDoc<WbInbLine>>;
  added: Set<string>;
  onAdd: (doc: WbDoc<WbInvLine> | WbDoc<WbInbLine>) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [q, setQ] = useState('');
  const [exp, setExp] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (open) {
      setQ('');
      setExp({});
    }
  }, [open]);
  const query = q.trim().toLowerCase();
  const list = candidates.filter(
    (d) => !query || `${d.id}${d.tag}${d.lines.map((l) => l.name + l.spec).join('')}`.toLowerCase().includes(query),
  );
  const title = side === 'inv' ? '添加发票' : '添加入库单';
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={540}
      title={
        <div>
          <div>{t(title)}</div>
          <div className={s.mSub}>
            {t(
              side === 'inv'
                ? '搜索并选择相关供应商待匹配的发票，点击可展开明细'
                : '搜索并选择相关供应商待匹配的入库单，点击可展开明细',
            )}
          </div>
        </div>
      }
      footer={
        <>
          <Button onClick={onClose}>{t('关闭')}</Button>
          <Button variant="primary" onClick={onClose}>
            {t('完成')}
          </Button>
        </>
      }
    >
      <Input
        className={s.search}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('搜索单据号 / 商品名 / 规格')}
        aria-label={t('搜索单据号 / 商品名 / 规格')}
      />
      {list.map((d) => {
        const isAdded = added.has(d.id);
        const expanded = !!exp[d.id] || !!query;
        return (
          <div key={d.id} className={s.mRow}>
            <div className={s.mHead}>
              <div className={s.mMain}>
                <div className={s.mTitle}>
                  <span className="mono">{d.id}</span> · <span translate="no">{d.tag}</span>
                </div>
                <div className={s.mSub}>
                  <span translate="no">{d.party}</span> · {d.date} · {t('待匹配')} · {d.lines.length} {t('明细行')}
                </div>
              </div>
              <span className={cx('num', s.mRight)}>{cny(d.lines.reduce((a, l) => a + l.amt, 0))}</span>
              <Button
                size="sm"
                variant="ghost"
                iconOnly
                aria-expanded={expanded}
                aria-label={t(expanded ? '收起明细' : '展开明细')}
                onClick={() => setExp((x) => ({ ...x, [d.id]: !expanded }))}
              >
                <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={14} />
              </Button>
              <Button size="sm" variant={isAdded ? 'default' : 'primary'} disabled={isAdded} onClick={() => onAdd(d)}>
                {t(isAdded ? '已添加' : '添加')}
              </Button>
            </div>
            {expanded ? (
              <div className={s.mLines}>
                {d.lines.map((l) => (
                  <div key={l.id} className={s.mLine}>
                    <div translate="no">
                      <div className={s.mTitle}>{l.name}</div>
                      <div className={s.mSub}>
                        {l.spec} · {l.qty}
                      </div>
                    </div>
                    <span className={cx('num', s.mRight)}>{cny(l.amt)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </Modal>
  );
}

/** 差额生成差额单：逐行选择差额类型（尾差 / 折让不产生库存动作） */
function AdjustModal({
  open,
  invDocs,
  links,
  diff,
  hasDiff,
  busy,
  onClose,
  onCreate,
}: {
  open: boolean;
  invDocs: WbDoc<WbInvLine>[];
  links: WbLink[];
  diff: number;
  hasDiff: boolean;
  busy: boolean;
  onClose: () => void;
  onCreate: (rows: Array<{ lid: string; type: AdjType }>) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [types, setTypes] = useState<Record<string, AdjType | ''>>({});
  const rows = invDocs.flatMap((d) => d.lines.filter((l) => Math.abs(l.amtDiff) > 0).map((l) => ({ d, l })));
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={600}
      title={
        <div>
          <div>{t('差额生成差额单')}</div>
          <div className={s.mSub}>{t('按当前匹配差异生成差额单 · 可手动选择差额类型')}</div>
        </div>
      }
      footer={
        <>
          <Button onClick={onClose}>{t('取消')}</Button>
          {hasDiff ? (
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => {
                if (rows.some(({ l }) => !types[l.id])) {
                  toast(t('请为所有差额行手动选择差额类型'));
                  return;
                }
                onCreate(
                  rows.map(({ l }) => ({
                    lid: l.id,
                    type: types[l.id] as AdjType,
                  })),
                );
              }}
            >
              {t('生成差额单')}
            </Button>
          ) : null}
        </>
      }
    >
      {rows.map(({ d, l }) => (
        <div key={l.id} className={s.mRow}>
          <div className={s.mHead}>
            <div className={s.mMain}>
              <div className={s.mTitle}>
                <span className="mono">{d.id}</span> · <span translate="no">{l.name}</span>
              </div>
              <div className={s.mSub}>
                {t('数量差')} <span translate="no">{qtyStr(l.qtyDiff, l.unit)}</span> · {t('匹配组')}{' '}
                {groupOf(links, l.id)?.kind ?? '-'}
              </div>
            </div>
            <span className={cx('num', s.mRight, s.ink_red)}>{cny(l.amtDiff)}</span>
            <Select
              className={s.typeSel}
              aria-label={t('差额类型') + ' · ' + l.name}
              value={types[l.id] ?? ''}
              onChange={(v) => setTypes((x) => ({ ...x, [l.id]: v as AdjType | '' }))}
              options={[
                { value: '', label: t('请选择差额类型') },
                ...ADJ_TYPES.map((k) => ({
                  value: k,
                  label: t(ADJ_LABEL[k].label),
                })),
              ]}
            />
          </div>
        </div>
      ))}
      <div className={cx(s.note, s.noteDanger)}>
        {hasDiff
          ? t(
              '合计差额 ' +
                cny(diff) +
                '，将生成 ' +
                rows.length +
                ' 张差额单，可逐行选择差额类型（尾差 / 折让不产生库存动作），过账后进入应付流程。',
            )
          : t('当前无金额差异，无需生成差额单。')}
      </div>
    </Modal>
  );
}
