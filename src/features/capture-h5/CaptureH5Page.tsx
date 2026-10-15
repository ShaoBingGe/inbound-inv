import { useCallback, useMemo, useState } from 'react';
import { ErrorState, Icon, PageHeader, PageLoading, useToast } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { cx } from '@/lib/sample';
import { applyCorrection, assignPlaceOfIssue, confirmInvoice, fetchCaptureSession, flagField, importInvoices } from './api';
import { CaptureModel, FIELD_NAME, initialState, withFix, type CaptureState, type CheckView, type FieldView } from './model';
import type { CaptureSession, GeoCode, InvoiceRow } from './types';
import { CaptureToolbar } from './components/CaptureToolbar';
import { CountryPicker } from './components/CountryPicker';
import { EditDrawer } from './components/EditDrawer';
import { InvoiceList, type RowHandlers } from './components/InvoiceList';
import { PhonePreview, type PhoneHandlers } from './components/PhonePreview';
import { QrDialog } from './components/QrDialog';
import { Rail } from './components/Rail';
import { SelectionFooter } from './components/SelectionFooter';
import { ICON } from './components/icons';
import s from './CaptureH5Page.module.css';

/** H5 页面采集：发票导入窗口（按票据发生地分组导入、手机拍票、校验与纠正） */
export default function CaptureH5Page() {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAsync(fetchCaptureSession, []);
  if (loading && !data) return <PageLoading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <ErrorState error={new Error(t('加载失败'))} onRetry={reload} />;
  return <CaptureWorkspace session={data} />;
}

