import { useState } from 'react';
import { Button, Chip, ErrorState, Icon, PageLoading, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { LangSwitcher } from '@/layout/LangSwitcher';
import { useAsync } from '@/lib/useAsync';
import { cx } from '@/lib/sample';
import { fetchCaptureSession, submitCapture } from '../api';
import type { CaptureSession, IssueKey, Screen } from '../types';
import { CameraScreen } from './CameraScreen';
import { ResultScreen, type DoneMap } from './ResultScreen';
import s from '../CaptureMobilePage.module.css';

const TITLES: Record<Screen, string> = {
  home: '发票采集',
  cam: '拍票',
  run: '识别中',
  res: '确认识别结果',
  done: '完成',
};

const CAMERA = 'M3 8h4l2-3h6l2 3h4v11H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z';

/**
 * 员工手机端采集流程。framed：在 390×844 设备框内预览；否则铺满屏幕（扫码打开的独立页面）。
 */
export function PhoneApp({ framed }: { framed: boolean }) {
  const t = useT();
  const { data, error, loading, reload } = useAsync(fetchCaptureSession, []);
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <div className={cx(s.phone, framed ? s.framed : s.fluid)}>
      <div className={s.topBar}>
        {screen !== 'home' ? (
          <button
            type="button"
            className={s.backBtn}
            onClick={() => setScreen(screen === 'res' ? 'cam' : 'home')}
            aria-label={t('返回')}
          >
            <Icon name="chevronLeft" size={20} strokeWidth={1.8} />
          </button>
        ) : null}
        <div className={s.topTitleWrap}>
          <div className={s.topTitle}>{t(TITLES[screen])}</div>
          <div className={s.topSub}>{data ? t(data.claimLabel) : ' '}</div>
        </div>
        <LangSwitcher variant="compact" />
      </div>
      {loading && !data ? (
        <div className={s.stateBox}>
          <PageLoading />
        </div>
      ) : error ? (
        <div className={s.stateBox}>
          <ErrorState error={error} onRetry={reload} />
        </div>
      ) : data ? (
        <Flow session={data} screen={screen} setScreen={setScreen} />
      ) : null}
    </div>
  );
}

function Flow({
  session,
  screen,
  setScreen,
}: {
  session: CaptureSession;
  screen: Screen;
  setScreen: (s: Screen) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [done, setDone] = useState<DoneMap>({});
  const [po, setPo] = useState(session.poInitial);
  const [busy, setBusy] = useState(false);

  const doneN = Object.keys(done).length;
  const left = session.issues.length - doneN;

  const goCam = () => {
    setDone({});
    setScreen('cam');
  };
  const apply = (k: IssueKey) => setDone((d) => ({ ...d, [k]: true }));
  const submit = async () => {
    setBusy(true);
    try {
      await submitCapture({
        invoiceId: session.invoice.id,
        corrections: Object.keys(done) as IssueKey[],
        po: done.po ? po : undefined,
      });
      setScreen('done');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { error: true });
    } finally {
      setBusy(false);
    }
  };

  if (screen === 'home') {
    return (
      <div className={cx(s.scroll, s.homeBody)}>
        <div className={s.card} style={{ padding: 16 }}>
          <div className={s.small}>{t('发生地')}</div>
          <div className={s.placeRow}>
            <span className={s.placeValue}>{t('自动判定')}</span>
            <span className={s.placeHint}>{t('按票面税号、语言与币种')}</span>
          </div>
          <div className={s.placeNote}>
            {t('拍摄后会自动完成影像检测、识别、税局查验与 12 项校验，可纠正的问题会给出建议。')}
          </div>
        </div>
        <Button variant="primary" block className={s.bigBtn} onClick={goCam} icon={<Icon d={CAMERA} size={20} />}>
          {t('拍票')}
        </Button>
        <div className={s.twoCol}>
          <Button block className={s.bigBtn}>
            {t('相册 / 文件')}
          </Button>
          <Button block className={s.bigBtn}>
            {t('税局取票')}
          </Button>
        </div>
        <div className={s.recentHead}>{t('本单已采集')}</div>
        {session.recent.map((r) => (
          <div key={r.seller} className={s.recentRow}>
            <div className={s.recentMain}>
              <div className={s.recentSeller} translate="no">
                {r.seller}
              </div>
              <div className={s.small}>{t(r.meta)}</div>
            </div>
            <div className={cx('num', s.recentAmt)}>{r.amt}</div>
            <Chip tone={r.tone}>{t(r.st)}</Chip>
          </div>
        ))}
      </div>
    );
  }

  if (screen === 'cam') {
    return <CameraScreen hint={session.camHint} onShoot={() => setScreen('run')} onCancel={() => setScreen('home')} />;
  }

  if (screen === 'run') {
    return (
      <div className={s.runBody}>
        <div className={s.runTitle}>{t('正在识别与校验')}</div>
        {session.steps.map((p) => (
          <div key={p.label} className={s.stepRow}>
            <span className={cx(s.stepIcon, p.ok ? s.stepOk : s.stepWarn)} aria-hidden="true">
              {p.ok ? '✓' : '!'}
            </span>
            <div style={{ flex: 1 }}>
              <div className={s.stepLabel}>{t(p.label)}</div>
              <div className={s.small}>{t(p.sub)}</div>
            </div>
          </div>
        ))}
        <Button variant="primary" block className={s.bigBtn} style={{ marginTop: 'auto' }} onClick={() => setScreen('res')}>
          {t('查看结果')}
        </Button>
      </div>
    );
  }

  if (screen === 'res') {
    return (
      <>
        <ResultScreen
          invoice={session.invoice}
          issues={session.issues}
          fields={session.fields}
          done={done}
          po={po}
          onPo={setPo}
          onApply={apply}
        />
        <div className={s.footBar}>
          <Button variant="primary" block className={s.bigBtn} onClick={submit} disabled={left > 0 || busy}>
            {left > 0 ? t('还有 ' + left + ' 项待处理') : t('加入报销单')}
          </Button>
          <Button block className={s.bigBtn} onClick={goCam}>
            {t('重拍')}
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className={s.doneBody}>
      <div className={s.doneIcon}>
        <Icon name="check" size={30} strokeWidth={2} />
      </div>
      <div className={s.doneTitle}>{t('已加入报销单')}</div>
      <div className={s.doneText}>
        {t('识别结果与')} {doneN}{' '}
        {t('处更正已回传给宿主页面（invoice.submitted）。被更正的字段将进入识别样本回流。')}
      </div>
      <div className={s.doneActions}>
        <Button variant="primary" block className={s.bigBtn} onClick={goCam}>
          {t('继续拍下一张')}
        </Button>
        <Button block className={s.bigBtn} onClick={() => setScreen('home')}>
          {t('返回')}
        </Button>
      </div>
    </div>
  );
}
