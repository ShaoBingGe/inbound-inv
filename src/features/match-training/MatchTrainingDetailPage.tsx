import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  Empty,
  ErrorState,
  Icon,
  Input,
  PageBody,
  PageHeader,
  PageLoading,
  Segmented,
  Table,
  useToast,
} from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { useAsync } from '@/lib/useAsync';
import type { CountryCode } from '@/features/supplier-wallet/types';
import { fetchTrainingDetail, setLearningStopped } from './api';
import { detailKpis, nameKey, nameStatus, ratioText, specKey, specStatus, stoppedItems } from './logic';
import type { SpecStatus, TrainingDetail, TrainingName } from './types';
import s from './MatchTraining.module.css';

const CARD_PAGE = 24;
const LIST_PAGE = 10;
const SPEC_TAG: Record<SpecStatus, { label: string; tone: 'green' | 'orange' | 'gray' }> = {
  learned: { label: '已学习', tone: 'green' },
  unlearned: { label: '未学习', tone: 'orange' },
  stopped: { label: '已终止', tone: 'gray' },
};

export default function MatchTrainingDetailPage() {
  const { supplierCode = '' } = useParams();
  const [params] = useSearchParams();
  const country = (params.get('country') ?? 'CN') as CountryCode;
  const data = useAsync(() => fetchTrainingDetail(country, supplierCode), [country, supplierCode]);
  if (data.error) return <ErrorState error={data.error} onRetry={data.reload} />;
  if (!data.data || data.data.supplier.code !== supplierCode) return <PageLoading />;
  return <DetailView key={supplierCode} country={country} detail={data.data} />;
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const t = useT();
  if (pages <= 1) return null;
  return (
    <div className={s.pager}>
      <Button
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        icon={<Icon name="chevronLeft" size={13} />}
      >
        {t('上一页')}
      </Button>
      <span className="num">
        {page} / {pages}
      </span>
      <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t('下一页')}
        <Icon name="chevronRight" size={13} />
      </Button>
    </div>
  );
}

const pageOf = <T,>(list: T[], page: number, size: number) => {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(page, pages);
  return { pages, page: p, slice: list.slice((p - 1) * size, p * size) };
};

