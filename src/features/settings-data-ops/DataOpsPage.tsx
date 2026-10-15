import { useState } from 'react';
import { Button, Card, Empty, ErrorState, Field, Input, PageBody, PageHeader, PageLoading, Tabs, useToast } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { cx } from '@/lib/sample';
import {
  addIpRule,
  advanceMigration,
  createDataCenter,
  deleteDataCenter,
  fetchDataOps,
  removeIpRule,
  requestAdminReset,
  rotateKey,
  updateDataCenterBasic,
} from './api';
import { ConfirmDialog, type ConfirmDialogDef } from './components/ConfirmDialog';
import { AdminsTab, BasicTab, CIDR_RE, IpTab, KeysTab } from './components/DcTabs';
import { GlobalTab } from './components/GlobalTab';
import { MigrationTab } from './components/MigrationTab';
import { Topology } from './components/Topology';
import type { BasicInfoPatch, DataCenter, DataOpsView, DcKeyId, NewDataCenterDraft } from './types';
import s from './DataOpsPage.module.css';

type TabKey = 'basic' | 'ip' | 'keys' | 'admin' | 'mig' | 'global';
type Dlg =
  | { type: 'add' }
  | { type: 'del' }
  | { type: 'rotate'; id: DcKeyId; label: string }
  | { type: 'reset'; mail: string };
interface MigState {
  obj: string;
  to: string;
  step: number;
}

const MIG0: MigState = { obj: '', to: '', step: 0 };
const CIDR_ERR = 'CIDR 格式不正确，例如 203.0.113.0/24';

