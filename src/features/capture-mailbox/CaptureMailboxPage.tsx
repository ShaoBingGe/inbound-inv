import { useCallback, useState } from 'react';
import { Button, Chip, ErrorState, PageBody, PageHeader, PageLoading, useToast } from '@/components/ui';
import { useI18n } from '@/i18n';
import { isMock } from '@/lib/http';
import { useAsync } from '@/lib/useAsync';
import {
  authorizeMailbox,
  fetchMailboxSettings,
  inviteMailbox,
  reauthorizeMailbox,
  revokeMailbox,
  saveSourceRules,
  setMailboxFeature,
  testSourceRule,
} from './api';
import { blankRule } from './data';
import type {
  AuthState,
  BindRequest,
  BindResult,
  DocKind,
  EfficiencyFeature,
  Mailbox,
  MailboxSettings,
  ProviderId,
  RuleTestRow,
  RulesByBox,
  SenderAuth,
  SourceRule,
} from './types';
import { BindWizard } from './components/BindWizard';
import { MailboxTable } from './components/MailboxTable';
import { RuleList } from './components/RuleList';
import { RuleEditor } from './components/RuleEditor';
import { FeatureGrid } from './components/FeatureGrid';
import s from './CaptureMailboxPage.module.css';

export default function CaptureMailboxPage() {
  const { data, loading, error, reload } = useAsync(fetchMailboxSettings, []);
  if (loading && !data) return <PageLoading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <PageLoading />;
  return <MailboxSettingsView initial={data} />;
}

