import { Card, Chip } from '@/components/ui';
import { useT } from '@/i18n';
import type { CorrectionRule } from '../types';
import s from './portal.module.css';

/** 更正规则（供应商可见） */
export function CorrectionRules({ rules }: { rules: CorrectionRule[] }) {
  const t = useT();
  return (
    <Card padded={false} className={s.panel} aria-label={t('更正规则')}>
      <h2 className={s.panelTitle}>{t('更正规则（供应商可见）')}</h2>
      <div className={s.rules}>
        {rules.map((u) => (
          <div key={u.label} className={s.rule}>
            <Chip tone={u.tone} className={s.ruleChip}>
              {t(u.label)}
            </Chip>
            <div>
              <div className={s.ruleWhat}>{t(u.what)}</div>
              <div className={s.ruleHow}>{t(u.how)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
