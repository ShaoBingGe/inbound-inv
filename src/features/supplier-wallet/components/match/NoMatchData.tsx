import { Button, Empty } from '@/components/ui';
import { useT } from '@/i18n';

/** 当前国家没有三单匹配数据（示例数据只覆盖中国大陆医药业务） */
export function NoMatchData({ onPickCountry }: { onPickCountry?: () => void }) {
  const t = useT();
  return (
    <Empty title={t('该国家暂无三单匹配数据')}>
      <span>{t('三单匹配、应付单与药品匹配关系按国家隔离；示例数据位于中国大陆。')}</span>
      {onPickCountry ? (
        <Button size="sm" onClick={onPickCountry}>
          {t('切换到中国大陆')}
        </Button>
      ) : null}
    </Empty>
  );
}