type WizStep = 0 | 1 | 2 | 3;

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function MailboxSettingsView({ initial }: { initial: MailboxSettings }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { boxes, docTypes, providers, knownSuppliers, stats } = initial;

  const [box, setBox] = useState('b2');
  const [ri, setRi] = useState(0);
  const [rules, setRules] = useState<RulesByBox>(initial.rules);
  const [auth, setAuth] = useState<Record<string, AuthState>>({});
  const [feats, setFeats] = useState<EfficiencyFeature[]>(initial.feats);
  const [testRows, setTestRows] = useState<RuleTestRow[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wiz, setWiz] = useState<WizStep>(0);
  const [prov, setProv] = useState<ProviderId>('ms');
  const [binding, setBinding] = useState(false);
  const [bound, setBound] = useState<BindResult | null>(null);
  const [busyBox, setBusyBox] = useState<string | null>(null);

  const fail = useCallback((e: unknown) => toast(t(errText(e)), { error: true }), [toast, t]);

  const authOf = (b: Mailbox): AuthState => auth[b.id] ?? b.auth;
  const current = boxes.find((b) => b.id === box) ?? boxes[0];
  const list = rules[box] ?? [];
  const editing: SourceRule = list[ri] ?? blankRule();
  const nf = new Intl.NumberFormat(locale);
  const authed = boxes.filter((b) => authOf(b) === 'ok').length;

  /** 修改当前规则的一个字段（与设计稿一致：无规则时不生效；修改后标记未保存并清空测试结果） */
  const patch = <K extends keyof SourceRule>(k: K, v: SourceRule[K]) => {
    setRules((prev) => {
      const xs = prev[box] ?? [];
      if (!xs[ri]) return prev;
      const next = xs.map((r, i) => (i === ri ? { ...r, [k]: v } : r));
      return { ...prev, [box]: next };
    });
    if (list[ri]) {
      setSaved(false);
      setTestRows(null);
    }
  };

  const pickBox = (id: string) => {
    setBox(id);
    setRi(0);
    setTestRows(null);
  };

  const onBoxAction = async (b: Mailbox, a: AuthState) => {
    setBusyBox(b.id);
    try {
      if (a === 'ok') {
        const r = await revokeMailbox(b.id);
        setAuth((x) => ({ ...x, [b.id]: r.auth }));
        toast(t('已撤销 ' + b.mail + ' 的令牌'));
      } else if (a === 'none') {
        await inviteMailbox(b.id);
        toast(t('已向 ' + b.name + ' 发送绑定邀请'));
      } else {
        const r = await reauthorizeMailbox(b.id);
        setAuth((x) => ({ ...x, [b.id]: r.auth }));
        toast(t(b.mail + ' 已重新授权'));
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusyBox(null);
    }
  };

  const addRule = () => {
    const next = [...list, blankRule()];
    setRules((prev) => ({ ...prev, [box]: next }));
    setRi(next.length - 1);
    setSaved(false);
    setTestRows(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveSourceRules(box, list);
      setSaved(true);
      toast(t('规则已保存，对后续邮件生效；可对最近 30 天邮件重跑'));
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    try {
      setTestRows(await testSourceRule(box, editing));
    } catch (e) {
      fail(e);
    } finally {
      setTesting(false);
    }
  };

  const toggleFeat = async (key: string, on: boolean) => {
    setFeats((xs) => xs.map((f) => (f.key === key ? { ...f, on } : f)));
    try {
      await setMailboxFeature(key, on);
    } catch (e) {
      setFeats((xs) => xs.map((f) => (f.key === key ? { ...f, on: !on } : f)));
      fail(e);
    }
  };

  const authorize = async (req: BindRequest) => {
    setBinding(true);
    try {
      const r = await authorizeMailbox(req);
      setBound(r);
      setWiz(3);
    } catch (e) {
      fail(e);
    } finally {
      setBinding(false);
    }
  };

  const finishWiz = () => {
    const r = bound ?? { boxId: 'b1', mail: 'li.min@group.example.com' };
    setWiz(0);
    setAuth((x) => ({ ...x, [r.boxId]: 'ok' }));
    setBox(r.boxId);
    setRi(0);
    toast(t('已绑定 ' + r.mail));
  };

  return (
    <>
      <PageHeader
        crumb={`${t('采集')} / ${t('邮箱采集与识别')}`}
        title={t('邮箱采集与识别设置')}
        badges={isMock() ? <Chip tone="gray">{t('示例数据')}</Chip> : null}
        actions={
          <>
            <div className={s.headStats}>
              <div>
                <div className="kick">{t('已授权邮箱')}</div>
                <div className={`num ${s.headStatVal}`}>
                  {authed} / {boxes.length}
                </div>
              </div>
              <div>
                <div className="kick">{t('30 天采集附件')}</div>
                <div className={`num ${s.headStatVal}`}>{nf.format(stats.attachments30d)}</div>
              </div>
              <div>
                <div className="kick">{t('规则命中后识别准确率')}</div>
                <div className={`num ${s.headStatVal}`}>
                  {stats.accHit}% <span className={s.headStatSub}>{t('（未命中 ' + stats.accMiss + '%）')}</span>
                </div>
              </div>
            </div>
            <Button variant="primary" onClick={() => setWiz(1)}>
              {t('绑定我的邮箱')}
            </Button>
          </>
        }
      />
      <PageBody className={s.body}>
        {wiz > 0 ? (
          <BindWizard
            step={wiz as 1 | 2 | 3}
            providers={providers}
            provider={prov}
            busy={binding}
            onPickProvider={setProv}
            onStep={setWiz}
            onAuthorize={authorize}
            onFinish={finishWiz}
            onClose={() => setWiz(0)}
          />
        ) : null}

        <MailboxTable
          boxes={boxes}
          authOf={authOf}
          ruleCount={(id) => (rules[id] ?? []).length}
          selected={box}
          busyId={busyBox}
          onPick={pickBox}
          onAction={onBoxAction}
        />

        <div className={s.split}>
          <RuleList
            boxName={current.name}
            rules={list}
            docTypes={docTypes}
            selected={ri}
            onPick={(i) => {
              setRi(i);
              setTestRows(null);
            }}
            onAdd={addRule}
          />
          <RuleEditor
            rule={editing}
            docTypes={docTypes}
            knownSuppliers={knownSuppliers}
            saved={saved}
            saving={saving}
            testing={testing}
            testRows={testRows}
            onText={(k, v) => patch(k, v)}
            onAuthReq={(v: SenderAuth) => patch('authReq', v)}
            onDoc={(k: DocKind, on: boolean) => patch('docs', { ...editing.docs, [k]: on })}
            onTest={runTest}
            onSave={save}
          />
        </div>

        <FeatureGrid feats={feats} onToggle={toggleFeat} />
      </PageBody>
    </>
  );
}
