import { Button, Chip, Field, Input, Table, type Tone } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import type { BasicInfoPatch, DataCenter, DcAdmin, DcIpRule, DcKey } from '../types';
import s from '../DataOpsPage.module.css';

/* ---------- 基本信息 ---------- */
export function BasicTab({
  dc,
  busy,
  onChange,
  onSave,
  onGoMigration,
}: {
  dc: DataCenter;
  busy: boolean;
  onChange: (k: keyof BasicInfoPatch, v: string) => void;
  onSave: () => void;
  onGoMigration: () => void;
}) {
  const t = useT();
  const chips = dc.countries.length ? dc.countries.map((c) => c.name) : ['尚未分配'];
  return (
    <>
      <div className={s.formGrid}>
        <Field label={t('名称')}>{(id) => <Input id={id} value={dc.name} onChange={(e) => onChange('name', e.target.value)} />}</Field>
        <Field label={t('云区域')}>
          {(id) => <Input id={id} className="mono" value={dc.region} onChange={(e) => onChange('region', e.target.value)} />}
        </Field>
        <Field label={t('访问地址')}>
          {(id) => <Input id={id} className="mono" value={dc.url} onChange={(e) => onChange('url', e.target.value)} />}
        </Field>
        <Field label={t('API 地址')}>
          {(id) => <Input id={id} className="mono" value={dc.api} onChange={(e) => onChange('api', e.target.value)} />}
        </Field>
      </div>
      <div className={cx('kick', s.subKick)}>{t('服务的国家 / 地区')}</div>
      <div className={s.chips}>
        {chips.map((c) => (
          <Chip key={c} tone="blue">
            {t(c)}
          </Chip>
        ))}
        <Button size="sm" className={s.tinyBtn} onClick={onGoMigration}>
          {t('迁入 / 迁出国家…')}
        </Button>
      </div>
      <div className={cx('kick', s.subKick)}>{t('企业实体')}</div>
      <div className={s.tableBox}>
        <Table className={s.minW640}>
          <thead>
            <tr>
              <th>{t('实体编码')}</th>
              <th>{t('法人名称')}</th>
              <th>{t('国家')}</th>
              <th>{t('本位币')}</th>
              <th>{t('税号')}</th>
            </tr>
          </thead>
          <tbody>
            {dc.entities.map((e) => (
              <tr key={e.code}>
                <td className="mono">{e.code}</td>
                <td>{t(e.name)}</td>
                <td>{t(e.c)}</td>
                <td className="mono">{e.cur}</td>
                <td className="mono" translate="no">
                  {e.tax}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className={s.actionsRow}>
        <Button variant="primary" onClick={onSave} disabled={busy}>
          {t('保存')}
        </Button>
        <span className={s.muted}>{t('修改访问地址后，SDK 路由表在 5 分钟内刷新')}</span>
      </div>
    </>
  );
}

/* ---------- IP 白名单 ---------- */
export const CIDR_RE = /^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/;

export function IpTab({
  ips,
  draft,
  note,
  msg,
  msgOk,
  busy,
  onDraft,
  onNote,
  onAdd,
  onRemove,
}: {
  ips: DcIpRule[];
  draft: string;
  note: string;
  msg: string;
  msgOk: boolean;
  busy: boolean;
  onDraft: (v: string) => void;
  onNote: (v: string) => void;
  onAdd: () => void;
  onRemove: (r: DcIpRule) => void;
}) {
  const t = useT();
  return (
    <>
      <div className={s.ipForm}>
        <Field label={t('新增 CIDR')} className={s.grow240}>
          {(id) => (
            <Input
              id={id}
              className="mono"
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              placeholder={t('例如 203.0.113.0/24')}
              invalid={!msgOk}
            />
          )}
        </Field>
        <Field label={t('备注')} className={s.grow200}>
          {(id) => <Input id={id} value={note} onChange={(e) => onNote(e.target.value)} placeholder={t('例如 办公网出口')} />}
        </Field>
        <Button variant="primary" onClick={onAdd} disabled={busy}>
          {t('添加')}
        </Button>
      </div>
      <div className={cx(s.ipMsg, msgOk ? s.msgOk : s.msgErr)} aria-live="polite">
        {msg ? t(msg) : null}
      </div>
      <div className={cx(s.tableBox, s.mt10)}>
        <Table className={s.minW560}>
          <thead>
            <tr>
              <th>CIDR</th>
              <th>{t('备注')}</th>
              <th>{t('适用')}</th>
              <th>{t('添加人')}</th>
              <th>
                <span className="sr-only">{t('移除')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ips.map((i) => (
              <tr key={i.cidr}>
                <td className="mono">{i.cidr}</td>
                <td>{t(i.note)}</td>
                <td>{t(i.scope)}</td>
                <td>{t(i.by)}</td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => onRemove(i)} disabled={busy}>
                    {t('移除')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className={s.note}>{t('白名单作用于管理后台与 API；H5 采集页面向员工与供应商开放，仅校验短期令牌。')}</div>
    </>
  );
}

/* ---------- 密钥 ---------- */
const keyTone = (st: string): Tone => (st === '有效' ? 'green' : st.indexOf('宽限') >= 0 ? 'blue' : 'orange');

export function KeysTab({ keys, onRotate }: { keys: DcKey[]; onRotate: (k: DcKey) => void }) {
  const t = useT();
  return (
    <>
      <div className={s.tableBox}>
        <Table className={s.minW760}>
          <thead>
            <tr>
              <th>{t('密钥')}</th>
              <th>{t('用途')}</th>
              <th>{t('当前版本')}</th>
              <th>{t('上次轮换')}</th>
              <th>{t('状态')}</th>
              <th>
                <span className="sr-only">{t('重发密钥')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td className={s.medium}>{t(k.label)}</td>
                <td className={s.ink2}>{t(k.use)}</td>
                <td className="mono">{k.ver}</td>
                <td className="num">{k.at}</td>
                <td>
                  <Chip tone={keyTone(k.st)}>{t(k.st)}</Chip>
                </td>
                <td>
                  <Button onClick={() => onRotate(k)}>{t('重发密钥')}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className={s.note}>
        {t('重发后旧版本进入 72 小时宽限期，期间新旧密钥均可验签；数据加密密钥只轮换包装密钥，不重新加密存量数据。')}
      </div>
    </>
  );
}

/* ---------- 管理员账号 ---------- */
export function AdminsTab({ admins, onReset }: { admins: DcAdmin[]; onReset: (a: DcAdmin) => void }) {
  const t = useT();
  return (
    <>
      <div className={s.tableBox}>
        <Table className={s.minW760}>
          <thead>
            <tr>
              <th>{t('管理员')}</th>
              <th>{t('角色')}</th>
              <th>{t('可见范围')}</th>
              <th>MFA</th>
              <th>{t('最近登录')}</th>
              <th>
                <span className="sr-only">{t('重置账号')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.mail}>
                <td>
                  <div className={s.medium}>{t(a.name)}</div>
                  <div className={cx('mono', s.mail)}>{a.mail}</div>
                </td>
                <td>{t(a.role)}</td>
                <td>{t(a.scope)}</td>
                <td>
                  <Chip tone={a.mfa === '已启用' ? 'green' : 'red'}>{t(a.mfa)}</Chip>
                </td>
                <td className="num">{a.last}</td>
                <td>
                  <Button onClick={() => onReset(a)}>{t('重置账号')}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className={s.note}>
        {t('重置管理员账号需两名平台管理员审批；重置后吊销该账号的全部会话与 API 令牌，并通过注册邮箱 + 短信下发一次性激活链接。')}
      </div>
    </>
  );
}
