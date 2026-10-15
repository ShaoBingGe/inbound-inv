import { useEffect, useMemo, useState } from 'react';
import { Button, Chip, ErrorState, Input, Modal, Spinner } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { useAsync } from '@/lib/useAsync';
import type { CountryCode } from '../../types';
import { fetchMatchPool, fetchPendingDocs } from '../../match/api';
import { DOC_LINE_LABEL } from '../../match/data';
import { cny } from '../../match/logic';
import type { PendingDoc, PoolDoc } from '../../match/types';
import { DocPicker, type PickerDoc } from './DocPicker';
import s from './match.module.css';

const hit = (q: string, ...parts: string[]) => !q || parts.join(' ').toLowerCase().includes(q);
const toggle = (o: Record<string, boolean>, id: string) => {
  const n = { ...o };
  if (n[id]) delete n[id];
  else n[id] = true;
  return n;
};

function poolDocs(docs: PoolDoc[], q: string): PickerDoc[] {
  return docs
    .map((d) => ({
      d,
      lines: d.lines.filter((l) => hit(q, l.lid, l.name, l.spec, d.id)),
    }))
    .filter((x) => x.lines.length)
    .map(({ d, lines }) => ({
      id: d.id,
      sub: <span translate="no">{d.party}</span>,
      amt: cny(lines.reduce((a, l) => a + l.amt, 0)),
      lines: lines.map((l) => (
        <div key={l.lid} className={s.docLine}>
          <div className={s.lineMain} translate="no">
            <div className={s.lineName}>{l.name}</div>
            <div className={s.lineSub}>{l.spec}</div>
          </div>
          <span className={cx('num', s.lineAmt)}>{cny(l.amt)}</span>
        </div>
      )),
    }));
}

