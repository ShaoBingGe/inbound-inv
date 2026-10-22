import { useMemo, useState } from 'react';
import { Select } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { canSeeCountry } from '@/auth/types';
import { useT } from '@/i18n';
import { useAsync } from '@/lib/useAsync';
import { fetchWalletOverview } from '../api';
import type { CountryCode, WalletCountry } from '../types';
import s from './CountrySelect.module.css';

/** 国家 / 数据中心选择：只列出用户可见的国家（后端同样校验）。三单匹配相关页面共用。 */
export function useCountryPicker(defaultCode: CountryCode = 'CN') {
  const { user } = useAuth();
  const overview = useAsync(fetchWalletOverview, []);
  const [pick, setPick] = useState<CountryCode>(defaultCode);
  const countries = useMemo(
    () => (overview.data?.countries ?? []).filter((c) => canSeeCountry(user, c.code)),
    [overview.data, user],
  );
  const country = countries.find((c) => c.code === pick) ?? countries[0];
  return {
    loading: overview.loading && !overview.data,
    error: overview.error,
    reload: overview.reload,
    countries,
    country,
    setCountry: setPick,
  };
}

export function CountrySelect({
  countries,
  value,
  onChange,
}: {
  countries: WalletCountry[];
  value: CountryCode;
  onChange: (c: CountryCode) => void;
}) {
  const t = useT();
  return (
    <label className={s.pick}>
      <span className="kick">{t('国家 / 数据中心')}</span>
      <Select
        value={value}
        onChange={(v) => onChange(v as CountryCode)}
        options={countries.map((c) => ({ value: c.code, label: t(c.name) }))}
      />
    </label>
  );
}
