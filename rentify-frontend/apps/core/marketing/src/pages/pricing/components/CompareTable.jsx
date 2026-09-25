import React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Reveal } from '../../../components/site/motion';
import {
  formatStorage,
  planIncludes,
  planLimit,
  translateFeature,
} from '../../../utils/planFormat';

// Each row reads straight from the package data returned by the API
const buildGroups = (t) => [
  {
    title: t('site.pricing.compare.groups.store'),
    rows: [
      { label: translateFeature('store', t), value: (plan) => planIncludes(plan, 'store') },
      { label: t('site.pricing.limits.products'), value: (plan) => planLimit(plan, 'products', t) },
      {
        label: t('site.pricing.compare.rows.stores'),
        value: (plan) => (planIncludes(plan, 'Multi-Storefront') ? t('site.pricing.compare.multiple') : '1'),
      },
      { label: translateFeature('Custom Domain', t), value: (plan) => planIncludes(plan, 'Custom Domain') },
    ],
  },
  {
    title: t('site.pricing.compare.groups.selling'),
    rows: [
      { label: translateFeature('pos', t), value: (plan) => planIncludes(plan, 'pos') },
      { label: translateFeature('invoice', t), value: (plan) => planIncludes(plan, 'invoice') },
      { label: translateFeature('KHQR Payments', t), value: (plan) => planIncludes(plan, 'KHQR Payments') },
      {
        label: translateFeature('Telegram Order Notifications', t),
        value: (plan) => planIncludes(plan, 'Telegram Order Notifications'),
      },
    ],
  },
  {
    title: t('site.pricing.compare.groups.team'),
    rows: [
      { label: t('site.pricing.limits.staff'), value: (plan) => planLimit(plan, 'staff', t) },
      {
        label: t('site.pricing.compare.rows.analytics'),
        value: (plan) => planIncludes(plan, 'advanced-analytics') || planIncludes(plan, 'Standard Analytics'),
      },
      { label: t('site.pricing.limits.storage'), value: (plan) => formatStorage(plan.limits?.storage) },
    ],
  },
  {
    title: t('site.pricing.compare.groups.support'),
    rows: [
      { label: translateFeature('Dedicated Support', t), value: (plan) => planIncludes(plan, 'Dedicated Support') },
      {
        label: translateFeature('Custom Integrations', t),
        value: (plan) => planIncludes(plan, 'Custom Integrations'),
      },
    ],
  },
];

const Cell = ({ value, t }) => {
  if (value === true) {
    return (
      <Check
        className="mx-auto h-5 w-5 text-[#0071e3]"
        strokeWidth={2.2}
        aria-label={t('site.pricing.compare.included')}
      />
    );
  }
  if (value === false) {
    return (
      <Minus
        className="mx-auto h-5 w-5 text-[#d2d2d7]"
        aria-label={t('site.pricing.compare.notIncluded')}
      />
    );
  }
  return <span className="text-[15px] font-medium text-[#1d1d1f]">{value}</span>;
};

const CompareTable = ({ plans }) => {
  const { t } = useLanguage();
  if (!plans.length) return null;
  const groups = buildGroups(t);

  return (
    <Reveal className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-[34%] bg-white py-5 text-[13px] font-normal text-[#86868b]">
              {t('site.pricing.compare.feature')}
            </th>
            {plans.map((plan) => (
              <th key={plan.id} className="py-5 text-center text-[17px] font-semibold text-[#1d1d1f]">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.title}>
            <tr>
              <th
                colSpan={plans.length + 1}
                className="sticky left-0 bg-white pb-3 pt-10 text-[13px] font-semibold uppercase tracking-wider text-[#86868b]"
              >
                {group.title}
              </th>
            </tr>
            {group.rows.map((row, rowIndex) => (
              <tr key={`${group.title}-${rowIndex}`} className="border-t border-black/[0.08]">
                <th
                  scope="row"
                  className={cn(
                    'sticky left-0 z-10 bg-white py-4 pr-4 text-[15px] font-normal text-[#1d1d1f]'
                  )}
                >
                  {row.label}
                </th>
                {plans.map((plan) => (
                  <td key={plan.id} className="py-4 text-center">
                    <Cell value={row.value(plan)} t={t} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </Reveal>
  );
};

export default CompareTable;