/** 新增匹配组：发票必选；未勾选入库单时默认匹配全部入库单 */
export function CreateGroupModal({
  country,
  open,
  onClose,
  onCreate,
}: {
  country: CountryCode;
  open: boolean;
  onClose: () => void;
  onCreate: (inv: string[], inb: string[]) => Promise<void>;
}) {
  const t = useT();
  const pool = useAsync(() => (open ? fetchMatchPool(country) : Promise.resolve(null)), [open, country]);
  const [sel, setSel] = useState<{
    inv: Record<string, boolean>;
    inb: Record<string, boolean>;
  }>({ inv: {}, inb: {} });
  const [q, setQ] = useState({ inv: '', inb: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (open) {
      setSel({ inv: {}, inb: {} });
      setQ({ inv: '', inb: '' });
      setErr('');
    }
  }, [open]);
  const invN = Object.keys(sel.inv).length;
  const inbN = Object.keys(sel.inb).length;

  const col = (side: 'inv' | 'inb', title: string, placeholder: string) => {
    const docs = pool.data?.[side] ?? [];
    const query = q[side].trim().toLowerCase();
    return (
      <div>
        <div className={s.colTitle}>{t(title)}</div>
        <Input
          className={s.search}
          type="search"
          value={q[side]}
          placeholder={t(placeholder)}
          aria-label={t(placeholder)}
          onChange={(e) => setQ((x) => ({ ...x, [side]: e.target.value }))}
        />
        <DocPicker
          docs={poolDocs(docs, query)}
          selected={sel[side]}
          forceOpen={!!query}
          onToggle={(id) => setSel((x) => ({ ...x, [side]: toggle(x[side], id) }))}
        />
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={920}
      title={t('新增匹配组')}
      headerExtra={<span className={s.docSub}>{t('发票必选 · 未勾选入库单时默认匹配全部入库单')}</span>}
      footer={
        <div className={s.foot}>
          <span className={cx(s.footNote, err && s.ink_red)} role={err ? 'alert' : undefined}>
            {err || `${t('已选发票')} ${invN} · ${t('入库单')} ${inbN}`}
          </span>
          <Button onClick={onClose}>{t('取消')}</Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              if (!invN) {
                setErr(t('请至少选择一张发票'));
                return;
              }
              setBusy(true);
              try {
                await onCreate(Object.keys(sel.inv), Object.keys(sel.inb));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('创建匹配组')}
          </Button>
        </div>
      }
    >
      {pool.error ? (
        <ErrorState error={pool.error} onRetry={pool.reload} />
      ) : !pool.data ? (
        <Spinner label={t('加载中')} />
      ) : (
        <div className={s.modalCols}>
          {col('inv', '发票（必选 · ' + invN + ' 张已选）', '搜索发票号 / 品名 / 规格')}
          {col('inb', '入库单（可选 · ' + inbN + ' 张已选）', '搜索入库单号 / 品名 / 规格')}
        </div>
      )}
    </Modal>
  );
}

/** 未匹配发票明细 / 供应商待匹配入库单明细：勾选后添加至新匹配组 */
export function PendingDocsModal({
  country,
  kind,
  onClose,
  onAdd,
}: {
  country: CountryCode;
  kind: 'inv' | 'inb' | null;
  onClose: () => void;
  onAdd: (kind: 'inv' | 'inb', ids: string[]) => Promise<void>;
}) {
  const t = useT();
  const docs = useAsync<PendingDoc[] | null>(
    () => (kind ? fetchPendingDocs(country, kind) : Promise.resolve(null)),
    [kind, country],
  );
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    setSel({});
    setQ('');
    setErr('');
  }, [kind]);
  const isInv = kind === 'inv';
  const query = q.trim().toLowerCase();
  const n = Object.keys(sel).length;

  const items = useMemo<PickerDoc[]>(
    () =>
      (docs.data ?? [])
        .filter((d) => hit(query, d.id, d.party, ...d.lines.map((l) => l.name + l.spec)))
        .map((d) => {
          const st = d.status ? DOC_LINE_LABEL[d.status] : null;
          return {
            id: d.id,
            sub: (
              <>
                <span translate="no">{d.party}</span> · <span className="num">{d.date}</span>
              </>
            ),
            amt: cny(d.lines.reduce((a, l) => a + l.amt, 0)),
            badge: st ? (
              <Chip tone={st.tone}>{t(st.label)}</Chip>
            ) : (
              <Chip>
                {d.lines.length} {t('明细行')}
              </Chip>
            ),
            lines: d.lines.map((l, i) => {
              const ls = DOC_LINE_LABEL[l.st];
              return (
                <div key={i} className={s.docLine}>
                  <div className={s.lineMain} translate="no">
                    <div className={s.lineName}>{l.name}</div>
                    <div className={s.lineSub}>{l.spec}</div>
                  </div>
                  {isInv ? (
                    <>
                      <span className={s.lineCell}>
                        {t('数量')} <span translate="no">{l.qty}</span>
                      </span>
                      <span className={cx('num', s.lineCell)}>
                        {t('单价')} ¥{l.price}
                      </span>
                      <span className={cx('num', s.lineCell)}>
                        {t('税率')} {l.tax}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={s.lineCell}>
                        {t('入库')} <span translate="no">{l.qty}</span>
                      </span>
                      <span className={s.lineCell}>
                        {t('余额')} <span translate="no">{l.bal}</span>
                      </span>
                    </>
                  )}
                  <span className={cx('num', s.lineAmt)}>{cny(l.amt)}</span>
                  <Chip tone={ls.tone}>{t(ls.label)}</Chip>
                </div>
              );
            }),
          };
        }),
    [docs.data, query, isInv, t],
  );

  return (
    <Modal
      open={!!kind}
      onClose={onClose}
      width={820}
      title={
        <div>
          <div>{t(isInv ? '未匹配发票明细' : '供应商待匹配入库单明细')}</div>
          <div className={s.docSub}>
            {t(
              isInv
                ? '按发票维度展示未匹配 / 部分匹配发票 · 勾选后添加至新匹配组'
                : '按入库单维度展示待匹配入库单 · 展开查看入库余额 · 勾选后添加至新匹配组',
            )}
          </div>
        </div>
      }
      footer={
        <div className={s.foot}>
          <span className={cx(s.footNote, err && s.ink_red)} role={err ? 'alert' : undefined}>
            {err || t('已选 ' + n + ' 张单据')}
          </span>
          <Button onClick={onClose}>{t('关闭')}</Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              if (!kind) return;
              if (!n) {
                setErr(t('请至少勾选一张单据'));
                return;
              }
              setBusy(true);
              try {
                await onAdd(kind, Object.keys(sel));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('添加至新匹配组')}
            {n ? `（${n}）` : ''}
          </Button>
        </div>
      }
    >
      <Input
        className={s.search}
        type="search"
        value={q}
        placeholder={t('搜索单据号 / 往来单位 / 品名 / 规格')}
        aria-label={t('搜索单据号 / 往来单位 / 品名 / 规格')}
        onChange={(e) => setQ(e.target.value)}
      />
      {docs.error ? (
        <ErrorState error={docs.error} onRetry={docs.reload} />
      ) : !docs.data ? (
        <Spinner label={t('加载中')} />
      ) : (
        <DocPicker docs={items} selected={sel} forceOpen={!!query} onToggle={(id) => setSel((x) => toggle(x, id))} />
      )}
    </Modal>
  );
}