/** 训练成果明细：入库单物料品名 → 规格 → 已学习的发票匹配；可终止 / 恢复学习 */
function DetailView({ country, detail }: { country: CountryCode; detail: TrainingDetail }) {
  const t = useT();
  const toast = useToast();
  const sup = detail.supplier;
  const [stopped, setStopped] = useState(() => new Set(detail.stopped));
  const [tab, setTab] = useState<'active' | 'stopped'>('active');
  const [q, setQ] = useState('');
  const [onlyU, setOnlyU] = useState(false);
  const [cardPage, setCardPage] = useState(1);
  const [selId, setSelId] = useState<string | null>(null);
  const [selSid, setSelSid] = useState<string | null>(null);
  const [specPage, setSpecPage] = useState(1);
  const [invPage, setInvPage] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => setCardPage(1), [q, onlyU]);
  const kpi = useMemo(() => detailKpis(detail.items), [detail.items]);

  const select = (id: string | null) => {
    setSelId(id);
    setSelSid(null);
    setSpecPage(1);
    setInvPage(1);
  };
  const switchTab = (v: 'active' | 'stopped') => {
    setTab(v);
    select(null);
  };

  const update = async (keys: string[], stop: boolean) => {
    setBusy(true);
    try {
      const r = await setLearningStopped(country, sup.code, keys, stop);
      setStopped(new Set(r.stopped));
      toast(t(stop ? '已终止学习，下一轮训练不再使用' : '已恢复学习'));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    } finally {
      setBusy(false);
    }
  };

  const active = detail.items.filter((n) => {
    if (stopped.has(nameKey(n.id))) return false;
    if (onlyU && nameStatus(n, stopped).ok) return false;
    return !q.trim() || n.name.includes(q.trim());
  });
  const stopList = stoppedItems(detail.items, stopped);
  const cards = pageOf(active, cardPage, CARD_PAGE);
  const sel = detail.items.find((n) => n.id === selId);

  // 已终止页签下，品名未整体终止时只列出被终止的规格
  const specs = sel
    ? tab === 'stopped' && !stopped.has(nameKey(sel.id))
      ? sel.specs.filter((x) => stopped.has(specKey(x.sid)))
      : sel.specs
    : [];
  const specP = pageOf(specs, specPage, LIST_PAGE);
  const curSpec = sel?.specs.find((x) => x.sid === selSid);
  const invs = curSpec && curSpec.ok ? curSpec.invoices : [];
  const invP = pageOf(invs, invPage, LIST_PAGE);

  const kpis: Array<{ label: string; value: ReactNode; tone: string }> = [
    { label: '供货物料数', value: sup.materials.toLocaleString('en-US'), tone: 'blue' },
    { label: '含规格数', value: kpi.specs.toLocaleString('en-US'), tone: 'blue' },
    { label: '已对上发票', value: kpi.learned.toLocaleString('en-US'), tone: 'green' },
    { label: '未匹配', value: kpi.unmatched.toLocaleString('en-US'), tone: 'orange' },
  ];
  const C = 2 * Math.PI * 13;

  const nameCard = (n: TrainingName) => {
    const st = nameStatus(n, stopped);
    const on = n.id === selId;
    return (
      <div key={n.id} className={cx(s.nameCard, !st.ok && s.nameWarn, on && s.nameOn)}>
        <button type="button" className={s.nameMain} aria-pressed={on} onClick={() => select(n.id)}>
          <Chip tone={st.ok ? 'green' : 'orange'} className={s.nameTag}>
            {t(st.ok ? '已学习' : '未完全学习')}
          </Chip>
          <span className={s.nameText} translate="no">
            {n.name}
          </span>
          <span className={s.nameSub}>
            {st.ok ? t('全部') : `${t('学习率')} ${st.learned}/${st.total}`} · {t(n.specs.length + '个规格')}
          </span>
        </button>
        <Button
          size="sm"
          variant="ghost"
          iconOnly
          className={s.cardAct}
          disabled={busy}
          aria-label={t('终止学习') + ' · ' + n.name}
          title={t('终止学习')}
          onClick={() => {
            if (selId === n.id) select(null);
            void update([nameKey(n.id)], true);
          }}
        >
          <Icon name="trash" size={13} />
        </Button>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        crumb={`${t('数据管理')} / ${t('匹配训练成果')}`}
        title={<span translate="no">{sup.name}</span>}
        subtitle={t('发票品名与最近 12 个月供货物料的对应学习情况；终止学习的品名 / 规格不再参与模型训练。')}
        actions={
          <ButtonLink to={ROUTES.dataMatchTraining()} icon={<Icon name="chevronLeft" size={14} />}>
            {t('返回')}
          </ButtonLink>
        }
      />
      <PageBody className={s.body}>
        <Card padded={false} className={s.kpis}>
          <div className={s.kpi}>
            <svg width="40" height="40" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="13" className={s.ringTrack} />
              <circle
                cx="18"
                cy="18"
                r="13"
                className={s.ringBar}
                strokeDasharray={`${(C * sup.coverage) / 100} ${C}`}
                transform="rotate(-90 18 18)"
              />
            </svg>
            <div>
              <div className={cx('num', s.kpiNum, s.good)}>{sup.coverage}%</div>
              <div className={s.kpiLabel}>{t('物料覆盖率')}</div>
            </div>
          </div>
          {kpis.map((k) => (
            <div key={k.label} className={s.kpi}>
              <div>
                <div className={cx('num', s.kpiNum, s[`tone_${k.tone}`])}>{k.value}</div>
                <div className={s.kpiLabel}>{t(k.label)}</div>
              </div>
            </div>
          ))}
        </Card>

        <Card padded={false} className={s.zone}>
          <div className={s.zoneHead}>
            <div className={s.zoneTitle}>
              <h2>{t('入库单物料品名')}</h2>
              <span className={s.muted}>{t('点击卡片选择品名，在下方查看规格明细')}</span>
            </div>
            <div className={s.zoneTools}>
              {tab === 'active' ? (
                <>
                  <Input
                    className={s.miniSearch}
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t('搜索品名')}
                    aria-label={t('搜索品名')}
                  />
                  <Button
                    size="sm"
                    variant={onlyU ? 'primary' : 'default'}
                    aria-pressed={onlyU}
                    icon={<Icon name="warn" size={13} />}
                    onClick={() => setOnlyU((v) => !v)}
                  >
                    {t('仅看未匹配')}
                  </Button>
                  <span className={cx('num', s.muted)}>{t('共 ' + active.length + ' 个品名')}</span>
                </>
              ) : null}
              <Segmented<'active' | 'stopped'>
                ariaLabel={t('学习状态')}
                value={tab}
                onChange={switchTab}
                options={[
                  { value: 'active', label: t('学习中') },
                  {
                    value: 'stopped',
                    label: (
                      <>
                        {t('已终止学习')}
                        {stopped.size ? <span className={cx('num', s.count)}>{stopped.size}</span> : null}
                      </>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          {tab === 'active' ? (
            <>
              <div className={s.cards}>{cards.slice.map(nameCard)}</div>
              {!cards.slice.length ? <Empty /> : null}
              <Pager page={cards.page} pages={cards.pages} onPage={setCardPage} />
            </>
          ) : (
            <>
              <div className={s.stopNote}>{t('点击卡片可查看规格，终止后不再参与模型训练')}</div>
              {stopList.length ? (
                <div className={s.cards}>
                  {stopList.map((it) => {
                    const on = it.name.id === selId;
                    return (
                      <div key={it.name.id} className={cx(s.nameCard, it.isStopped && s.nameWarn, on && s.nameOn)}>
                        <button
                          type="button"
                          className={s.nameMain}
                          aria-pressed={on}
                          onClick={() => select(it.name.id)}
                        >
                          <Chip tone={it.isStopped ? 'gray' : 'green'} className={s.nameTag}>
                            {t(it.isStopped ? '已终止' : '学习中')}
                          </Chip>
                          <span className={s.nameText} translate="no">
                            {it.name.name}
                          </span>
                          <span className={s.nameSub}>
                            {it.nameStopped
                              ? t('品名已终止 · ' + it.name.specs.length + '个规格')
                              : it.isStopped
                                ? t('全部规格已终止')
                                : t('已终止 ' + it.stoppedSpecs + '/' + it.name.specs.length + ' 个规格')}
                          </span>
                        </button>
                        {it.isStopped ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            iconOnly
                            className={s.cardAct}
                            disabled={busy}
                            aria-label={t('重新学习') + ' · ' + it.name.name}
                            title={t('重新学习')}
                            onClick={() =>
                              void update(
                                it.nameStopped ? [nameKey(it.name.id)] : it.name.specs.map((x) => specKey(x.sid)),
                                false,
                              )
                            }
                          >
                            <Icon name="refresh" size={13} />
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty title={t('暂无已终止学习的物料')} />
              )}
            </>
          )}
        </Card>

        <div className={s.bottom}>
          <Card padded={false} className={s.panel}>
            <div className={s.panelHead}>
              <h2 translate={sel ? 'no' : undefined}>{sel ? sel.name : t('规格列表')}</h2>
              <span className={s.muted}>{sel ? t('共 ' + specs.length + ' 条') : t('请先选择品名')}</span>
            </div>
            {!sel ? (
              <div className={s.emptyTip}>{t('点击上方品名卡片查看规格')}</div>
            ) : (
              <>
                <ul className={s.specList}>
                  {specP.slice.map((x) => {
                    const st = specStatus(x, stopped);
                    const tag = SPEC_TAG[st];
                    const on = x.sid === selSid;
                    return (
                      <li key={x.sid} className={cx(s.specRow, on && s.specOn, st === 'stopped' && s.specStopped)}>
                        <button
                          type="button"
                          className={s.specMain}
                          aria-pressed={on}
                          onClick={() => {
                            setSelSid(x.sid);
                            setInvPage(1);
                          }}
                        >
                          <span className={s.specName} translate="no">
                            {x.spec}
                          </span>
                          <span className={s.muted}>
                            {t('单位：')}
                            <span translate="no">{x.unit}</span>
                          </span>
                        </button>
                        <Chip tone={tag.tone}>{t(tag.label)}</Chip>
                        {st === 'stopped' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            iconOnly
                            disabled={busy || stopped.has(nameKey(sel.id))}
                            aria-label={t('重新学习') + ' · ' + x.spec}
                            title={t('重新学习')}
                            onClick={() => void update([specKey(x.sid)], false)}
                          >
                            <Icon name="refresh" size={13} />
                          </Button>
                        ) : st === 'unlearned' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            iconOnly
                            disabled={busy}
                            aria-label={t('终止学习') + ' · ' + x.spec}
                            title={t('终止学习')}
                            onClick={() => {
                              if (selSid === x.sid) setSelSid(null);
                              void update([specKey(x.sid)], true);
                            }}
                          >
                            <Icon name="trash" size={13} />
                          </Button>
                        ) : (
                          <span className={s.actGap} aria-hidden="true" />
                        )}
                      </li>
                    );
                  })}
                </ul>
                <Pager page={specP.page} pages={specP.pages} onPage={setSpecPage} />
              </>
            )}
          </Card>

          <Card padded={false} className={s.panel}>
            <div className={s.panelHead}>
              <h2>{t('已学习发票匹配详情')}</h2>
              <span className={s.muted}>
                {curSpec ? (
                  <>
                    <span translate="no">
                      {curSpec.spec} · {curSpec.unit}
                    </span>
                    {invs.length ? ' · ' + t('共 ' + invs.length + ' 条') : ''}
                  </>
                ) : (
                  t('请选择左侧规格')
                )}
              </span>
            </div>
            {!curSpec ? (
              <div className={s.emptyTip}>{t('选择左侧规格查看发票匹配')}</div>
            ) : !invs.length ? (
              <div className={s.emptyTip}>{t('该规格暂无匹配发票，待人工标注后参与训练')}</div>
            ) : (
              <>
                <Table className={s.invTable}>
                  <thead>
                    <tr>
                      <th>{t('发票品名')}</th>
                      <th>{t('发票规格')}</th>
                      <th>{t('发票单位')}</th>
                      <th>{t('单位换算比例')}</th>
                    </tr>
                  </thead>
                  <tbody translate="no">
                    {invP.slice.map((v, i) => (
                      <tr key={i}>
                        <td>{v.iname}</td>
                        <td>{v.ispec}</td>
                        <td>{v.iunit}</td>
                        <td className={cx('num', s.conv)}>
                          {curSpec.unit === v.iunit ? '' : `1 ${curSpec.unit} ≈ ${ratioText(v.ratio)} ${v.iunit}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <Pager page={invP.page} pages={invP.pages} onPage={setInvPage} />
              </>
            )}
          </Card>
        </div>
      </PageBody>
    </>
  );
}
