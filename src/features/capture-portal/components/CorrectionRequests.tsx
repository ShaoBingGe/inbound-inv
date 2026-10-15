import { Button, Card, Chip, type Tone } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { CorrectionRequest, RequestAction } from '../types';
import s from './portal.module.css';

function statusOf(rs: RequestAction | undefined): [string, Tone] {
  if (rs === 'ok') return ['已提交，待买方确认', 'green'];
  if (rs === 'dispute') return ['异议处理中', 'blue'];
  return ['待处理', 'orange'];
}

/** 买方发来的更正请求：票面本身有误且字段不得更正时，供应商开具更正票据或提出异议 */
export function CorrectionRequests({
  reqs,
  reqSt,
  busy,
  onRespond,
}: {
  reqs: CorrectionRequest[];
  reqSt: Record<string, RequestAction>;
  busy: string | null;
  onRespond: (id: string, action: RequestAction) => void;
}) {
  const { t, dict } = useI18n();
  /* 中文原文「补偿方式：」后不留空格；译文的冒号后需要空格 */
  const colonGap = dict === 'zh' || dict === 'zh-TW' ? '' : ' ';
  return (
    <Card padded={false} aria-label={t('更正请求')}>
      <div className={s.cardHead}>
        <h2 className={s.cardTitle}>{t('买方发来的更正请求')}</h2>
        <span className={s.cardDesc}>{t('票面本身有误、且该字段不得更正时，需要您开具更正票据')}</span>
      </div>
      <div className={s.reqList}>
        {reqs.map((q) => {
          const rs = reqSt[q.id];
          const [st, tone] = statusOf(rs);
          return (
            <div key={q.id} className={s.req}>
              <div className={s.reqMain}>
                <div className={s.reqTitleRow}>
                  <Chip tone={tone}>{t(st)}</Chip>
                  <span className={s.reqTitle}>{t(q.title)}</span>
                  <span className={`mono ${s.ink2}`} translate="no">
                    {q.inv}
                  </span>
                </div>
                <div className={s.reqBody}>{t(q.body)}</div>
                <div className={s.reqMeta}>
                  {t('补偿方式：') + colonGap}
                  {t(q.comp)} {t('· 截止')} {q.due}
                </div>
              </div>
              {!rs ? (
                <div className={s.reqActions}>
                  <Button variant="primary" disabled={busy === q.id} onClick={() => onRespond(q.id, 'ok')}>
                    {t(q.cta)}
                  </Button>
                  <Button disabled={busy === q.id} onClick={() => onRespond(q.id, 'dispute')}>
                    {t('提出异议')}
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
