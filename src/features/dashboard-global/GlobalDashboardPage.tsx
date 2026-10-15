import { useCallback, useMemo, useState } from "react";
import {
  Button,
  Card,
  Chip,
  Empty,
  ErrorState,
  Icon,
  PageBody,
  PageHeader,
  PageLoading,
  Select,
  type SelectOption,
} from "@/components/ui";
import { useAuth } from "@/auth/AuthProvider";
import { canSeeCountry } from "@/auth/types";
import { useT } from "@/i18n";
import { cx } from "@/lib/sample";
import { useAsync } from "@/lib/useAsync";
import { fetchGlobalDashboard, fetchGlobalTrend, fetchScopes } from "./api";
import { DrillTable } from "./components/DrillTable";
import { ExceptionDrawer } from "./components/ExceptionDrawer";
import { ExceptionSection } from "./components/ExceptionSection";
import { PipelineCards } from "./components/PipelineCards";
import { YoyCharts } from "./components/YoyCharts";
import {
  agg,
  BAD,
  fmtAmt,
  fmtN,
  GOOD,
  group,
  GROUPS,
  INK,
  levelPresets,
  signed,
  STAGES,
  yoy,
} from "./model";
import {
  GLOBAL_SCOPE,
  type ExcTab,
  type FocusKey,
  type PresetKey,
  type TreeNode,
  type TrendNow,
} from "./types";
import s from "./GlobalDashboardPage.module.css";

const MONTHS: Array<{ value: string; label: string }> = [
  { value: "2026-09", label: "2026 年 9 月" },
  { value: "2026-08", label: "2026 年 8 月" },
  { value: "2026-07", label: "2026 年 7 月" },
];

const INITIAL_OPEN: Record<string, boolean> = { "/APAC": true };
const finite = (v: number) => (Number.isFinite(v) ? v : 0);

