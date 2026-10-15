import { Link } from 'react-router-dom';
import { Button, ButtonLink, Card, Chip, ErrorState, Icon, Modal, PageLoading, Section, Table, type Tone } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { cx } from '@/lib/sample';
import { fetchInvoiceDetail } from '../api';
import { fmtMoney, rnd2 } from '../format';
import type { InvoiceDetail } from '../types';
import { DataPanel } from './DataPanel';
import { ImageViewer } from './ImageViewer';
import { StatusChip } from './StatusChip';
import pal from '../palette.module.css';
import d from './detail.module.css';

const ARROW_DOWN = 'M12 5v14M6 13l6 6 6-6';

/** 发票全生命周期弹窗（企业票池明细） */
export function InvoiceDetailModal({
  id,
  ids,
  onNavigate,
  onClose,
}: {
  id: string;
  /** 当前筛选结果的顺序，用于上一张 / 下一张 */
  ids: string[];
  onNavigate: (id: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const { data, error, reload } = useAsync(() => fetchInvoiceDetail(id), [id]);

  const idx = data ? ids.indexOf(data.row.id) : -1;
  const noPrev = idx <= 0;
  const noNext = idx < 0 || idx >= ids.length - 1;

  const title = data ? (
    <div className={pal.palette}>
      <div className="kick">
        {t('发票全生命周期')} · {t(data.country.name)} · {t(data.country.regime)}
      </div>
      <div className={d.titleLine}>
        <span className={cx('mono', d.titleNo)} translate="no">
          {data.row.no}
        </span>
        <span className={d.strong} translate="no">
          {data.row.sup}
        </span>
      </div>
    </div>
  ) : (
    t('发票全生命周期')
  );

  const headerExtra = data ? (
    <div className={cx(pal.palette, d.headExtra)}>
      <div className={d.headChips}>
        <StatusChip row={data.row} />
        <Chip tone="blue">{t('渠道：' + data.row.channel)}</Chip>
        <Chip tone="gray">{data.row.entity + ' ' + t(data.entity.name)}</Chip>
        <Chip tone="gray">
          {t('数据中心')} {data.country.dc}
        </Chip>
        <Chip tone="purple">
          {t('规则')} {data.country.ruleVer}
        </Chip>
      </div>
      <ButtonLink to={ROUTES.invoiceLifecycle(encodeURIComponent(data.row.no))} icon={<Icon name="history" size={15} />}>
        {t('全生命周期')}
      </ButtonLink>
      <Button onClick={() => !noPrev && onNavigate(ids[idx - 1])} disabled={noPrev}>
        {t('上一张')}
      </Button>
      <Button onClick={() => !noNext && onNavigate(ids[idx + 1])} disabled={noNext}>
        {t('下一张')}
      </Button>
    </div>
  ) : null;

  return (
    <Modal open onClose={onClose} size="full" title={title} headerExtra={headerExtra} bodyStyle={{ background: 'var(--bg)', padding: 0 }}>
      <div className={cx(pal.palette, d.body)}>
        {error ? <ErrorState error={error} onRetry={reload} /> : !data ? <PageLoading /> : <DetailBody data={data} />}
      </div>
    </Modal>
  );
}

function DetailBody({ data }: { data: InvoiceDetail }) {
  const t = useT();
  const { row: cur, country: c2 } = data;
  const revAmt = cur.revs.reduce((a, x) => a + x.amt, 0);
  const revTax = cur.revs.reduce((a, x) => a + x.tax, 0);
  const treated: [string, Tone] =
    cur.status === 'review' ? ['待入账', 'orange'] : [cur.c === 'US' ? '计入成本' : c2.treatPaid, cur.c === 'US' ? 'gray' : 'green'];
  const facts: { k: string; v: string; tone: 'ink' | 'red' | 'orange' | 'green'; tr?: boolean }[] = [
    { k: '价税合计', v: fmtMoney(c2, cur.total), tone: 'ink' },
    { k: c2.taxName, v: fmtMoney(c2, cur.tax), tone: 'ink' },
    { k: '折算 CNY', v: 'CNY ' + (cur.total * c2.cny).toLocaleString('en-US', { maximumFractionDigits: 2 }), tone: 'ink' },
    { k: '关联单据', v: cur.doc, tone: 'ink' },
    { k: '付款到期', v: cur.due, tone: cur.flagKey === 'due' ? 'red' : 'ink' },
    { k: '识别更正', v: cur.err ? cur.err + ' 处' : '无', tone: cur.err ? 'orange' : 'green', tr: true },
  ];
  const rate = Math.round(cur.rate * 100) + '%';
  const taxes: { name: string; amt: string; treat: string; st: string; tone: Tone }[] = [
    { name: c2.taxName, amt: fmtMoney(c2, cur.tax), treat: c2.treat, st: treated[0], tone: treated[1] },
    ...(cur.revs.length
      ? [{ name: c2.taxName + ' · 逆向', amt: fmtMoney(c2, revTax), treat: '进项更正 / 转出', st: '2026-10 期', tone: 'blue' as Tone }]
      : []),
  ];

  return (
    <>
      <div className={d.facts}>
        {facts.map((x) => (
          <Card key={x.k} className={d.fact}>
            <div className="kick">{t(x.k)}</div>
            <div className={cx('num', d.factV, d['tone_' + x.tone])}>{x.tr ? t(x.v) : x.v}</div>
          </Card>
        ))}
      </div>

      <Section title={t('生命周期时间线')} desc={t('每个节点记录时间、执行者与适用规则版本；灰色为尚未发生')}>
        <div className={d.timelineScroll}>
          <ol className={d.timeline}>
            {data.steps.map((s) => (
              <li key={s.label} className={cx(d.step, d['step_' + s.state])}>
                <span className={d.stepLine} aria-hidden="true" />
                <span className={d.stepDot} aria-hidden="true" />
                <div className={d.stepLabel}>{t(s.label)}</div>
                <div className={cx('num', d.stepAt)}>{s.at}</div>
                <div className={d.stepWho}>{t(s.who)}</div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <div className={d.twoCol}>
        <Section title={t('正向与逆向关联')} desc={t(c2.revMech)} className={d.col}>
          <div className={d.origBox}>
            <div className={d.boxHead}>
              <span className={d.strong}>
                {t('原票')} · {t(cur.kind)}
              </span>
              <span className="mono" translate="no">
                {cur.no}
              </span>
            </div>
            <div className={cx('num', d.muted2)}>
              {fmtMoney(c2, cur.total) + ' · ' + t(c2.taxName) + ' ' + fmtMoney(c2, cur.tax) + ' · ' + cur.date}
            </div>
          </div>
          {cur.revs.map((x) => (
            <div key={x.no} className={d.revRow}>
              <div className={d.revRail} aria-hidden="true">
                <span className={d.revRailLine} />
                <Icon d={ARROW_DOWN} size={14} strokeWidth={2} className={d.revArrow} />
              </div>
              <div className={d.revBox}>
                <div className={d.boxHead}>
                  <span className={d.revKind}>{t(x.kind)}</span>
                  <span className="mono" translate="no">
                    {x.no}
                  </span>
                </div>
                <div className={cx('num', d.muted2)}>
                  {fmtMoney(c2, x.amt) + ' · ' + t('税额') + ' ' + fmtMoney(c2, x.tax) + ' · ' + x.date}
                </div>
                <div className={d.revEffect}>{t(x.effect)}</div>
              </div>
            </div>
          ))}
          {!cur.revs.length ? (
            <div className={d.noRev}>
              {t('尚无逆向单据。若需冲减：')}
              {t(c2.revHow)}
            </div>
          ) : null}
          <div className={cx('num', d.revSum)}>
            <span>
              {t('原票')} <b>{fmtMoney(c2, cur.total)}</b>
            </span>
            <span>
              {t('逆向冲减')} <b className={d.redInk}>{fmtMoney(c2, revAmt)}</b>
            </span>
            <span>
              {t('净额')} <b>{fmtMoney(c2, rnd2(cur.total + revAmt, c2.dp))}</b>
            </span>
          </div>
        </Section>

        <Section
          title={
            <>
              {t('税务处理')} · {t(c2.name)}
            </>
          }
          desc={<Link to={ROUTES.settingsTaxRules}>{t('税务规则设置')}</Link>}
          className={d.col}
        >
          <div className={d.taxTableWrap}>
            <Table className={d.taxTable} wrapCells>
              <thead>
                <tr>
                  <th>{t('税种')}</th>
                  <th className={d.end}>{t('税率')}</th>
                  <th className={d.end}>{t('税额')}</th>
                  <th>{t('处理')}</th>
                  <th>{t('状态')}</th>
                </tr>
              </thead>
              <tbody>
                {taxes.map((x) => (
                  <tr key={x.name}>
                    <td>{t(x.name)}</td>
                    <td className={cx('num', d.end)}>{rate}</td>
                    <td className={cx('num', d.end)}>{x.amt}</td>
                    <td className={d.treat}>{t(x.treat)}</td>
                    <td>
                      <Chip tone={x.tone}>{t(x.st)}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className={d.rules}>
            {c2.rules.map(([k, v]) => (
              <div key={k} className={d.rule}>
                <span className={d.ruleK}>{t(k)}</span>
                <span>{t(v)}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section
        title={t('发票关键数据与影像')}
        desc={t('左侧原件影像（只读存证），右侧识别数据；可放大、翻页、在新窗口打开，数据可启用智能翻译')}
      >
        <div className={d.keyData}>
          <ImageViewer key={cur.id} invoiceNo={cur.no} pages={data.pages} hash={data.hash} fileName={data.fileName} />
          <DataPanel invoiceId={cur.id} srcLang={c2.lang} />
        </div>
      </Section>
    </>
  );
}
