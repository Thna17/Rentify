import { useState } from 'react';
import { useTranslation } from '@rentify/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@rentify/shared/ui/dialog';
import { Button } from '@rentify/shared/ui/button';
import { money, orderLabel } from '../orderModel';

interface RecordCashSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onConfirm: () => Promise<void>;
}

/**
 * Records cash collected on delivery (redesign M5). Commerce only accepts the exact amount due,
 * so the sheet states that amount instead of asking for one.
 */
export function RecordCashSheet({ open, onOpenChange, order, onConfirm }: RecordCashSheetProps) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const due = money(order?.payment?.amountDue, order?.currency);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl p-6 sm:max-w-md">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-xl font-semibold">{t('merchant.orders.cash.title')}</DialogTitle>
          <DialogDescription>{t('merchant.orders.cash.body')}</DialogDescription>
        </DialogHeader>
        {order && (
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">{orderLabel(order)} · {order.buyer?.name}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{due}</p>
          </div>
        )}
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="min-h-[44px] rounded-xl">
            {t('merchant.orders.cash.notYet')}
          </Button>
          <Button type="button" disabled={submitting} onClick={submit} className="min-h-[44px] rounded-xl">
            {t('merchant.orders.cash.record', { amount: due })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RecordCashSheet;
