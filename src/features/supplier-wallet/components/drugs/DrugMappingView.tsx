import { useMemo, useState } from 'react';
import { Card, Chip, ErrorState, Input, Segmented, Select, Spinner } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { useAsync } from '@/lib/useAsync';
import type { CountryCode } from '../../types';
import { fetchDrugMapping } from '../../match/api';
import { DRUG_STATUS } from '../../match/data';
import type { Drug, DrugEdge, DrugInv, DrugMat, DrugStatus } from '../../match/types';
import { NoMatchData } from '../match/NoMatchData';
import s from './drugs.module.css';

type Kpi = 'all' | DrugStatus;

/** 按供应商筛选后的匹配组（保留与该供应商发票相连的物料） */
interface FlowGroup {
  mats: DrugMat[];
  invs: DrugInv[];
  edges: DrugEdge[];
}

function filterGroups(drug: Drug, supplier: string): FlowGroup[] {
  const out: FlowGroup[] = [];
  drug.groups.forEach((g) => {
    if (supplier === 'all') {
      out.push(g);
      return;
    }
    const keep = g.invs.map((v, i) => (v.supplier === supplier ? i : -1)).filter((i) => i >= 0);
    if (!keep.length) return;
    const remapI = new Map(keep.map((o, n) => [o, n]));
    let edges = g.edges.filter((e) => remapI.has(e.i)).map((e) => ({ ...e, i: remapI.get(e.i)! }));
    const keptM = [...new Set(edges.map((e) => e.m))].sort((a, b) => a - b);
    const remapM = new Map(keptM.map((o, n) => [o, n]));
    edges = edges.map((e) => ({ ...e, m: remapM.get(e.m)! }));
    out.push({
      mats: keptM.map((i) => g.mats[i]),
      invs: keep.map((i) => g.invs[i]),
      edges,
    });
  });
  return out;
}