export default function GlobalDashboardPage() {
  const t = useT();
  const { user } = useAuth();
  const isGlobalUser = !!user?.countries.includes("*");

  const [scopeSel, setScopeSel] = useState<string | null>(null);
  const [month, setMonth] = useState("2026-09");
  const [focus, setFocus] = useState<FocusKey>("all");
  const [levelKey, setLevelKey] = useState<PresetKey>("geo");
  const [open, setOpen] = useState<Record<string, boolean>>(INITIAL_OPEN);
  const [sel, setSel] = useState<string | null>(null);
  const [excTab, setExcTab] = useState<ExcTab>("timeout");
  const [detId, setDetId] = useState<string | null>(null);

  const scopesQ = useAsync(fetchScopes, []);

  // 视角下拉只列出当前用户可见的国家；["*"] 为主数据中心全球视角
  const visibleCountries = useMemo(
    () =>
      (scopesQ.data ?? []).filter(
        (c) =>
          canSeeCountry(user, c.code) && (isGlobalUser ? c.featured : true),
      ),
    [scopesQ.data, user, isGlobalUser],
  );
  const scopeOptions: SelectOption[] = useMemo(
    () => [
      ...(isGlobalUser
        ? [{ value: GLOBAL_SCOPE, label: t("主数据中心 · 全球汇总") }]
        : []),
      ...visibleCountries.map((c) => ({
        value: c.code,
        label: t(c.name + " · " + c.dc),
      })),
    ],
    [isGlobalUser, visibleCountries, t],
  );
  const scope =
    scopeSel && scopeOptions.some((o) => o.value === scopeSel)
      ? scopeSel
      : (scopeOptions[0]?.value ?? null);
  const scopeCountry = visibleCountries.find((c) => c.code === scope) ?? null;

  const dash = useAsync(
    () =>
      scope ? fetchGlobalDashboard({ month, scope }) : Promise.resolve(null),
    [month, scope],
  );

  const presets = useMemo(() => levelPresets(scope ?? GLOBAL_SCOPE), [scope]);
  const preset = presets.find((p) => p.k === levelKey) ?? presets[0];
  const leaves = useMemo(() => dash.data?.leaves ?? [], [dash.data]);
  const tree = useMemo(() => group(leaves, preset.lv), [leaves, preset]);
  const total = useMemo(() => agg(leaves), [leaves]);

  const allNodes = useMemo(() => {
    const out: TreeNode[] = [];
    const w = (ns: TreeNode[]) =>
      ns.forEach((nd) => {
        out.push(nd);
        w(nd.kids);
      });
    w(tree);
    return out;
  }, [tree]);
  // 与设计稿一致：只有已展开（可见）的节点才可作为图表对象
  const selNode = useMemo(() => {
    const visible = new Set<string>();
    const w = (ns: TreeNode[]) =>
      ns.forEach((nd) => {
        visible.add(nd.path);
        if (open[nd.path]) w(nd.kids);
      });
    w(tree);
    return sel && visible.has(sel)
      ? (allNodes.find((nd) => nd.path === sel) ?? null)
      : null;
  }, [tree, allNodes, open, sel]);

  const scopeName =
    scope === GLOBAL_SCOPE ? "全球" : (scopeCountry?.name ?? "");
  const cs = selNode ? selNode.stats : total;
  const chartName = selNode ? selNode.name : scopeName + "（合计）";
  const now: TrendNow = {
    c: finite((cs.n / cs.nly - 1) * 100),
    a: finite((cs.amt / cs.amtly - 1) * 100),
    acc: finite(cs.acc - cs.accLy),
    dur: finite((cs.dur / cs.durLy - 1) * 100),
  };
  const nowKey = `${now.c}|${now.a}|${now.acc}|${now.dur}`;
  const ready = !!dash.data && leaves.length > 0;
  const trend = useAsync(
    () =>
      ready && scope
        ? fetchGlobalTrend({ month, scope, node: selNode?.path ?? null, now })
        : Promise.resolve(null),

    [ready, month, scope, selNode?.path, nowKey],
  );

  const onScope = useCallback((v: string) => {
    setScopeSel(v);
    setSel(null);
    setLevelKey("geo");
    setOpen(v === GLOBAL_SCOPE ? INITIAL_OPEN : {});
  }, []);

  const header = (
    <PageHeader
      crumb={t("看板 / 全球统一看板")}
      title={t("全球进项发票统一看板")}
      badges={<Chip tone="gray">{t("示例数据")}</Chip>}
      actions={
        <>
          {scopeOptions.length ? (
            <label className={s.headField}>
              <span className="kick">{t("数据视角")}</span>
              <Select
                value={scope ?? ""}
                onChange={onScope}
                options={scopeOptions}
              />
            </label>
          ) : null}
          <label className={s.headField}>
            <span className="kick">{t("统计月")}</span>
            <Select
              value={month}
              onChange={setMonth}
              options={MONTHS.map((m) => ({
                value: m.value,
                label: t(m.label),
              }))}
            />
          </label>
          <Button
            icon={
              <Icon
                d="M12 3v12M7 10l5 5 5-5M4 21h16"
                size={15}
                strokeWidth={1.6}
              />
            }
          >
            {t("导出")}
          </Button>
        </>
      }
    />
  );

  if (scopesQ.error)
    return <ErrorState error={scopesQ.error} onRetry={scopesQ.reload} />;
  if (dash.error)
    return <ErrorState error={dash.error} onRetry={dash.reload} />;
  if (scopesQ.loading && !scopesQ.data) return <PageLoading />;
  if (!scope) {
    return (
      <>
        {header}
        <PageBody>
          <Card>
            <Empty />
          </Card>
        </PageBody>
      </>
    );
  }
  if (!dash.data) return <PageLoading />;

  const focusStages =
    focus === "all"
      ? STAGES.map((x) => x.k)
      : STAGES.filter((x) => x.group === focus).map((x) => x.k);
  const focusGroup = GROUPS.find((g) => g.k === focus);
  const focusLabel =
    focus === "all" || !focusGroup
      ? t("全部状态口径")
      : t("口径：" + focusGroup.label);

  const isGlobal = scope === GLOBAL_SCOPE;
  const cyT = yoy(total.n, total.nly);
  const ayT = yoy(total.amt, total.amtly);
  const accDT = total.acc - total.accLy;
  const durDT = (total.dur / total.durLy - 1) * 100;
  const kpis = [
    {
      label: t(scopeName + " · 本月进项发票"),
      value: t(fmtN(total.n) + " 张"),
      delta: cyT.l,
      color: INK,
      note: t("数量同比"),
    },
    {
      label: t("发票金额（折算 CNY）"),
      value: t(fmtAmt(total.amt)),
      delta: ayT.l,
      color: INK,
      note: t("金额同比"),
    },
    {
      label: t("字段识别准确率"),
      value: total.acc.toFixed(2) + "%",
      delta: signed(accDT, 2) + " pp",
      color: accDT >= 0 ? GOOD : BAD,
      note: t("同比"),
    },
    {
      label: t("平均识别时长"),
      value: t(total.dur.toFixed(1) + " 秒"),
      delta: signed(durDT, 1) + "%",
      color: durDT <= 0 ? GOOD : BAD,
      note: t("同比（越低越好）"),
    },
    {
      label: t("识别超时 / 高误差"),
      value: fmtN(total.timeout) + " / " + fmtN(total.highErr),
      delta: t("超时 > 30 秒"),
      color: "var(--ink-2)",
      note: t("· 误差 ≥ 20% 字段"),
    },
  ];

  const expandAll = () => {
    const o: Record<string, boolean> = {};
    allNodes.forEach((nd) => {
      o[nd.path] = true;
    });
    setOpen(o);
  };

  const det = dash.data.exceptions.find((e) => e.id === detId) ?? null;

  return (
    <>
      {header}
      <PageBody className={s.palette}>
        <div
          className={cx(s.banner, isGlobal ? s.bannerGlobal : s.bannerLocal)}
        >
          <Icon
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"
            size={18}
            strokeWidth={1.6}
            className={s.bannerIcon}
          />
          <div style={{ minWidth: 0 }}>
            <div className={s.bannerTitle}>
              {isGlobal
                ? t("主数据中心视角 · 全球汇总")
                : t(scopeName + "租户视角 · 仅本国数据")}
            </div>
            <div className={s.bannerBody}>
              {isGlobal
                ? t(
                    "汇总 21 个国家/地区、7 个数据中心的统计指标。跨境仅同步聚合指标（每 15 分钟），票面明细与影像留存在各国数据中心；单张发票详情按所在数据中心授权查看。",
                  )
                : t(
                    "当前登录 " +
                      (scopeCountry?.dcName ?? "") +
                      "。依据数据驻留策略，此视角只能查看" +
                      scopeName +
                      "的发票与指标，无法查看其他国家；全球汇总由主数据中心提供。",
                  )}
            </div>
          </div>
        </div>

        <section aria-label={t("核心指标")} className={s.kpis}>
          {kpis.map((k) => (
            <Card key={k.label} padded={false} className={s.kpi}>
              <div className="kick">{k.label}</div>
              <div className={cx("num", s.kpiValue)}>{k.value}</div>
              <div className={cx("num", s.kpiFoot)}>
                <span className={s.kpiDelta} style={{ color: k.color }}>
                  {k.delta}
                </span>
                <span className={s.muted}>{k.note}</span>
              </div>
            </Card>
          ))}
        </section>

        <PipelineCards total={total} focus={focus} onFocus={setFocus} />

        <DrillTable
          tree={tree}
          open={open}
          sel={sel}
          focusStages={focusStages}
          focusLabel={focusLabel}
          presets={presets}
          presetKey={preset.k}
          onPreset={(k) => {
            setLevelKey(k);
            setOpen({});
          }}
          onToggle={(p) => setOpen((o) => ({ ...o, [p]: !o[p] }))}
          onSelect={setSel}
          onExpandAll={expandAll}
          onCollapseAll={() => setOpen({})}
        />

        {trend.data ? (
          <YoyCharts
            name={chartName}
            stats={cs}
            now={now}
            series={trend.data}
          />
        ) : null}

        <ExceptionSection
          items={dash.data.exceptions}
          tab={excTab}
          onTab={setExcTab}
          onOpen={setDetId}
        />
      </PageBody>

      <ExceptionDrawer inv={det} onClose={() => setDetId(null)} />
    </>
  );
}
