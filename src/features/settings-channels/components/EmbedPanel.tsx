import { useMemo } from 'react';
import { ButtonLink, Card, Segmented, Table, useToast } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { EmbedEvent, EmbedParam, EmbedTabKey } from '../types';
import s from '../ChannelsPage.module.css';

const EMBED_TABS: Array<[EmbedTabKey, string]> = [
  ['sdk', 'JS SDK'],
  ['iframe', 'iframe + postMessage'],
  ['im', '移动端 / 企业 IM'],
];

/** H5 / 移动端嵌入调用：代码示例（纯文本）、参数、扫码、回调事件 */
export function EmbedPanel({
  codes,
  params,
  events,
  qr,
  tab,
  onTab,
  ver,
}: {
  codes: Record<EmbedTabKey, string>;
  params: EmbedParam[];
  events: EmbedEvent[];
  qr: boolean[];
  tab: EmbedTabKey;
  onTab: (k: EmbedTabKey) => void;
  ver: number;
}) {
  const t = useT();
  const toast = useToast();
  /* 逐行交给 t()：代码行原样保留，只有注释 / 说明行会被翻译 */
  const code = useMemo(
    () =>
      codes[tab]
        .split('\n')
        .map((line) => t(line))
        .join('\n'),
    [codes, tab, t],
  );

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(code);
      toast(t('已复制到剪贴板'));
    } catch {
      toast(t('复制失败，请手动选择代码复制'), { error: true });
    }
  };

  return (
    <Card padded={false} id="embed" tabIndex={-1} className={s.anchor} aria-label={t('嵌入调用')}>
      <div className={s.secHead}>
        <h2 className={s.secTitle}>{t('H5 / 移动端嵌入调用')}</h2>
        <span className={s.secDesc}>
          {t('供应商门户 H5、ERP 嵌入 H5 两个渠道接入同一个采集页；')}
          <span className="mono">policy</span>
          {t(' 参数引用本页发布的策略版本')}
        </span>
        <div className={s.grow} />
        <ButtonLink to={ROUTES.captureH5}>{t('打开 H5页面采集')}</ButtonLink>
        <ButtonLink to={ROUTES.captureMobile}>{t('预览移动端采集')}</ButtonLink>
      </div>
      <div className={s.embedBody}>
        <div className={s.embedMain}>
          <Segmented<EmbedTabKey>
            ariaLabel={t('嵌入方式')}
            value={tab}
            onChange={onTab}
            options={EMBED_TABS.map(([k, l]) => ({ value: k, label: t(l) }))}
          />
          <div className={s.codeWrap}>
            <pre className={cx('mono', s.code)} translate="no">
              {code}
            </pre>
            <button type="button" className={s.copyBtn} onClick={copy} aria-label={t('复制代码')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M9 9h11v11H9zM5 15H4V4h11v1" />
              </svg>
              {t('复制')}
            </button>
          </div>
          <div className={s.paramsWrap}>
            <Table className={cx(s.paramsTable, s.topCells)} wrapCells>
              <thead>
                <tr>
                  <th>{t('参数')}</th>
                  <th>{t('说明')}</th>
                  <th>{t('示例')}</th>
                </tr>
              </thead>
              <tbody>
                {params.map((p) => (
                  <tr key={p.k}>
                    <td className="mono">{p.k}</td>
                    <td>{t(p.d)}</td>
                    <td className={cx('mono', s.exampleCell)}>{p.e}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
        <div className={s.embedSide}>
          <div className={s.sideBox}>
            <div className="kick">{t('扫码在手机上打开（10 分钟有效）')}</div>
            <div className={s.qrRow}>
              <div className={s.qr} role="img" aria-label={t('二维码示意')}>
                {qr.map((on, i) => (
                  <span key={i} className={cx(s.qrCell, on && s.qrOn)} />
                ))}
              </div>
              <div className={s.qrText}>
                {t('绑定：上海分公司 · 报销场景')}
                <br />
                {t('界面语言跟随手机系统')}
                <br />
                {t('发生地自动判定')}
                <br />
                {t('策略 policy-v')}
                {ver}
              </div>
            </div>
          </div>
          <div className={s.sideBox}>
            <div className={`kick ${s.eventsKick}`}>{t('回调事件')}</div>
            {events.map((e) => (
              <div key={e.k} className={s.eventRow}>
                <span className={cx('mono', s.eventKey)}>{e.k}</span>
                <span className={s.eventDesc}>{t(e.d)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
