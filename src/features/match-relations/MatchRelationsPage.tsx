import { ButtonLink, Empty, ErrorState, Icon, PageBody, PageHeader, PageLoading } from '@/components/ui';
import { ROUTES } from '@/app/routes';
import { useT } from '@/i18n';
import { CountrySelect, useCountryPicker } from '@/features/supplier-wallet/components/CountrySelect';
import { DrugMappingView } from './components/DrugMappingView';
import styles from './MatchRelationsPage.module.css';

/** 数据管理 · 三单匹配关系：入库物料与供应商发票品规的匹配对与换算比例（智能匹配的知识库） */
export default function MatchRelationsPage() {
  const t = useT();
  const cp = useCountryPicker();
  if (cp.loading) return <PageLoading />;
  if (cp.error) return <ErrorState error={cp.error} onRetry={cp.reload} />;
  const country = cp.country;

  return (
    <>
      <PageHeader
        crumb={`${t('数据管理')} / ${t('三单匹配关系')}`}
        title={t('三单匹配关系')}
        subtitle={t('入库物料与供应商发票品规的匹配对与数量换算比例，是三单匹配中智能匹配（向量化）的知识库。')}
        actions={
          <div className={styles.actions}>
            {country ? <CountrySelect countries={cp.countries} value={country.code} onChange={cp.setCountry} /> : null}
            <ButtonLink to={ROUTES.dataMatchTraining()} icon={<Icon name="history" size={14} />}>
              {t('查看训练成果')}
            </ButtonLink>
          </div>
        }
      />
      <PageBody className={styles.body}>
        {country ? (
          <DrugMappingView
            country={country.code}
            onPickCountry={
              country.code !== 'CN' && cp.countries.some((c) => c.code === 'CN') ? () => cp.setCountry('CN') : undefined
            }
          />
        ) : (
          <Empty />
        )}
      </PageBody>
    </>
  );
}
