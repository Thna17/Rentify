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
  planWhoItsFor,
} from '../../../utils/planFormat';

const DEFAULT_PLANS = [
  { id: 'free', name: 'Free', price: 0 },
  { id: 'starter', name: 'Starter', price: 5 },
  { id: 'pro', name: 'Pro', price: 10 },
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
    key: 'pos',
    label: 'POS at the counter',
    value: (plan, idx) => planHasPos(plan, idx),
  },
  {
    key: 'proTools',
    label: 'Custom domain, staff accounts, analytics, marketing tools',
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
    <Reveal className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <div className="overflow-hidden rounded-[24px] border border-black/[0.08] bg-white shadow-[0_20px_60px_-35px_rgba(0,0,0,0.12)]">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="border-b border-black/[0.08] bg-[#fbfbfd]">
              <th className="sticky left-0 z-10 w-[34%] bg-[#fbfbfd] px-6 py-5 text-[14px] font-semibold text-[#86868b]">
                {/* Empty header matching reference table */}
              </th>
              {displayPlans.map((plan, idx) => (
                <th
                  key={plan.id || idx}
                  className="w-[22%] px-6 py-5 text-left text-[16px] font-bold tracking-[-0.01em] text-[#1d1d1f]"
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
                  className="sticky left-0 z-10 bg-white px-6 py-5 text-[15px] font-medium leading-snug text-[#1d1d1f]"
                >
                  {row.label}
                </th>
                {displayPlans.map((plan, idx) => (
                  <td key={plan.id || idx} className="px-6 py-5 text-left align-top">
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
