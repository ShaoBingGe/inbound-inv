import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, ButtonLink, Chip, Drawer, Table, Tabs, useToast } from '@/components/ui';
import type { Tone } from '@/components/ui';
import { PROTOTYPE_ROUTE, ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { acceptWithinTolerance, advanceApVoucher, pushToExpense, rematchInvoice } from '../api';
import { LINE_LABEL, MATCH_LABEL } from '../data';
import { effective, errPct, isHighErr, routeShort } from '../helpers';
import type {
  ApState,
  DetailTab,
  ExpState,
  InvoiceOverride,
  MatchState,
  WalletCountry,
  WalletInvoice,
  WalletSupplier,
} from '../types';
import styles from '../SupplierWalletPage.module.css';

type T = (s: string | number | null | undefined) => string;

interface Props {
  invoice: WalletInvoice | null;
  supplier: WalletSupplier;
  country: WalletCountry;
  over: Record<string, InvoiceOverride>;
  tab: DetailTab;
  onTab: (tab: DetailTab) => void;
  onClose: () => void;
  onPatch: (no: string, patch: InvoiceOverride) => void;
}

export function InvoiceDrawer({ invoice, supplier, country, over, tab, onTab, onClose, onPatch }: Props) {
  const t = useT();
  return (
    <Drawer
      open={!!invoice}
      onClose={onClose}
      width={720}
      title={
        invoice ? (
          <div className={styles.detHead} aria-label={t('发票详情')}>
            <div className="kick">
              {t(country.name)} · {t(invoice.kind)} · {t(routeShort(invoice.route))}
            </div>
            <div className={cx('mono', styles.detNo)}>{invoice.no}</div>
            <div className={styles.detSub}>
              {t(supplier.name)} · <span className="num">{invoice.amt}</span>
            </div>
          </div>
        ) : null
      }
    >
      {invoice ? (
        <DetailBody
          key={invoice.no}
          inv={invoice}
          supplier={supplier}
          over={over}
          tab={tab}
          onTab={onTab}
          onPatch={onPatch}
          t={t}
        />
      ) : null}
    </Drawer>
  );
}

function DetailBody({
  inv,
  supplier,
  over,
  tab,
  onTab,
  onPatch,
  t,
}: {
  inv: WalletInvoice;
  supplier: WalletSupplier;
  over: Record<string, InvoiceOverride>;
  tab: DetailTab;
  onTab: (tab: DetailTab) => void;
  onPatch: (no: string, patch: InvoiceOverride) => void;
  t: T;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { m, ap, ex } = effective(inv, over);
  const flash = (text: string) => toast(text, { ms: 2800 });

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

  const tabs: { value: DetailTab; label: string }[] = [
    { value: 'face', label: t('票面') },
    { value: 'match', label: t('三单匹配') },
    { value: 'ap', label: t('AP 自动化') },
    { value: 'exp', label: t('费控') },
    { value: 'log', label: t('修正记录') },
  ];

  return (
    <>
      <div className={styles.detTabs}>
        <Tabs items={tabs} value={tab} onChange={onTab} />
      </div>
      <div className={styles.panel} role="tabpanel">
        {tab === 'face' ? <FacePanel inv={inv} supplier={supplier} t={t} /> : null}
        {tab === 'match' ? (
          <MatchPanel
            inv={inv}
            supplierName={supplier.name}
            m={m}
            busy={busy}
            t={t}
            onRematch={() =>
              run(async () => {
                const r = await rematchInvoice(inv.no);
                if (r.changed && r.m) onPatch(inv.no, { m: r.m });
                flash(t('已重新匹配：结果未变化（收货与单价未更新）'));
              })
            }
            onAccept={() => {
              if (m !== 'diff') {
                flash(t('当前没有需要接受的差异'));
                return;
              }
              void run(async () => {
                const r = await acceptWithinTolerance(inv.no);
                onPatch(inv.no, { m: r.m });
                flash(t('已在容差内接受差异，记录审批意见'));
              });
            }}
          />
        ) : null}
        {tab === 'ap' ? (
          <ApPanel
            inv={inv}
            m={m}
            ap={ap}
            busy={busy}
            t={t}
            onGen={() =>
              run(async () => {
                const r = await advanceApVoucher(inv.no, ap);
                onPatch(inv.no, { ap: r.ap });
                flash(ap === 'draft' ? t('已过账') : t('已生成 AP 单，进入审批'));
              })
            }
          />
        ) : null}
        {tab === 'exp' ? (
          <ExpPanel
            inv={inv}
            ex={ex}
            busy={busy}
            t={t}
            onPush={() =>
              run(async () => {
                const r = await pushToExpense(inv.no);
                onPatch(inv.no, { ex: r.ex });
                flash(t('已推送到费控，关联报销单 ' + r.expenseNo));
              })
            }
          />
        ) : null}
        {tab === 'log' ? <LogPanel inv={inv} t={t} /> : null}
      </div>
    </>
  );
}

function FacePanel({ inv, supplier, t }: { inv: WalletInvoice; supplier: WalletSupplier; t: T }) {
  const amtSrc =
    inv.kind.indexOf('数电') >= 0 || inv.kind.indexOf('CFDI') >= 0 ? '税局' : inv.kind === 'ZUGFeRD' ? 'XML' : 'OCR';
  const fields: [string, string, number, string][] = [
    ['发票号', inv.no, 0.97, 'OCR'],
    ['开票日期', inv.date, 0.98, 'OCR'],
    ['金额', inv.amt, inv.err[0] ? 0.62 : 0.99, amtSrc],
    ['PO 号', inv.po, inv.po === '—' ? 0 : 0.93, 'OCR'],
    ['供应商', supplier.name, 0.95, '主数据匹配'],
  ];
  const pct = errPct(inv);
  return (
    <div className={styles.face}>
      <div className={styles.thumb} aria-hidden="true">
        <span className={styles.thumbTitle} />
        <span className={cx(styles.thumbLine, styles.thumbL1)} />
        <span className={cx(styles.thumbLine, styles.thumbL2)} />
        <span className={cx(styles.thumbLine, styles.thumbL3)} />
        <span className={styles.thumbStamp} />
      </div>
      <div className={styles.faceFields}>
        <Table>
          <thead>
            <tr>
              <th>{t('字段')}</th>
              <th>{t('值')}</th>
              <th className={styles.r}>{t('置信度')}</th>
              <th>{t('来源')}</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(([label, val, conf, src]) => {
              const tone: Tone = src === 'OCR' ? 'gray' : 'blue';
              return (
                <tr key={label}>
                  <td>{t(label)}</td>
                  <td className="mono" translate="no">
                    {val}
                  </td>
                  <td className={cx('num', styles.r, conf < 0.7 && styles.bad)}>
                    {conf ? Math.round(conf * 100) + '%' : t('未识别')}
                  </td>
                  <td>
                    <Chip tone={tone}>{t(src)}</Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <div className={cx(styles.actions, styles.faceActions)}>
          <span className={cx('num', isHighErr(pct) && styles.bad)}>
            {t('字段误差率')} {pct.toFixed(1)}%
          </span>
          <ButtonLink to={PROTOTYPE_ROUTE['Correction.dc.html']}>{t('标注并更正')}</ButtonLink>
        </div>
      </div>
    </div>
  );
}

function MatchPanel({
  inv,
  supplierName,
  m,
  busy,
  t,
  onRematch,
  onAccept,
}: {
  inv: WalletInvoice;
  supplierName: string;
  m: MatchState;
  busy: boolean;
  t: T;
  onRematch: () => void;
  onAccept: () => void;
}) {
  const ml = MATCH_LABEL[m];
  return (
    <>
      <div className={styles.matchHead}>
        <Chip tone={ml.tone}>{t(ml.label)}</Chip>
        <span className={styles.matchMeta}>
          PO <span className="mono">{inv.po}</span> {t('· 收货')} <span className="mono">{t(inv.grn)}</span>{' '}
          {t('· 容差：数量 ±2%，单价 ±1%，总额 ±500 CNY 等值')}
          {inv.mg ? (
            <>
              {' '}
              {t('· 匹配组')} <span className="mono">{inv.mg}</span>
            </>
          ) : null}
        </span>
      </div>
      <div className={styles.boxed}>
        <Table className={styles.matchTable}>
          <thead>
            <tr>
              <th>{t('行')}</th>
              <th>{t('物料')}</th>
              <th className={styles.r}>{t('PO 数量 × 单价')}</th>
              <th className={styles.r}>{t('收货数量')}</th>
              <th className={styles.r}>{t('发票数量 × 单价')}</th>
              <th>{t('结果')}</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, k) => {
              const res = (m === 'ok' || m === 'tol') && l.res === 'diff' ? 'tol' : l.res;
              const ll = LINE_LABEL[res];
              return (
                <tr key={k}>
                  <td className="num">{k + 1}</td>
                  <td>{t(l.item)}</td>
                  <td className={cx('num', styles.r)}>{t(l.po)}</td>
                  <td className={cx('num', styles.r)}>{t(l.grn)}</td>
                  <td
                    className={cx(
                      'num',
                      styles.r,
                      ll.ink === 'red' && styles.bad,
                      ll.ink === 'orange' && styles.warnInk,
                    )}
                  >
                    {t(l.inv)}
                  </td>
                  <td>
                    <Chip tone={ll.tone}>{t(ll.label)}</Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      <div className={styles.actions}>
        {inv.mg ? (
          <ButtonLink variant="primary" to={ROUTES.matchWorkbench(inv.mg)}>
            {t('打开手工匹配工作台')}
          </ButtonLink>
        ) : null}
        <Button variant={inv.mg ? 'default' : 'primary'} onClick={onRematch} disabled={busy}>
          {t('重新匹配')}
        </Button>
        <Button onClick={onAccept} disabled={busy}>
          {t('在容差内接受')}
        </Button>
        <ButtonLink to={PROTOTYPE_ROUTE['Portal.dc.html']}>{t('向供应商发起差异处理')}</ButtonLink>
        <ButtonLink to={ROUTES.supplierWalletView('match', inv.mg ? supplierName : undefined)}>
          {t('在三单匹配中按匹配组处理')}
        </ButtonLink>
      </div>
    </>
  );
}

function ApPanel({
  inv,
  m,
  ap,
  busy,
  t,
  onGen,
}: {
  inv: WalletInvoice;
  m: MatchState;
  ap: ApState;
  busy: boolean;
  t: T;
  onGen: () => void;
}) {
  const isCfdi = inv.kind.indexOf('CFDI') >= 0;
  const blockedWhy =
    m === 'diff'
      ? '三单匹配存在超出容差的差异，AP 单被阻断'
      : m === 'wait'
        ? '等待收货后自动生成 AP 单'
        : isCfdi && ap === 'blocked'
          ? 'SAT 状态校验未通过，禁止过账'
          : '';
  const matched = m === 'ok' || m === 'tol';
  const steps: [string, string, boolean][] = [
    [t('识别与校验'), t('字段误差 ' + errPct(inv).toFixed(1) + '% · 规则校验通过'), true],
    [
      inv.route === '合同' ? t('两单匹配（合同 + 发票）') : t('三单匹配（PO + 收货 + 发票）'),
      t(MATCH_LABEL[m].label),
      matched,
    ],
    [
      t('生成 AP 单'),
      ap === 'none'
        ? t('未生成')
        : ap === 'blocked'
          ? t('已阻断：' + (blockedWhy || '规则阻断'))
          : t('已生成，含科目、税码与付款条件'),
      ap === 'draft' || ap === 'posted',
    ],
    [t('自动过账'), ap === 'posted' ? t('已过账生成凭证') : t('审批通过后自动过账到 ERP'), ap === 'posted'],
    [t('付款排程'), ap === 'posted' ? t('按付款条件 Net 60 排入下次付款批次') : '—', ap === 'posted'],
  ];
  const blocked = !matched || ap === 'posted' || (isCfdi && ap === 'blocked');
  const cta = ap === 'posted' ? '已过账' : ap === 'draft' ? '提交审批并过账' : '生成 AP 单';
  const note = blockedWhy
    ? t(blockedWhy)
    : ap === 'posted'
      ? t('凭证号 JV-2609-' + inv.no.length * 37)
      : t('生成后进入 AP 审批流');
  return (
    <>
      <div className={styles.steps}>
        {steps.map(([label, sub, done], k) => (
          <div key={k} className={styles.step}>
            <span className={cx(styles.stepIcon, done && styles.stepDone)} aria-hidden="true">
              {done ? '✓' : '·'}
            </span>
            <div className={styles.stepBody}>
              <div className={styles.stepLabel}>{label}</div>
              <div className={styles.stepSub}>{sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <Button variant="primary" onClick={onGen} disabled={blocked || busy}>
          {t(cta)}
        </Button>
        <span className={styles.note}>{note}</span>
      </div>
    </>
  );
}

function ExpPanel({
  inv,
  ex,
  busy,
  t,
  onPush,
}: {
  inv: WalletInvoice;
  ex: ExpState;
  busy: boolean;
  t: T;
  onPush: () => void;
}) {
  const isExp = inv.route === '费控';
  const facts: { k: string; v: string }[] = isExp
    ? [
        { k: '关联单据', v: ex === 'linked' ? 'EXP-2026-0814' : '待匹配' },
        { k: '预算占用', v: '行政费用 · 剩余 62%' },
        { k: '标准校验', v: '符合差旅标准' },
        { k: '承担人', v: '陈 涛 · 市场部' },
      ]
    : [{ k: '路由', v: 'AP 自动化' }];
  return (
    <>
      <div className={styles.expBox}>
        <div className={styles.expTitle}>
          {isExp ? t('无 PO 发票 → 费控自动化') : t('该发票走采购应付，不进入费控')}
        </div>
        <div className={styles.expBody}>
          {isExp
            ? t('按员工承担规则匹配报销单或费用申请；超标准与预算不足会在费控单内提示。')
            : t('有 PO 或合同的发票由 AP 自动化处理。若需转为费用报销，请在路由规则中改判。')}
        </div>
      </div>
      <div className={styles.facts}>
        {facts.map((f) => (
          <div key={f.k} className={styles.fact}>
            <div className="kick">{t(f.k)}</div>
            <div className={styles.factV}>{t(f.v)}</div>
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <Button variant="primary" onClick={onPush} disabled={!isExp || ex === 'linked' || busy}>
          {ex === 'linked' ? t('已关联报销单') : t('推送到费控')}
        </Button>
      </div>
    </>
  );
}

function LogPanel({ inv, t }: { inv: WalletInvoice; t: T }) {
  return (
    <>
      <div className={styles.boxed}>
        <Table className={styles.logTable}>
          <thead>
            <tr>
              <th>{t('时间')}</th>
              <th>{t('字段')}</th>
              <th>{t('修正前')}</th>
              <th>{t('修正后')}</th>
              <th>{t('来源')}</th>
            </tr>
          </thead>
          <tbody>
            {inv.log.map((l, k) => (
              <tr key={k}>
                <td className="mono num">{l.at}</td>
                <td>{t(l.field)}</td>
                <td className={cx('mono', styles.bad)} translate="no">
                  {l.before}
                </td>
                <td className={cx('mono', styles.okInk)} translate="no">
                  {l.after}
                </td>
                <td>{t(l.source)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      {inv.log.length === 0 ? <div className={styles.note}>{t('无修正记录，识别结果未被更改。')}</div> : null}
      <Link to={PROTOTYPE_ROUTE['Correction.dc.html']}>{t('在数据修正页查看完整版本与补偿事件')}</Link>
    </>
  );
}