/** 药品匹配关系：库存物料（入库单）与供应商发票品规的匹配对与数量换算比例，是向量化 / 智能匹配的知识库 */
export function DrugMappingView({ country, onPickCountry }: { country: CountryCode; onPickCountry?: () => void }) {
  const t = useT();
  const data = useAsync(() => fetchDrugMapping(country), [country]);
  const [q, setQ] = useState('');
  const [kpi, setKpi] = useState<Kpi>('all');
  const [selId, setSelId] = useState<string | null>(null);
  const [supplier, setSupplier] = useState('all');
  const [tab, setTab] = useState<'flow' | 'graph'>('flow');
  const [showConf, setShowConf] = useState(true);

  const drugs = data.data?.drugs ?? [];
  const list = drugs.filter((d) => (!q || d.name.includes(q.trim())) && (kpi === 'all' || d.status === kpi));
  const sel = list.find((d) => d.id === selId) ?? list[0] ?? drugs[0];
  const groups = useMemo(() => (sel ? filterGroups(sel, supplier) : []), [sel, supplier]);

  if (data.error) return <ErrorState error={data.error} onRetry={data.reload} />;
  if (!data.data) return <Spinner label={t('加载中')} />;
  if (!drugs.length || !sel) return <NoMatchData onPickCountry={onPickCountry} />;

  const totSpec = drugs.reduce((a, d) => a + d.matCnt, 0);
  const totMatched = drugs.reduce((a, d) => a + d.matchedMatCnt, 0);
  const by = (st: DrugStatus) => drugs.filter((d) => d.status === st);
  const specSum = (xs: Drug[]) => xs.reduce((a, d) => a + d.matCnt, 0);
  const rate = totSpec ? Math.round((totMatched / totSpec) * 1000) / 10 : 0;
  const kpis: Array<{
    key: Kpi;
    title: string;
    num: number;
    sub: string;
    tone: string;
  }> = [
    {
      key: 'all',
      title: '总物料数量',
      num: drugs.length,
      sub: '匹配率 ' + rate + '%（' + totMatched + '/' + totSpec + ' 含规格型号物料）',
      tone: 'ink',
    },
    {
      key: 'full',
      title: '已匹配物料数量',
      num: by('full').length,
      sub: '含规格型号物料 ' + specSum(by('full')) + ' 个',
      tone: 'green',
    },
    {
      key: 'partial',
      title: '部分匹配物料数量',
      num: by('partial').length,
      sub: '含规格型号物料 ' + specSum(by('partial')) + ' 个',
      tone: 'orange',
    },
    {
      key: 'none',
      title: '未匹配物料数量',
      num: by('none').length,
      sub: '含规格型号物料 ' + specSum(by('none')) + ' 个',
      tone: 'red',
    },
  ];
  const totM = groups.reduce((a, g) => a + g.mats.length, 0);
  const totI = groups.reduce((a, g) => a + g.invs.length, 0);
  const totE = groups.reduce((a, g) => a + g.edges.length, 0);

  return (
    <div className={s.wrap}>
      <div className={s.kpis} role="group" aria-label={t('按匹配状态筛选')}>
        {kpis.map((k) => (
          <button
            key={k.key}
            type="button"
            className={cx(s.kpi, kpi === k.key && s.kpiOn)}
            aria-pressed={kpi === k.key}
            onClick={() => setKpi(k.key)}
          >
            <span className={s.kpiTitle}>{t(k.title)}</span>
            <span className={cx('num', s.kpiNum, s[`ink_${k.tone}`])}>{k.num}</span>
            <span className={s.kpiSub}>{t(k.sub)}</span>
          </button>
        ))}
      </div>

      <Card padded={false} className={s.split}>
        <aside className={s.list} aria-label={t('药品')}>
          <div className={s.listHead}>
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('搜索药品品名')}
              aria-label={t('搜索药品品名')}
            />
            <div className={s.listMeta}>
              <span>{t('按品名排序')}</span>
              <span>{t('共 ' + list.length + ' 个药品')}</span>
            </div>
          </div>
          <div className={s.listBody}>
            {list.map((d) => {
              const st = DRUG_STATUS[d.status];
              const on = d.id === sel.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  className={cx(s.drug, on && s.drugOn)}
                  aria-pressed={on}
                  onClick={() => setSelId(d.id)}
                >
                  <span className={s.drugTop}>
                    <span className={s.drugName} translate="no">
                      {d.name}
                    </span>
                    <Chip tone={st.tone}>{t(st.label)}</Chip>
                  </span>
                  <span className={s.drugSub}>{t(d.matCnt + '个规格 · ' + d.invCnt + '张发票')}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={s.main} aria-label={sel.name}>
          <div className={s.mainHead}>
            <div className={s.mainTitleBox}>
              <h2 className={s.mainTitle} translate="no">
                {sel.name}
              </h2>
              <div className={s.mainStats}>
                {t(totM + '个库存规格 · ' + totI + '张匹配发票 · ' + totE + '条匹配关系')}
                {supplier !== 'all' ? t(' · 已筛选供应商') : ''}
              </div>
            </div>
            <Select aria-label={t('供应商')} value={supplier} onChange={setSupplier} className={s.supSel}>
              <option value="all">{t('全部供应商（集团物料视角）')}</option>
              {data.data.suppliers.map((x) => (
                <option key={x} value={x} translate="no">
                  {x}
                </option>
              ))}
            </Select>
            <Segmented
              ariaLabel={t('视图')}
              value={tab}
              onChange={setTab}
              options={[
                { value: 'flow', label: t('匹配导流图') },
                { value: 'graph', label: t('关系图谱') },
              ]}
            />
            <label className={s.confToggle}>
              <input type="checkbox" checked={showConf} onChange={(e) => setShowConf(e.target.checked)} />
              {t('显示置信度')}
            </label>
          </div>
          {tab === 'flow' ? (
            <FlowChart groups={groups} showConf={showConf} />
          ) : (
            <RelationTree drug={sel} supplier={supplier} showConf={showConf} />
          )}
        </section>
      </Card>
    </div>
  );
}

const ROW = 100;
const GAP = 12;
const MID = 150;

/** 匹配导流图：左侧库存物料、右侧供应商发票，中间曲线标注数量换算比例 */
function FlowChart({ groups, showConf }: { groups: FlowGroup[]; showConf: boolean }) {
  const t = useT();
  return (
    <div className={s.flow}>
      <div className={s.flowHead} dir="ltr">
        <span>{t('库存物料（入库单）· 名称 / 规格')}</span>
        <span className={s.center}>{t('数量换算比例')}</span>
        <span>{t('供应商发票 · 品名 / 规格')}</span>
      </div>
      {groups.map((g, gi) => {
        const unmatched = g.invs.length === 0;
        const M = g.mats.length;
        const N = Math.max(g.invs.length, 1);
        const h = Math.max(M, N) * ROW - GAP;
        const mh = (h - (M - 1) * GAP) / M;
        const ih = (h - (N - 1) * GAP) / N;
        return (
          <div key={gi} className={s.flowRow} style={{ height: h }} dir="ltr">
            <div className={s.flowCol}>
              {g.mats.map((m, i) => (
                <div key={i} className={cx(s.node, unmatched && s.nodeWarn)} translate="no">
                  <div className={s.nodeName}>{m.name}</div>
                  <div className={s.nodeSpec}>{m.spec}</div>
                  <div className={s.nodeMeta}>
                    <span translate="yes">{t('单位：')}</span>
                    {m.unit}
                  </div>
                </div>
              ))}
            </div>
            <div className={s.edges}>
              <svg width={MID} height={h} aria-hidden="true">
                {g.edges.map((e, i) => {
                  const ym = e.m * (mh + GAP) + mh / 2;
                  const yi = e.i * (ih + GAP) + ih / 2;
                  return (
                    <g key={i}>
                      <path d={`M0 ${ym} C55 ${ym} 95 ${yi} ${MID} ${yi}`} className={s.edge} />
                      <circle cx={0} cy={ym} r={3} className={s.edgeDot} />
                      <circle cx={MID} cy={yi} r={3} className={s.edgeDot} />
                    </g>
                  );
                })}
              </svg>
              {g.edges.map((e, i) => {
                const ym = e.m * (mh + GAP) + mh / 2;
                const yi = e.i * (ih + GAP) + ih / 2;
                return (
                  <span key={i} className={s.edgeLabel} style={{ top: (ym + yi) / 2 - 8 }} translate="no">
                    <span className={s.edgeTag}>
                      {e.ratio}
                      {showConf ? ` · ${e.conf}%` : ''}
                    </span>
                  </span>
                );
              })}
            </div>
            <div className={s.flowCol}>
              {unmatched ? <div className={s.placeholder}>{t('暂无匹配发票 · 待人工标注')}</div> : null}
              {g.invs.map((v, i) => (
                <div key={i} className={s.node} translate="no">
                  <div className={cx(s.nodeMeta, s.ellipsis)}>{v.supplier}</div>
                  <div className={s.nodeName}>{v.iname}</div>
                  <div className={s.nodeSpec}>
                    {v.ispec} · <span translate="yes">{t('单位：')}</span>
                    {v.iunit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface Party {
  key: string;
  sup: string;
  buyer: string;
  recs: Array<{ mat: DrugMat; inv: DrugInv; e: DrugEdge }>;
}

/** 关系图谱（二维）：物料品名 → 购销对（销方 → 购方）→ 规格匹配对 + 转换比例，节点可展开 / 收起 */
function RelationTree({ drug, supplier, showConf }: { drug: Drug; supplier: string; showConf: boolean }) {
  const t = useT();
  const parties = useMemo(() => {
    const out: Party[] = [];
    const idx = new Map<string, Party>();
    drug.groups.forEach((g) =>
      g.edges.forEach((e) => {
        const mat = g.mats[e.m];
        const inv = g.invs[e.i];
        if (supplier !== 'all' && inv.supplier !== supplier) return;
        const key = `${inv.supplier}→${inv.buyer}`;
        let p = idx.get(key);
        if (!p) {
          p = { key, sup: inv.supplier, buyer: inv.buyer, recs: [] };
          idx.set(key, p);
          out.push(p);
        }
        p.recs.push({ mat, inv, e });
      }),
    );
    return out;
  }, [drug, supplier]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className={s.tree}>
      <p className={s.treeNote}>{t('关系图谱：物料品名 → 购销对 → 规格匹配对＋转换比例（点击节点展开 / 收起）')}</p>
      <div className={s.treeRoot}>
        <span className={cx(s.treeNode, s.lv0)}>
          <b translate="no">{drug.name}</b>
          <span>{t('库存物料 · ' + drug.matCnt + '个规格')}</span>
        </span>
        {parties.length ? (
          <ul className={s.treeList}>
            {parties.map((p) => {
              const isOpen = !!open[p.key];
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    className={cx(s.treeNode, s.lv1)}
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => ({ ...o, [p.key]: !isOpen }))}
                  >
                    <b translate="no">
                      {p.sup} → {p.buyer}
                    </b>
                    <span>{t(p.recs.length + ' 个规格匹配对')}</span>
                    {!isOpen ? <span className={s.badge}>+{p.recs.length}</span> : null}
                  </button>
                  {isOpen ? (
                    <ul className={s.treeList}>
                      {p.recs.map((r, i) => (
                        <li key={i}>
                          <span className={cx(s.treeNode, s.lv2)} translate="no">
                            <b>
                              {r.mat.spec} ↔ {r.inv.ispec}
                            </b>
                            <span className={s.ratio}>
                              {r.e.ratio}
                              {showConf ? ` · ${r.e.conf}%` : ''}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={s.placeholder}>{t('暂无匹配发票 · 待人工标注')}</div>
        )}
      </div>
      <div className={s.legend}>
        <span>
          <i className={s.lv0Dot} aria-hidden="true" />
          {t('物料品名')}
        </span>
        <span>
          <i className={s.lv1Dot} aria-hidden="true" />
          {t('购销对（销方→购方）')}
        </span>
        <span>
          <i className={s.lv2Dot} aria-hidden="true" />
          {t('规格匹配对＋转换比例')}
        </span>
      </div>
    </div>
  );
}
