import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Chip, ErrorState, Icon, Progress, Select, Spinner, useToast } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/auth/AuthProvider';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { useAsync } from '@/lib/useAsync';
import type { CountryCode } from '../../types';
import {
  confirmMatchGroups,
  createMatchGroup,
  fetchMatchBoard,
  fetchMatchRun,
  replayMatchRun,
  saveGroupStrategy,
} from '../../match/api';
import { DATE_RANGES, DEFAULT_RANGE, ZONE_META, ZONE_ORDER } from '../../match/data';
import { cardModel } from '../../match/logic';
import type { MatchBoardFilter, MatchRun, StrategyForm } from '../../match/types';
import { DraftCard, GroupCard } from './GroupCard';
import { CreateGroupModal, PendingDocsModal } from './GroupModals';
import { RunPanel } from './RunPanel';
import { StrategyModal } from './StrategyModal';
import { NoMatchData } from './NoMatchData';
import s from './match.module.css';

const ZONE_DOT = { manual: 'orange', auto: 'green', done: 'purple' } as const;

/** 轮询匹配引擎批处理状态，直到处理完成 */
function useMatchRun(country: CountryCode) {
  const [run, setRun] = useState<MatchRun | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const r = await fetchMatchRun(country);
        if (!alive) return;
        setRun(r);
        if (r.phase !== 'complete' && r.phase !== 'idle') timer = setTimeout(poll, 500);
      } catch {
        if (alive) timer = setTimeout(poll, 3000);
      }
    };
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [country, tick]);
  const replay = useCallback(async () => {
    setRun(await replayMatchRun(country));
    setTick((n) => n + 1);
  }, [country]);
  return { run, replay };
}