function CaptureWorkspace({ session }: { session: CaptureSession }) {
  const { lang, t } = useI18n();
  const notify = useToast();
  const [st, setSt] = useState<CaptureState>(() => initialState(session));
  const set = useCallback((patch: Partial<CaptureState> | ((s: CaptureState) => Partial<CaptureState>)) => {
    setSt((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  const model = useMemo(() => new CaptureModel(session, st, lang, t), [session, st, lang, t]);
  const T = model.T;

  /** 写操作失败时用全局提示反馈 */
  const report = useCallback(
    (p: Promise<void>) => {
      p.catch((e: unknown) => notify(e instanceof Error ? e.message : String(e), { error: true }));
    },
    [notify],
  );

  /* ---- 操作（与设计稿原型一致） ---- */
  const pick = (code: GeoCode) => set({ sel: code, toast: '' });
  const toggleCheck = (id: number) =>
    set((s) => ({ checked: s.checked.includes(id) ? s.checked.filter((x) => x !== id) : s.checked.concat(id) }));
  const openEdit = (id: number) => set({ edit: id });
  const closeEdit = () => set({ edit: null });

  const saveEdit = () => {
    const id = st.edit;
    if (id === null) return;
    const r0 = st.rows.find((x) => x.id === id);
    if (!r0) return;
    const pend = model.checksOf(r0).filter((c) => c.st === 'fix');
    set((s) => {
      const fixed = { ...s.fixed };
      const extra: CaptureState['log'] = [];
      pend.forEach((c) => {
        fixed[id + ':' + c.key] = true;
        extra.push({
          id,
          field: c.field ? FIELD_NAME[c.field] : '',
          before: model.showVal(r0, c.from),
          after: model.showVal(r0, c.to),
          src: '确认时采纳纠正',
          at: '10-13 10:' + (30 + s.log.length + extra.length),
        });
      });
      const rows = s.rows.map((r) => {
        if (r.id !== id) return r;
        let next: InvoiceRow = r;
        pend.forEach((c) => {
          if (c.field !== 'amt') next = withFix(next, c.field, c.to);
        });
        const taxPatched = pend.some((c) => c.field === 'tax');
        const sellerTaxPatched = pend.some((c) => c.field === 'sellerTax');
        const tax = taxPatched ? next.tax : r.tax;
        return {
          ...next,
          missing: [],
          flag: null,
          tax: tax === null ? Math.round(r.amt / 11) : tax,
          sellerTax: (sellerTaxPatched ? next.sellerTax : '') || r.sellerTax || 'T7010001081486',
        };
      });
      return {
        edit: null,
        fixed,
        log: s.log.concat(extra),
        rows,
        checked: s.checked.includes(id) ? s.checked : s.checked.concat(id),
        toast: pend.length ? '已确认 1 张票据，并采纳 ' + pend.length + ' 处纠正' : '已确认 1 张票据',
      };
    });
    report(confirmInvoice(id, pend.map((c) => c.key)));
  };

  const applyFix = (c: CheckView) => {
    const id = st.edit;
    const r = st.rows.find((x) => x.id === id);
    if (!r) return;
    const def = c.def;
    const label = def.field ? FIELD_NAME[def.field] : '';
    set((s) => ({
      fixed: { ...s.fixed, [r.id + ':' + def.key]: true },
      rows: s.rows.map((x) =>
        x.id === r.id
          ? { ...(def.field === 'amt' ? { ...x } : withFix(x, def.field, def.to)), missing: x.missing.filter((k) => k !== def.field) }
          : x,
      ),
      log: s.log.concat([
        {
          id: r.id,
          field: label,
          before: model.showVal(r, def.from),
          after: model.showVal(r, def.to),
          src: '采纳自动纠正',
          at: '10-13 10:' + (20 + s.log.length),
        },
      ]),
      toast: '已采纳纠正：' + label + '，修正前后已记录',
    }));
    report(applyCorrection(r.id, def.key));
  };

  const toggleMark = (f: FieldView) => {
    if (f.locked) return;
    const id = st.edit;
    if (id === null) return;
    const k = id + ':' + f.key;
    const on = !st.marks[k];
    set((s) => ({
      marks: { ...s.marks, [k]: on },
      log: on
        ? s.log.concat([
            { id, field: f.rawLabel, before: f.logValue, after: '待人工更正', src: '人工标注 · 转数据修正', at: '10-13 10:' + (40 + s.log.length) },
          ])
        : s.log.filter((l) => !(l.id === id && l.field === f.rawLabel && l.after === '待人工更正')),
      toast: on ? '已标注「' + f.rawLabel + '」识别有误，已转入发票数据修正队列' : '已撤销标注',
    }));
    report(flagField(id, f.key, on));
  };

  const assignTo = (id: number, code: GeoCode) => {
    set((s) => ({
      rows: s.rows.map((r) =>
        r.id === id ? { ...r, c: code, flag: null, missing: ['seller', 'no', 'date', 'amt'], kind: '票据' } : r,
      ),
      active: s.active.indexOf(code) < 0 ? s.active.concat(code) : s.active,
      picker: false,
      pickTarget: null,
      q: '',
      letter: '',
      toast: '已改判至 ' + model.nameOf(code) + '，原件保留，按该国规则重新识别',
    }));
    report(assignPlaceOfIssue(id, code));
  };

  const addCountry = (code: GeoCode) => {
    if (st.pickTarget !== null) {
      assignTo(st.pickTarget, code);
      return;
    }
    set((s) => ({
      active: s.active.indexOf(code) < 0 ? s.active.concat(code) : s.active,
      sel: code,
      picker: false,
      q: '',
      letter: '',
      toast: '',
    }));
  };

  /* ---- 手机拍票会话 ---- */
  const openPhone = () => set({ qr: 'waiting', shots: 0, taxOk: false, toast: '' });
  const closeQr = useCallback(() => set({ qr: null }), [set]);
  const advanceQr = () =>
    set((s) => {
      if (s.qr === 'waiting') return { qr: 'cam' };
      if (s.qr === 'cam') return { qr: 'result', taxOk: false };
      if (s.qr === 'result') return { qr: 'sent', shots: s.shots + 1 };
      return { qr: 'cam', taxOk: false };
    });

  const capture = () => {
    const m = model.meta(st.sel);
    set({ toast: m.tier === 'none' ? '已上传 · 需人工录入' : '识别中 · 正在读取票面字段…' });
  };
  const manual = () => {
    set((s) => {
      const id = 900 + s.rows.length;
      const nr: InvoiceRow = {
        id,
        c: s.sel,
        kind: '手动录入',
        seller: '',
        no: '',
        date: '',
        amt: 0,
        net: null,
        tax: null,
        sellerTax: '',
        rateClass: '',
        attach: 0,
        missing: ['seller', 'no', 'date', 'amt'],
        flag: null,
        isNew: true,
      };
      return { rows: s.rows.concat(nr), edit: id, toast: '' };
    });
  };
  const onImport = () => {
    const ids = model.checkedIds();
    set({ toast: '已导入 ' + ids.length + ' 张至报销单' });
    report(importInvoices(session.reportNo, ids));
  };

  const openPicker = () => set({ picker: true, pickTarget: null, q: '', letter: '' });
  const closePicker = () => set({ picker: false, pickTarget: null, q: '', letter: '' });

  const rowHandlers: RowHandlers = {
    onToggle: toggleCheck,
    onEdit: openEdit,
    onAssign: assignTo,
    onMore: (id) => set({ picker: true, pickTarget: id, q: '', letter: '' }),
  };
  const phoneHandlers: PhoneHandlers = {
    onShutter: advanceQr,
    onAcceptTax: () => set({ taxOk: true }),
    onRetake: () => set({ qr: 'cam' }),
    onUse: advanceQr,
    onAgain: () => set({ qr: 'cam', taxOk: false }),
  };

  const head = model.head();
  const cur = model.current();
  const qr = model.qr();
  const phone = model.phone();

  return (
    <div className={s.page}>
      <PageHeader
        crumb={`${t('采集')} / ${t('H5页面采集')}`}
        title={head.title}
        badges={
          <>
            <span className={s.vsep} aria-hidden="true" />
            <span className={cx('num', s.headMeta)} translate="no">
              {head.meta}
            </span>
          </>
        }
        actions={
          <>
            <span className={cx('num', s.headCount)}>{head.count}</span>
            <span className={s.vsep} aria-hidden="true" />
            <span
              className={cx('num', s.headErr, head.errHigh && s.headErrHigh)}
              title={t('字段识别误差 = 被纠正、被税局覆盖或被标注有误的字段 ÷ 识别字段')}
            >
              {head.errLine}
            </span>
            <span className={s.vsep} aria-hidden="true" />
            <button type="button" className={s.closeBtn} aria-label={T.close}>
              <Icon name="close" size={15} strokeWidth={1.4} />
            </button>
          </>
        }
      />

      <div className={s.scroller}>
        <div className={s.stage}>
          <div className={cx(s.window, phone && s.windowNarrow)}>
            <div className={s.body}>
              <Rail T={T} items={model.rail()} unk={model.unk()} onPick={pick} onAdd={openPicker} />

              <div className={s.mainCol}>
                {cur.showCapture ? (
                  <CaptureToolbar
                    T={T}
                    name={cur.name}
                    rateLine={cur.rateLine}
                    can={cur.can}
                    phoneOn={!!st.qr}
                    onCapture={capture}
                    onPhone={openPhone}
                    onManual={manual}
                  />
                ) : null}

                {st.toast ? (
                  <div className={s.banner} role="status">
                    <Icon d={ICON.tick} size={15} strokeWidth={1.5} />
                    <span>{t(st.toast)}</span>
                  </div>
                ) : null}

                <InvoiceList
                  T={T}
                  groups={model.groups()}
                  isEmpty={model.isEmpty()}
                  emptyTitle={cur.emptyTitle}
                  emptyHint={cur.emptyHint}
                  handlers={rowHandlers}
                />
              </div>
            </div>

            <SelectionFooter v={model.footer()} onImport={onImport} />

            {qr ? <QrDialog v={qr} closeLabel={T.close} onClose={closeQr} onAdvance={advanceQr} /> : null}
          </div>

          {phone ? (
            <div className={s.phoneCol}>
              <PhonePreview v={phone} h={phoneHandlers} />
            </div>
          ) : null}
        </div>
      </div>

      <CountryPicker
        T={T}
        v={model.picker()}
        onClose={closePicker}
        onQuery={(q) => set({ q, letter: '' })}
        onClear={() => set({ q: '' })}
        onLetter={(letter) => set({ letter })}
        onAdd={addCountry}
      />

      <EditDrawer T={T} v={model.edit()} onClose={closeEdit} onSave={saveEdit} onFix={applyFix} onMark={toggleMark} />
    </div>
  );
}
