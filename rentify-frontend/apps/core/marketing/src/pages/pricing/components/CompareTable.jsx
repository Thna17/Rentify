import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Reveal } from '../../../components/site/motion';
import {
  formatColumnHeading,
  planCommission,
  planHasMarketplace,
  planHasOwnStorefront,
  planHasPos,
  planHasProTools,
  planHasStoreAndCatalog,
  planTierKey,
  planWhoItsFor,
} from '../../../utils/planFormat';

const DEFAULT_PLANS = [
  { id: 'free', name: 'Free', price: 0 },
  { id: 'starter', name: 'Starter', price: 8 },
  { id: 'pro', name: 'Pro', price: 15 },
];

const buildMatrixRows = () => [
  {
    key: 'whoItsFor',
    label: 'Who it’s for',
    value: (plan, idx) => planWhoItsFor(plan, idx),
  },
  {
    key: 'storeAndCatalog',
    label: 'Store and one catalog',
    value: (plan, idx) => planHasStoreAndCatalog(plan, idx),
  },
  {
    key: 'marketplace',
    label: 'Sell on Rentify Marketplace',
    value: (plan, idx) => planHasMarketplace(plan, idx),
  },
  {
    key: 'ownStorefront',
    label: 'Own storefront (subdomain + templates)',
    value: (plan, idx) => planHasOwnStorefront(plan, idx),
  },
  {
    key: 'productsLimit',
    label: 'Product limit',
    value: (plan, idx) => {
      const key = planTierKey(plan, idx);
      if (key === 'free') return '25 products';
      if (key === 'starter') return '100 products';
      return '500 products';
    },
  },
  {
    key: 'staffAccounts',
    label: 'Staff accounts',
    value: (plan, idx) => {
      const key = planTierKey(plan, idx);
      if (key === 'free') return '1 account';
      if (key === 'starter') return '2 accounts';
      return '5 accounts';
    },
  },
  {
    key: 'pos',
    label: 'POS at the counter',
    value: (plan, idx) => planHasPos(plan, idx),
  },
  {
    key: 'customDomain',
    label: 'Custom domain + Free SSL',
    value: (plan, idx) => planTierKey(plan, idx) === 'pro',
  },
  {
    key: 'telegramAlerts',
    label: 'Telegram order notifications',
    value: (plan, idx) => planTierKey(plan, idx) === 'pro',
  },
  {
    key: 'proTools',
    label: 'Analytics & marketing tools',
    value: (plan, idx) => planHasProTools(plan, idx),
  },
  {
    key: 'commission',
    label: 'Commission',
    value: (plan) => planCommission(plan),
  },
];

const Cell = ({ value, t }) => {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center text-[#1d1d1f] font-semibold">
        <Check
          className="h-5 w-5 text-[#0071e3]"
          strokeWidth={2.4}
          aria-label={t('site.pricing.compare.included')}
        />
      </span>
    );
  }
  if (value === false) {
    return (
      <span
        className="text-[16px] font-medium text-[#86868b]"
        aria-label={t('site.pricing.compare.notIncluded')}
      >
        —
      </span>
    );
  }
  return <span className="text-[15px] font-normal leading-relaxed text-[#1d1d1f]">{value}</span>;
};

const CompareTable = ({ plans }) => {
  const { t } = useLanguage();
  const displayPlans = Array.isArray(plans) && plans.length > 0 ? plans : DEFAULT_PLANS;
  const rows = buildMatrixRows();

  return (
    <Reveal className="overflow-x-auto rounded-[24px]">
      <div className="w-[600px] overflow-clip rounded-[24px] border sm:w-auto border-black/[0.08] bg-white shadow-[0_20px_60px_-35px_rgba(0,0,0,0.12)]">
        <table className="w-full min-w-[600px] border-collapse text-left sm:min-w-[680px]">
          <thead>
            <tr className="border-b border-black/[0.08] bg-[#fbfbfd]">
              <th className="sticky left-0 z-10 w-[34%] bg-[#fbfbfd] px-4 py-4 text-[14px] sm:px-6 sm:py-5 font-semibold text-[#86868b]">
                {/* Empty header matching reference table */}
              </th>
              {displayPlans.map((plan, idx) => (
                <th
                  key={plan.id || idx}
                  className="w-[22%] px-4 py-4 text-left text-[15px] sm:px-6 sm:py-5 sm:text-[16px] font-bold tracking-[-0.01em] text-[#1d1d1f]"
                >
                  {formatColumnHeading(plan, idx)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className="border-t border-black/[0.08] transition-colors hover:bg-black/[0.015]"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-[150px] bg-white px-4 py-4 text-[14px] font-medium leading-snug text-[#1d1d1f] shadow-[1px_0_0_rgba(0,0,0,0.06)] sm:w-auto sm:px-6 sm:py-5 sm:text-[15px] sm:shadow-none"
                >
                  {row.label}
                </th>
                {displayPlans.map((plan, idx) => (
                  <td key={plan.id || idx} className="px-4 py-4 text-left align-top sm:px-6 sm:py-5">
                    <Cell value={row.value(plan, idx)} t={t} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Reveal>
  );
};

export default CompareTable;