/** 三单匹配 · 发票匹配生成应付单：过滤上下文 → 概览 → 执行状态 → 匹配中 / 未完全 / 已完全 / 已确认 */
export function MatchBoard({
  country,
  initialSupplier = '',
  onPickCountry,
  onChange,
}: {
  country: CountryCode;
  /** 从票夹进入时按供应商过滤 */
  initialSupplier?: string;
  onPickCountry?: () => void;
  /** 确认、新增、调整策略后通知外层刷新概况 */
  onChange?: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState<MatchBoardFilter>({
    range: DEFAULT_RANGE,
    buyer: 'all',
    supplier: initialSupplier || 'all',
  });
  const board = useAsync(
    () => fetchMatchBoard(country, filter),
    [country, filter.range, filter.buyer, filter.supplier],
  );
  const { run, replay } = useMatchRun(country);
  const [strategyMg, setStrategyMg] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<'inv' | 'inb' | null>(null);
  const [busy, setBusy] = useState(false);

  const firstCountry = useRef(country);
  useEffect(() => {
    if (country === firstCountry.current) return;
    firstCountry.current = country;
    setFilter({ range: DEFAULT_RANGE, buyer: 'all', supplier: 'all' });
  }, [country]);

  const data = board.data?.country === country ? board.data : undefined;
  const tol = data?.tolerance;
  const cards = useMemo(() => {
    if (!data || !tol) return [];
    const done = new Set(run?.done ?? []);
    const complete = run?.phase === 'complete';
    return data.groups.filter((g) => complete || done.has(g.mg) || g.manual).map((g) => ({ g, m: cardModel(g, tol) }));
  }, [data, tol, run]);

  if (board.error) return <ErrorState error={board.error} onRetry={board.reload} />;
  if (!data || !tol) return <Spinner label={t('加载中')} />;
  if (!data.syncTotal && !data.groups.length) return <NoMatchData onPickCountry={onPickCountry} />;

  const confirm = async (mgs: string[], batch: boolean) => {
    setBusy(true);
    try {
      const r = await confirmMatchGroups(mgs, user?.name ?? null);
      const aps = Object.values(r.ap);
      toast(
        batch
          ? t('已批量确认 ' + aps.length + ' 组自动匹配，生成对应应付单')
          : t('已确认匹配结果，生成应付单 ' + (aps[0] ?? '')),
      );
      board.reload();
      onChange?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    } finally {
      setBusy(false);
    }
  };

  const saveStrategy = async (mg: string, form: StrategyForm) => {
    try {
      await saveGroupStrategy(mg, form);
      setStrategyMg(null);
      toast(t('已保存匹配策略，正在以新口径重新执行 ' + mg));
      board.reload();
      onChange?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    }
  };

  const create = async (inv: string[], inb: string[], source: 'pool' | 'pending') => {
    try {
      const d = await createMatchGroup(country, { inv, inb, source });
      setCreateOpen(false);
      setPending(null);
      toast(t('已创建匹配组 ' + d.id + '，已进入匹配中队列'));
      board.reload();
      onChange?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    }
  };

  const internal = data.suppliers.filter((x) => x.internal);
  const external = data.suppliers.filter((x) => !x.internal);
  const doneCount = run?.done.length ?? 0;
  const syncNow = run && run.phase !== 'idle' ? run.syncNow : data.syncTotal;

  return (
    <div className={s.board}>
      <Card className={s.overview} aria-label={t('数据概览')}>
        <div className={s.syncBlock}>
          <span className="kick">{t('税务机关定时同步发票')}</span>
          <div className={s.syncNums}>
            <span className={cx('num', s.syncBig)}>{syncNow}</span>
            <span className={cx('num', s.syncOf)}>/ {data.syncTotal}</span>
            <span className={s.syncHint}>{t('已完成分配 / 已同步')}</span>
          </div>
          <Progress value={data.syncTotal ? (syncNow / data.syncTotal) * 100 : 0} label={t('已完成分配 / 已同步')} />
        </div>
        <span className={s.flowArrow} aria-hidden="true">
          <Icon name="chevronRight" />
        </span>
        <div className={cx(s.tile, s.tileGreen)}>
          <span className={s.tileLabel}>{t('已自动匹配发票')}</span>
          <span className={cx('num', s.tileValue)}>
            {doneCount}
            <span className={s.tileUnit}>{t('张 · 生成应付单 ' + data.payables)}</span>
          </span>
        </div>
        <button type="button" className={cx(s.tile, s.tileOrange)} onClick={() => setPending('inv')}>
          <span className={s.tileLabel}>{t('未匹配发票')}</span>
          <span className={cx('num', s.tileValue)}>
            {data.unmatchedInvoices}
            <span className={s.tileUnit}>{t('张 · 点击手工分供应商')}</span>
          </span>
        </button>
        <span className={s.vsep} aria-hidden="true" />
        <button type="button" className={cx(s.tile, s.tileBlue)} onClick={() => setPending('inb')}>
          <span className={s.tileLabel}>{t('供应商待匹配入库单')}</span>
          <span className={cx('num', s.tileValue)}>
            {data.pendingInbounds}
            <span className={s.tileUnit}>{t('单 · 点击查看明细')}</span>
          </span>
        </button>
      </Card>

      {run ? (
        <RunPanel run={run} groups={data.groups.filter((g) => !g.manual)} tol={tol} onReplay={() => void replay()} />
      ) : null}

      <div className={s.toolbar} role="group" aria-label={t('过滤条件')}>
        <Select
          aria-label={t('时间区间')}
          value={filter.range}
          onChange={(v) => setFilter((f) => ({ ...f, range: v }))}
          options={DATE_RANGES.map((r) => ({ value: r, label: t(r) }))}
        />
        <Select
          aria-label={t('购买入库组织')}
          value={filter.buyer}
          onChange={(v) => setFilter((f) => ({ ...f, buyer: v }))}
        >
          <option value="all">{t('全部购买入库组织')}</option>
          {data.buyers.map((b) => (
            <option key={b} value={b} translate="no">
              {b}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('供应商')}
          value={filter.supplier}
          onChange={(v) => setFilter((f) => ({ ...f, supplier: v }))}
        >
          <option value="all">{t('全部供应商')}</option>
          {external.length ? (
            <optgroup label={t('外部供应商')}>
              {external.map((x) => (
                <option key={x.name} value={x.name} translate="no">
                  {x.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {internal.length ? (
            <optgroup label={t('内部供应商')}>
              {internal.map((x) => (
                <option key={x.name} value={x.name} translate="no">
                  {x.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </Select>
        <Button icon={<Icon name="plus" size={14} />} onClick={() => setCreateOpen(true)}>
          {t('新增匹配组')}
        </Button>
        <span className={cx('num', s.hint)}>
          {t(
            '共 ' +
              cards.length +
              ' 组匹配 · 规则 单价±' +
              tol.priceTol +
              '% / 数量±' +
              tol.qtyTol +
              '% / 自动≥' +
              tol.autoFit +
              '%',
          )}
        </span>
      </div>

      {data.drafts.length ? (
        <section aria-labelledby="zone-matching">
          <div className={s.zoneHead}>
            <span className={cx(s.dot, s.dot_purple)} aria-hidden="true" />
            <h2 id="zone-matching" className={s.zoneTitle}>
              {t('匹配中')}
            </h2>
            <Chip tone="purple">{t(data.drafts.length + ' 组')}</Chip>
            <span className={s.zoneDesc}>{t('手工新增的匹配组 · 待打开匹配详情确认')}</span>
          </div>
          <div className={s.cards}>
            {data.drafts.map((d) => (
              <DraftCard key={d.id} d={d} />
            ))}
          </div>
        </section>
      ) : null}

      {ZONE_ORDER.map((z) => {
        const zc = cards.filter((c) => c.m.zone === z);
        const meta = ZONE_META[z];
        return (
          <section key={z} aria-labelledby={`zone-${z}`}>
            <div className={s.zoneHead}>
              <span className={cx(s.dot, s[`dot_${ZONE_DOT[z]}`])} aria-hidden="true" />
              <h2 id={`zone-${z}`} className={s.zoneTitle}>
                {t(meta.title)}
              </h2>
              <Chip tone={meta.tone}>{t(zc.length + ' 组')}</Chip>
              <span className={s.zoneDesc}>{t(meta.desc)}</span>
              {z === 'auto' && zc.length ? (
                <Button
                  size="sm"
                  className={s.zoneBatch}
                  disabled={busy}
                  onClick={() =>
                    void confirm(
                      zc.map((c) => c.g.mg),
                      true,
                    )
                  }
                >
                  {t('⚡ 一键确认全部')}
                </Button>
              ) : null}
            </div>
            <div className={s.cards}>
              {zc.length ? (
                zc.map(({ g, m }) => (
                  <GroupCard
                    key={g.mg}
                    g={g}
                    m={m}
                    busy={busy}
                    onAdjust={() => (g.manual ? navigate(ROUTES.matchWorkbench(g.mg)) : setStrategyMg(g.mg))}
                    onManual={() => navigate(ROUTES.matchWorkbench(g.mg))}
                    onConfirm={() =>
                      m.verdict === 'confirmed'
                        ? navigate(ROUTES.supplierWalletView('ap', g.ap))
                        : void confirm([g.mg], false)
                    }
                  />
                ))
              ) : (
                <div className={s.zoneEmpty}>{t('该区域暂无匹配 · 卡片确认后将自动归入此处')}</div>
              )}
            </div>
          </section>
        );
      })}

      <StrategyModal mg={strategyMg} onClose={() => setStrategyMg(null)} onSave={saveStrategy} />
      <CreateGroupModal
        country={country}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(inv, inb) => create(inv, inb, 'pool')}
      />
      <PendingDocsModal
        country={country}
        kind={pending}
        onClose={() => setPending(null)}
        onAdd={(kind, ids) => create(kind === 'inv' ? ids : [], kind === 'inb' ? ids : [], 'pending')}
      />
    </div>
  );
}
