import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, ReceiptText } from 'lucide-react';

const USAGE_NAV_ITEMS = [
  { name: 'Dashboard', path: '/usage/dashboard', icon: LayoutDashboard },
  { name: 'Breakdown', path: '/usage/breakdown', icon: BarChart3 },
  { name: 'Invoices & Billing', path: '/usage/billing', icon: ReceiptText },
];

export const UsageTabs = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto mb-6">
      {USAGE_NAV_ITEMS.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              isActive
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.name}</span>
          </button>
        );
      })}
    </div>
  );
};
