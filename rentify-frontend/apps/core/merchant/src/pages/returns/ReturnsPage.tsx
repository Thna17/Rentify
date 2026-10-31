import React from 'react';
import { useTranslation } from '@rentify/utils';
import { AlertCircle, LifeBuoy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';

export const ReturnsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Returns & problems</h1>
          <p className="mt-1 text-sm text-muted-foreground hidden sm:block">
            Buyer return requests and complaints. Follows the 48-hour response deadline (DEC-009).
          </p>
        </div>

        {/* Blocked state card per wireframe M6 note 2 */}
        <div className="rounded-2xl border border-card-border bg-card p-6 shadow-soft text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
              Needs backend integration
            </span>
            <h2 className="text-lg font-semibold text-foreground pt-2">Direct seller complaint queue is pending</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Buyers can submit return reports and Rentify staff triage them. The store-scoped report endpoint
              (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">GET /api/stores/:id/reports</code>)
              is planned in contract packet RX-C01.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/orders')}
              className="rounded-xl h-10 px-4 text-xs sm:text-sm font-semibold w-full sm:w-auto"
            >
              <span>View store orders</span>
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/help')}
              className="rounded-xl h-10 px-4 text-xs sm:text-sm font-semibold w-full sm:w-auto"
            >
              <LifeBuoy className="mr-1.5 h-4 w-4" />
              <span>Contact support</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnsPage;
