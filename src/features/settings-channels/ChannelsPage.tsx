import { useState, type MouseEvent } from 'react';
import { Chip, ErrorState, PageBody, PageHeader, PageLoading, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { fetchChannelsConfig, publishPolicy } from './api';
import type { ChannelKey, ChannelsConfig, EmbedTabKey, FamKey, PolicyMatrix as Matrix, PresetKey, SubOverrides } from './types';
import { ChannelCards } from './components/ChannelCards';
import { PolicyMatrix } from './components/PolicyMatrix';
import { OrderPanel } from './components/OrderPanel';
import { PanoramaPanel } from './components/PanoramaPanel';
import { EmbedPanel } from './components/EmbedPanel';
import { RuleLibrary, type RuleFilter } from './components/RuleLibrary';
import { TaxonomyPanel } from './components/TaxonomyPanel';
import s from './ChannelsPage.module.css';

const JUMPS: Array<[string, string]> = [
  ['matrix', '校验策略矩阵'],
  ['order', '执行顺序与问题全景'],
  ['embed', 'H5 / 移动端嵌入调用'],
  ['rules', '校验与纠正规则库'],
  ['taxonomy', '问题分类与展示规范'],
];

const clone = (m: Matrix): Matrix => JSON.parse(JSON.stringify(m)) as Matrix;

type Msg = { kind: 'none' } | { kind: 'nothing' } | { kind: 'published'; ver: number };

export default function ChannelsPage() {
  const t = useT();
  const { data, loading, error, reload } = useAsync(fetchChannelsConfig, []);
  const header = (
    <PageHeader
      crumb={`${t('设置')} / ${t('采集渠道与校验策略')}`}
      title={t('采集渠道与校验策略')}
      badges={<Chip tone="gray">{t('示例数据')}</Chip>}
      actions={<span className={s.headerNote}>{t('5 个采集渠道 × 5 类校验 · 每个渠道可套用不同的策略组合')}</span>}
    />
  );
  return (
    <>
      {header}
      <PageBody>
        {loading && !data ? <PageLoading /> : error ? <ErrorState error={error} onRetry={reload} /> : data ? <ChannelsView config={data} /> : null}
      </PageBody>
    </>
  );
}

function jumpTo(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
}

function ChannelsView({ config }: { config: ChannelsConfig }) {
  const t = useT();
  const toast = useToast();
  const [sel, setSel] = useState<ChannelKey>('erp');
  const [pol, setPol] = useState<Matrix>(() => clone(config.current.pol));
  const [sub, setSub] = useState<SubOverrides>(() => ({ ...config.current.sub }));
  const [open, setOpen] = useState<Partial<Record<FamKey, boolean>>>({ ocr: true });
  const [ver, setVer] = useState(config.current.ver);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<Msg>({ kind: 'none' });
  const [saving, setSaving] = useState(false);
  const [embedTab, setEmbedTab] = useState<EmbedTabKey>('sdk');
  const [ruleFam, setRuleFam] = useState<RuleFilter>('all');

  const channel = config.channels.find((c) => c.k === sel) ?? config.channels[0];
  const { cycle } = config;
  const next = <T,>(v: T, xs: T[]) => xs[(xs.indexOf(v) + 1) % xs.length];

  const touch = () => {
    setDirty(true);
    setMsg({ kind: 'none' });
  };

  const onCycle = (ch: ChannelKey, fam: FamKey, subKey: string | null) => {
    if (subKey) {
      const key = `${ch}:${fam}:${subKey}`;
      const v = sub[key] || pol[ch][fam];
      setSub({ ...sub, [key]: next(v, cycle) });
    } else {
      const m = clone(pol);
      m[ch][fam] = next(pol[ch][fam], cycle);
      setPol(m);
    }
    touch();
  };

  const onApplyPreset = (k: PresetKey) => {
    const preset = config.presets.find((p) => p.k === k);
    if (!preset) return;
    const m = clone(pol);
    m[sel] = { ...preset.v };
    if (sel === 'tax' || sel === 'peppol') m[sel].ocr = 'na';
    const nextSub: SubOverrides = {};
    Object.keys(sub).forEach((x) => {
      if (x.indexOf(sel + ':') !== 0) nextSub[x] = sub[x];
    });
    setPol(m);
    setSub(nextSub);
    touch();
  };

  const onReset = () => {
    setPol(clone(config.defaults.pol));
    setSub({ ...config.defaults.sub });
    setDirty(false);
    setMsg({ kind: 'none' });
  };

  const onSave = async () => {
    if (!dirty) {
      setMsg({ kind: 'nothing' });
      return;
    }
    setSaving(true);
    try {
      const r = await publishPolicy({ baseVer: ver, pol, sub });
      setVer(r.ver);
      setDirty(false);
      setMsg({ kind: 'published', ver: r.ver });
      toast(t('已发布 policy-v') + r.ver + t('，5 个渠道 5 分钟内生效'));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    } finally {
      setSaving(false);
    }
  };

  const note =
    msg.kind === 'nothing'
      ? t('没有修改需要发布')
      : msg.kind === 'published'
        ? t('已发布 policy-v') + msg.ver + t('，5 个渠道 5 分钟内生效')
        : dirty
          ? t('有未发布的修改；发布后对新采集的发票生效，历史发票按采集时的组合版本处理')
          : t('当前生效：policy-v') + ver + t(' · ' + config.current.publishedAt + ' 发布');
  const nextVer = ver + (dirty ? 1 : 0);

  return (
    <div className={s.page}>
      <nav aria-label={t('页内导航')} className={s.jumpNav}>
        <span className="kick">{t('跳到')}</span>
        {JUMPS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className={s.jumpLink} onClick={(e) => jumpTo(e, id)}>
            {t(label)}
          </a>
        ))}
      </nav>

      <ChannelCards channels={config.channels} presets={config.presets} sel={sel} onPick={setSel} />

      <PolicyMatrix
        channels={config.channels}
        families={config.families}
        policies={config.policies}
        presets={config.presets}
        sel={sel}
        pol={pol}
        sub={sub}
        open={open}
        note={note}
        nextVer={nextVer}
        saving={saving}
        onCycle={onCycle}
        onToggle={(f) => setOpen({ ...open, [f]: !open[f] })}
        onApplyPreset={onApplyPreset}
        onReset={onReset}
        onSave={onSave}
      />

      <div id="order" tabIndex={-1} className={`${s.orderWrap} ${s.anchor}`}>
        <OrderPanel channel={channel} row={pol[channel.k]} policies={config.policies} />
        <PanoramaPanel channelName={channel.name} sample={config.samples[channel.k]} families={config.families} row={pol[channel.k]} />
      </div>

      <EmbedPanel
        codes={config.codes}
        params={config.params}
        events={config.events}
        qr={config.qr}
        tab={embedTab}
        onTab={setEmbedTab}
        ver={nextVer}
      />

      <RuleLibrary rules={config.rules} families={config.families} channels={config.channels} filter={ruleFam} onFilter={setRuleFam} />

      <TaxonomyPanel rows={config.taxonomy} />
    </div>
  );
}
