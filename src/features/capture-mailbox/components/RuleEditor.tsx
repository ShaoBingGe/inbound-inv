import { Button, Card, Chip, Field, Input, Select, Switch, Table } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { COUNTRY_OPTIONS, LANG_OPTIONS, SENDER_AUTH_OPTIONS, supplierCheck } from '../data';
import type { DocKind, DocType, RuleTestRow, SenderAuth, SourceRule } from '../types';
import s from '../CaptureMailboxPage.module.css';

type TextKey = 'from' | 'lang' | 'country' | 'sellerKw' | 'poRe' | 'subject' | 'fileRe' | 'supCode' | 'supName';

/** 编辑规则：来源邮箱 → 识别特征 → 对应供应商，可用最近邮件测试 */
export function RuleEditor({
  rule,
  docTypes,
  knownSuppliers,
  saved,
  saving,
  testing,
  testRows,
  onText,
  onAuthReq,
  onDoc,
  onTest,
  onSave,
}: {
  rule: SourceRule;
  docTypes: DocType[];
  knownSuppliers: Record<string, string>;
  saved: boolean;
  saving: boolean;
  testing: boolean;
  testRows: RuleTestRow[] | null;
  onText: (k: TextKey, v: string) => void;
  onAuthReq: (v: SenderAuth) => void;
  onDoc: (k: DocKind, on: boolean) => void;
  onTest: () => void;
  onSave: () => void;
}) {
  const t = useT();
  const e = rule;
  const supCheck = supplierCheck(e.supCode, e.supName, knownSuppliers);

  const text = (label: string, k: TextKey, mono?: boolean) => (
    <Field label={t(label)}>
      {(id) => (
        <Input
          id={id}
          className={mono ? 'mono' : undefined}
          value={e[k]}
          translate="no"
          onChange={(ev) => onText(k, ev.target.value)}
        />
      )}
    </Field>
  );

  return (
    <Card padded={false} className={s.editor} aria-label={t('规则编辑')}>
      <div className={s.rowHead}>
        <h2 className={s.h3}>{t('编辑规则')}</h2>
        <Chip tone={saved ? 'green' : 'orange'}>{saved ? t('已生效 · 命中 ' + e.hits + ' 次') : t('未保存')}</Chip>
        <div className={s.grow} />
        <Button disabled={testing} onClick={onTest}>
          {t('用最近邮件测试')}
        </Button>
        <Button variant="primary" disabled={saving} onClick={onSave}>
          {t('保存')}
        </Button>
      </div>

      <div className={cx('kick', s.stepKick, s.stepKickFirst)}>{t('1 · 来源邮箱')}</div>
      <div className={s.grid220}>
        {text('来源地址或域名（支持 *）', 'from', true)}
        <Field label={t('发件人认证')}>
          {(id) => (
            <Select
              id={id}
              className={s.full}
              value={e.authReq}
              onChange={(v) => onAuthReq(v as SenderAuth)}
              options={SENDER_AUTH_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
            />
          )}
        </Field>
      </div>

      <div className={cx('kick', s.stepKick)}>{t('2 · 识别特征')}</div>
      <div className={s.grid200}>
        <Field label={t('票面语言')}>
          {(id) => (
            <Select
              id={id}
              className={s.full}
              value={e.lang}
              onChange={(v) => onText('lang', v)}
              options={LANG_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
            />
          )}
        </Field>
        <Field label={t('发生地国家')}>
          {(id) => (
            <Select
              id={id}
              className={s.full}
              value={e.country}
              onChange={(v) => onText('country', v)}
              options={COUNTRY_OPTIONS.map((c) => ({ value: c, label: t(c) }))}
            />
          )}
        </Field>
        {text('票面开票方名称包含', 'sellerKw')}
        {text('PO 单号规则（正则）', 'poRe', true)}
        {text('主题关键词', 'subject')}
        {text('附件文件名模式', 'fileRe', true)}
      </div>

      <div className={s.mt12}>
        <div className={cx('kick', s.mb6)}>{t('附件分类（按特征分别识别）')}</div>
        <div className={s.boxed}>
          <Table wrapCells className={s.docTable}>
            <thead>
              <tr>
                <th>{t('类型')}</th>
                <th>{t('判定特征')}</th>
                <th>{t('处理')}</th>
                <th className={s.w70}>{t('启用')}</th>
              </tr>
            </thead>
            <tbody>
              {docTypes.map((d) => {
                const on = !!e.docs[d.key];
                return (
                  <tr key={d.key}>
                    <td className={s.medium}>{t(d.label)}</td>
                    <td className={s.ink2}>{t(d.feat)}</td>
                    <td>{t(d.act)}</td>
                    <td>
                      <Switch
                        checked={on}
                        onChange={(v) => onDoc(d.key, v)}
                        label={<span className="sr-only">{t('启用 ' + d.label)}</span>}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </div>

      <div className={cx('kick', s.stepKick)}>{t('3 · 对应供应商')}</div>
      <div className={s.grid220}>
        {text('供应商编码', 'supCode', true)}
        {text('供应商名称', 'supName')}
      </div>
      <div className={s.supCheck}>{t(supCheck)}</div>

      {testRows ? (
        <>
          <div className={cx('kick', s.stepKick)}>{t('测试结果 · 最近 5 封来信')}</div>
          <div className={s.boxed}>
            <Table wrapCells className={s.testTable}>
              <thead>
                <tr>
                  <th>{t('发件人')}</th>
                  <th>{t('主题')}</th>
                  <th>{t('附件')}</th>
                  <th>{t('判定')}</th>
                  <th>{t('说明')}</th>
                </tr>
              </thead>
              <tbody>
                {testRows.map((r, i) => (
                  <tr key={i}>
                    <td className="mono" translate="no">
                      {r.from}
                    </td>
                    <td>
                      <span translate="no">{r.subj}</span>
                      {r.subjSuffix ? ' ' + t(r.subjSuffix) : null}
                    </td>
                    <td className={cx('mono', s.ink2)} translate="no">
                      {r.file}
                    </td>
                    <td>
                      <Chip tone={r.tone}>{t(r.res)}</Chip>
                    </td>
                    <td className={s.ink2}>{t(r.why)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      ) : null}
    </Card>
  );
}
