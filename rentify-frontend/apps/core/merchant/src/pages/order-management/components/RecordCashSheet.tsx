import React, { useState } from 'react';
import { useTranslation } from '@rentify/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@rentify/shared/ui/dialog';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { DollarSign, AlertCircle } from 'lucide-react';

interface RecordCashSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onConfirm: (amount: string) => Promise<void>;
}

export const RecordCashSheet: React.FC<RecordCashSheetProps> = ({
  open,
  onOpenChange,
  order,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const totalDue = String(order?.payment?.amountDue || order?.totals?.total || '0.00');
  const [amount, setAmount] = useState(totalDue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync amount when order changes
  React.useEffect(() => {
    if (order) {
      const due = String(order.payment?.amountDue || order.totals?.total || '0.00');
      setAmount(due);
      setError('');
    }
  }, [order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(amount);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to record cash');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader className="space-y-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <DollarSign className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Record cash collected
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Only record cash you have in hand. The buyer is told the order is paid and COD is settled.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="cash-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Amount collected (USD)
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                $
              </span>
              <Input
                id="cash-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 h-12 rounded-xl text-lg font-bold font-mono bg-card border-card-border"
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Must equal the amount due: <span className="font-semibold text-foreground">${totalDue}</span>
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto h-11 rounded-xl px-5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? 'Recording…' : `Record $${amount || totalDue}`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-11 rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Not yet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
