import { useState } from 'react';
import { Button, Card, Chip, Input, Select } from '@/components/ui';
import { useT } from '@/i18n';
import { cx } from '@/lib/sample';
import { BIND_DEFAULTS, LOOKBACK_OPTIONS, scopesFor } from '../data';
import type { BindRequest, Lookback, MailProvider, ProviderId } from '../types';
import s from '../CaptureMailboxPage.module.css';

const STEPS = ['选择服务商', '授权', '完成'];

/** 绑定我的邮箱：选择服务商 → 授权 → 完成 */
export function BindWizard({
  step,
  providers,
  provider,
  busy,
  onPickProvider,
  onStep,
  onAuthorize,
  onFinish,
  onClose,
}: {
  step: 1 | 2 | 3;
  providers: MailProvider[];
  provider: ProviderId;
  busy: boolean;
  onPickProvider: (p: ProviderId) => void;
  onStep: (n: 1 | 2 | 3) => void;
  onAuthorize: (req: BindRequest) => void;
  onFinish: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [mail, setMail] = useState(BIND_DEFAULTS.mail);
  const [folders, setFolders] = useState(BIND_DEFAULTS.folders);
  const [lookback, setLookback] = useState<Lookback>('最近 30 天');
  const provName = providers.find((p) => p.id === provider)?.name ?? '';

  return (
    <Card padded={false} className={s.wizard} aria-label={t('绑定邮箱')}>
      <div className={s.rowHead}>
        <h2 className={s.h2}>{t('绑定我的邮箱')}</h2>
        <div className={s.chips}>
          {STEPS.map((label, i) => (
            <Chip key={label} tone={step === i + 1 ? 'blue' : step > i + 1 ? 'green' : 'gray'}>
              {i + 1} · {t(label)}
            </Chip>
          ))}
        </div>
        <div className={s.grow} />
        <Button onClick={onClose}>{t('取消')}</Button>
      </div>

      {step === 1 ? (
        <>
          <div className={s.providerGrid}>
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                className={cx(s.providerCard, p.id === provider && s.providerOn)}
                aria-pressed={p.id === provider}
                onClick={() => onPickProvider(p.id)}
              >
                <div className={s.strong}>{p.name}</div>
                <div className={s.providerHow}>{t(p.how)}</div>
              </button>
            ))}
          </div>
          <div className={s.mt14}>
            <Button variant="primary" onClick={() => onStep(2)}>
              {t('下一步：授权')}
            </Button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div className={s.authRow}>
            <div className={s.scopeBox}>
              <div className={s.strong}>
                {provName} {t('将请求以下权限')}
              </div>
              {scopesFor(provider).map((sc) => (
                <div key={sc.k} className={s.scopeRow}>
                  <span className={cx('mono', s.scopeKey)}>{sc.k}</span>
                  <span className={s.ink2}>{t(sc.d)}</span>
                </div>
              ))}
              <div className={s.note}>{t('只读，不发送邮件，不读取联系人。令牌加密存放于你所属的数据中心，可随时撤销。')}</div>
            </div>
            <div className={s.authFields}>
              <label className={s.lbl}>
                <span className="kick">{t('邮箱地址')}</span>
                <Input className="mono" value={mail} onChange={(e) => setMail(e.target.value)} />
              </label>
              <label className={s.lbl}>
                <span className="kick">{t('只读取以下文件夹')}</span>
                <Input value={folders} onChange={(e) => setFolders(e.target.value)} />
              </label>
              <label className={s.lbl}>
                <span className="kick">{t('回溯时间')}</span>
                <Select
                  value={lookback}
                  onChange={(v) => setLookback(v as Lookback)}
                  options={LOOKBACK_OPTIONS.map((o) => ({ value: o, label: t(o) }))}
                />
              </label>
            </div>
          </div>
          <div className={cx(s.mt14, s.btnRow)}>
            <Button onClick={() => onStep(1)}>{t('上一步')}</Button>
            <Button variant="primary" disabled={busy} onClick={() => onAuthorize({ provider, mail, folders, lookback })}>
              {t('前往')} {provName} {t('授权')}
            </Button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <div className={s.successBox}>
            {t(
              '授权成功：li.min@group.example.com · 首次同步将回溯最近 30 天，预计 4 分钟完成。已为你套用部门默认规则（采购 · 华东），可在下方继续添加来源规则。',
            )}
          </div>
          <div className={s.mt14}>
            <Button variant="primary" onClick={onFinish}>
              {t('完成')}
            </Button>
          </div>
        </>
      ) : null}
    </Card>
  );
}
