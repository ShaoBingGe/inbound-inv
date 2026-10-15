import { Button, Card, Chip, LinkButton, Table } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/sample';
import { AUTH, REAUTH_NOTE } from '../data';
import type { AuthState, Mailbox } from '../types';
import s from '../CaptureMailboxPage.module.css';

/** 员工邮箱与授权 */
export function MailboxTable({
  boxes,
  authOf,
  ruleCount,
  selected,
  busyId,
  onPick,
  onAction,
}: {
  boxes: Mailbox[];
  authOf: (b: Mailbox) => AuthState;
  ruleCount: (boxId: string) => number;
  selected: string;
  busyId: string | null;
  onPick: (boxId: string) => void;
  onAction: (b: Mailbox, a: AuthState) => void;
}) {
  const { t, locale } = useI18n();
  const nf = new Intl.NumberFormat(locale);
  return (
    <Card padded={false} aria-label={t('员工邮箱')}>
      <div className={s.cardHead}>
        <h2 className={s.h2}>{t('员工邮箱与授权')}</h2>
        <span className={s.muted}>{t('员工各自绑定、各自授权；管理员只能查看状态，不能读取邮件内容')}</span>
      </div>
      <div className={s.tableTop}>
        <Table hoverRows wrapCells className={s.boxTable}>
          <thead>
            <tr>
              <th>{t('员工')}</th>
              <th>{t('邮箱')}</th>
              <th>{t('服务商')}</th>
              <th>{t('授权状态')}</th>
              <th>{t('读取范围')}</th>
              <th>{t('最近同步')}</th>
              <th className={s.end}>{t('30 天采集')}</th>
              <th className={s.end}>{t('来源规则')}</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {boxes.map((b) => {
              const a = authOf(b);
              const on = b.id === selected;
              const note = a === 'ok' && b.auth !== 'ok' ? REAUTH_NOTE : b.authNote;
              const cta = a === 'ok' ? '解除授权' : a === 'none' ? '邀请绑定' : '重新授权';
              return (
                <tr key={b.id} className={cx(on && s.rowOn)}>
                  <td>
                    <LinkButton className={s.nameBtn} onClick={() => onPick(b.id)} translate="no">
                      {b.name}
                    </LinkButton>
                    <div className={s.sub}>{t(b.dept)}</div>
                  </td>
                  <td className="mono" translate="no">
                    {b.mail}
                  </td>
                  <td translate="no">{b.prov}</td>
                  <td>
                    <Chip tone={AUTH[a].tone}>{t(AUTH[a].label)}</Chip>
                    <div className={s.sub}>{t(note)}</div>
                  </td>
                  <td className={s.ink2}>{t(b.scope)}</td>
                  <td className={cx('num', s.nowrap)}>{t(b.sync)}</td>
                  <td className={cx('num', s.end)}>{nf.format(b.n)}</td>
                  <td className={cx('num', s.end)}>{ruleCount(b.id)}</td>
                  <td>
                    <Button className={s.nowrap} disabled={busyId === b.id} onClick={() => onAction(b, a)}>
                      {t(cta)}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