export default function DataOpsPage() {
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const scope = user?.countries ?? [];
  const { data, loading, error, reload, setData } = useAsync(() => fetchDataOps(scope), [scope.join(',')]);

  const [sel, setSel] = useState('EU-FRA');
  const [tab, setTab] = useState<TabKey>('basic');
  const [ipDraft, setIpDraft] = useState('');
  const [ipNote, setIpNote] = useState('');
  const [ipMsg, setIpMsg] = useState('');
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [ack, setAck] = useState('');
  const [draft, setDraft] = useState<NewDataCenterDraft>({ code: 'ME-DXB', name: '迪拜', url: 'https://me2.hub.example.com' });
  const [mig, setMig] = useState<MigState>(MIG0);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <PageLoading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const view = data;
  const dcs = view.dcs;
  const flash = (text: string) => toast(text, { ms: 3000 });
  const fail = (e: unknown) => toast(e instanceof Error ? e.message : String(e), { error: true, ms: 3000 });
  const patchView = (fn: (v: DataOpsView) => DataOpsView) => setData((prev) => fn(prev ?? view));
  const patchDc = (code: string, fn: (d: DataCenter) => DataCenter) =>
    patchView((v) => ({ ...v, dcs: v.dcs.map((x) => (x.code === code ? fn(x) : x)) }));
  async function run<T>(p: () => Promise<T>, onOk: (v: T) => void) {
    setBusy(true);
    try {
      onOk(await p());
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  const closeDlg = () => {
    setDlg(null);
    setAck('');
  };

  const header = (
    <PageHeader
      crumb={`${t('设置')} / ${t('全球数据运维设置')}`}
      title={t('全球数据运维设置')}
      actions={
        <>
          <div className={s.headStats}>
            <div>
              <div className="kick">{t('数据中心')}</div>
              <div className={cx('num', s.headStatValue)}>{t(dcs.length + ' 个')}</div>
            </div>
            <div>
              <div className="kick">{t('国家 / 地区')}</div>
              <div className={cx('num', s.headStatValue)}>{t(dcs.reduce((a, x) => a + x.countries.length, 0) + ' 个')}</div>
            </div>
            <div>
              <div className="kick">{t('企业实体')}</div>
              <div className={cx('num', s.headStatValue)}>{t(dcs.reduce((a, x) => a + x.entities.length, 0) + ' 个')}</div>
            </div>
            <div>
              <div className="kick">{t('全球汇总延迟')}</div>
              <div className={cx('num', s.headStatValue)}>{t('≤ 15 分钟')}</div>
            </div>
          </div>
          {view.global ? (
            <Button
              variant="primary"
              onClick={() => {
                setDraft({ code: 'ME-DXB', name: t('迪拜'), url: 'https://me2.hub.example.com' });
                setDlg({ type: 'add' });
              }}
            >
              {t('新增数据中心')}
            </Button>
          ) : null}
        </>
      }
    />
  );

  const d = dcs.find((x) => x.code === sel) ?? dcs[0];
  if (!d) {
    return (
      <>
        {header}
        <PageBody>
          <Card>
            <Empty />
          </Card>
        </PageBody>
      </>
    );
  }

  /* ---------- 选择与页签 ---------- */
  const showGlobal = !!d.master && view.global;
  const tabItems: { value: TabKey; label: string }[] = [
    { value: 'basic', label: t('基本信息') },
    { value: 'ip', label: t('IP 白名单') },
    { value: 'keys', label: t('密钥') },
    { value: 'admin', label: t('管理员账号') },
    { value: 'mig', label: t('数据迁移') },
    ...(showGlobal ? [{ value: 'global' as const, label: t('全球汇总与看板') }] : []),
  ];
  const curTab: TabKey = tab === 'global' && !showGlobal ? 'basic' : tab;
  const pickRegional = (code: string) => {
    setSel(code);
    setTab('basic');
    setMig(MIG0);
  };
  const pickMaster = (code: string) => {
    setSel(code);
    setTab(view.global ? 'global' : 'basic');
  };

  /* ---------- 基本信息 ---------- */
  const setField = (k: keyof BasicInfoPatch, v: string) => patchDc(d.code, (x) => ({ ...x, [k]: v }));
  const saveBasic = () =>
    run(
      () => updateDataCenterBasic(d.code, { name: d.name, region: d.region, url: d.url, api: d.api }),
      () => flash(t('已保存 ' + d.code + ' 的基本信息')),
    );

  /* ---------- IP 白名单 ---------- */
  const ipOk = CIDR_RE.test(ipDraft);
  const ipMsgText = ipMsg || (ipDraft && !ipOk ? CIDR_ERR : '');
  const ipMsgOk = ipOk || !ipDraft;
  const addIp = () => {
    if (!ipOk) {
      setIpMsg(CIDR_ERR);
      return;
    }
    const code = d.code;
    run(
      () => addIpRule(code, { cidr: ipDraft, note: ipNote || '—', scope: '管理后台 + API' }),
      (r) => {
        patchDc(code, (x) => ({ ...x, ips: [...x.ips, r] }));
        setIpDraft('');
        setIpNote('');
        setIpMsg('已添加，5 分钟内在边缘网关生效');
      },
    );
  };
  const removeIp = (cidr: string) => {
    const code = d.code;
    run(
      () => removeIpRule(code, cidr),
      () => {
        patchDc(code, (x) => ({ ...x, ips: x.ips.filter((i) => i.cidr !== cidr) }));
        flash(t('已移除 ' + cidr));
      },
    );
  };

  /* ---------- 数据迁移 ---------- */
  const objs = d.countries.map((c) => '国家：' + c.name).concat(d.entities.map((e) => '实体：' + e.code));
  const targets = view.allCodes.filter((x) => x !== d.code);
  const mobj = mig.obj || objs[0] || '—';
  const mto = mig.to || targets[0] || '';
  const advance = () => {
    const req = { from: d.code, obj: mobj, to: mto, step: mig.step };
    run(
      () => advanceMigration(req),
      (p) => setMig({ obj: mobj, to: mto, step: p.step }),
    );
  };

  /* ---------- 弹窗 ---------- */
  const dlgDef: ConfirmDialogDef | null = (() => {
    if (!dlg) return null;
    if (dlg.type === 'add') {
      const setD = (k: keyof NewDataCenterDraft) => (e: { target: { value: string } }) => setDraft({ ...draft, [k]: e.target.value });
      return {
        title: t('新增数据中心'),
        body: t('新数据中心创建后为空，需要通过「数据迁移」迁入国家或实体，并配置密钥与管理员。'),
        okLabel: t('创建'),
        tone: 'primary',
        blocked: !draft.code,
        fields: (
          <>
            <Field label={t('编码')}>{(id) => <Input id={id} className="mono" value={draft.code} onChange={setD('code')} />}</Field>
            <Field label={t('名称')}>{(id) => <Input id={id} value={draft.name} onChange={setD('name')} />}</Field>
            <Field label={t('访问地址')}>{(id) => <Input id={id} className="mono" value={draft.url} onChange={setD('url')} />}</Field>
          </>
        ),
        onOk: () =>
          run(
            () => createDataCenter(draft),
            (n) => {
              patchView((v) => ({ ...v, dcs: [...v.dcs, n], allCodes: [...v.allCodes, n.code] }));
              setSel(n.code);
              setTab('basic');
              setMig(MIG0);
              closeDlg();
              flash(t('已创建 ' + n.code));
            },
          ),
      };
    }
    if (dlg.type === 'del') {
      const busyDc = !!d.master || d.countries.length > 0 || d.entities.length > 0;
      const code = d.code;
      return {
        title: t('删除数据中心 ' + code),
        body: busyDc
          ? d.master
            ? t('主数据中心不可删除。')
            : t('该中心仍服务 ' + d.countries.length + ' 个国家、' + d.entities.length + ' 个实体，请先迁出全部数据。')
          : t('删除后访问地址与密钥立即失效，审计日志保留 7 年。'),
        ackWord: busyDc ? undefined : code,
        okLabel: t('删除'),
        tone: 'danger',
        blocked: busyDc || ack !== code,
        onOk: () =>
          run(
            () => deleteDataCenter(code, ack),
            () => {
              patchView((v) => ({ ...v, dcs: v.dcs.filter((x) => x.code !== code), allCodes: v.allCodes.filter((x) => x !== code) }));
              setSel('CN-QD');
              setMig(MIG0);
              closeDlg();
              flash(t('已删除 ' + code));
            },
          ),
      };
    }
    if (dlg.type === 'rotate') {
      const code = d.code;
      const keyId = dlg.id;
      return {
        title: t('重发「' + dlg.label + '」'),
        body: t('将生成新版本并下发到 ' + code + ' 的所有调用方。旧版本 72 小时后失效。此操作需第二名管理员确认。'),
        ackWord: 'ROTATE',
        okLabel: t('重发密钥'),
        tone: 'primary',
        blocked: ack !== 'ROTATE',
        onOk: () =>
          run(
            () => rotateKey(code, keyId, ack),
            (k) => {
              patchDc(code, (x) => ({ ...x, keys: x.keys.map((y) => (y.id === k.id ? k : y)) }));
              closeDlg();
              flash(t('已重发，旧版本进入 72 小时宽限期'));
            },
          ),
      };
    }
    const code = d.code;
    const mail = dlg.mail;
    return {
      title: t('重置管理员账号'),
      body: t('重置 ' + mail + '：吊销全部会话与令牌，发送一次性激活链接。需两名平台管理员审批，当前审批人：王 琳。'),
      ackWord: 'RESET',
      okLabel: t('提交审批'),
      tone: 'danger',
      blocked: ack !== 'RESET',
      onOk: () =>
        run(
          () => requestAdminReset(code, mail, ack),
          () => {
            closeDlg();
            flash(t('已提交重置审批，待第二名平台管理员确认'));
          },
        ),
    };
  })();

  return (
    <>
      {header}
      <PageBody className={s.body}>
        <Topology dcs={dcs} selected={d.code} onPickMaster={pickMaster} onPickRegional={pickRegional} />

        <Card padded={false} aria-label={t('数据中心详情')}>
          <div className={s.detailHead}>
            <div className={s.detailTitle}>
              <div className="kick">{d.master ? t('主数据中心 · 全球汇总') : t('区域数据中心 · ' + d.region)}</div>
              <div className={s.detailName}>
                <span className={cx('mono', s.detailCode)}>{d.code}</span>
                <span className={s.detailLabel}>{t(d.name)}</span>
              </div>
            </div>
            <div className={s.spacer} />
            <Button onClick={() => setTab('basic')}>{t('编辑')}</Button>
            {view.global ? (
              <Button
                variant="danger"
                onClick={() => {
                  setAck('');
                  setDlg({ type: 'del' });
                }}
              >
                {t('删除')}
              </Button>
            ) : null}
          </div>
          <div className={s.tabsWrap}>
            <Tabs items={tabItems} value={curTab} onChange={setTab} ariaLabel={t('数据中心详情')} />
          </div>
          <div className={s.tabBody} role="tabpanel">
            {curTab === 'basic' ? (
              <BasicTab dc={d} busy={busy} onChange={setField} onSave={saveBasic} onGoMigration={() => setTab('mig')} />
            ) : null}
            {curTab === 'ip' ? (
              <IpTab
                ips={d.ips}
                draft={ipDraft}
                note={ipNote}
                msg={ipMsgText}
                msgOk={ipMsgOk}
                busy={busy}
                onDraft={(v) => {
                  setIpDraft(v);
                  setIpMsg('');
                }}
                onNote={setIpNote}
                onAdd={addIp}
                onRemove={(r) => removeIp(r.cidr)}
              />
            ) : null}
            {curTab === 'keys' ? (
              <KeysTab
                keys={d.keys}
                onRotate={(k) => {
                  setAck('');
                  setDlg({ type: 'rotate', id: k.id, label: k.label });
                }}
              />
            ) : null}
            {curTab === 'admin' ? (
              <AdminsTab
                admins={d.admins}
                onReset={(a) => {
                  setAck('');
                  setDlg({ type: 'reset', mail: a.mail });
                }}
              />
            ) : null}
            {curTab === 'mig' ? (
              <MigrationTab
                source={d.code}
                objs={objs}
                targets={targets}
                obj={mobj}
                to={mto}
                step={mig.step}
                steps={view.migSteps}
                busy={busy}
                onObj={(v) => setMig({ ...mig, obj: v, step: 0 })}
                onTo={(v) => setMig({ ...mig, to: v, step: 0 })}
                onAdvance={advance}
                onReset={() => setMig(MIG0)}
              />
            ) : null}
            {curTab === 'global' ? <GlobalTab syncIn={view.syncIn} syncOut={view.syncOut} rbac={view.rbac} /> : null}
          </div>
        </Card>
      </PageBody>

      <ConfirmDialog def={dlgDef} ack={ack} onAck={setAck} busy={busy} onClose={closeDlg} />
    </>
  );
}
