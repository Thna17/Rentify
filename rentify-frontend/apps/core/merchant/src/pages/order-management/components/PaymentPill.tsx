import { useTranslation } from '@rentify/utils';
import { StatusPill } from '../../../components/data-table/StatusPill';
import { paymentKind, type PaymentKind } from '../orderModel';

const TONE: Record<PaymentKind, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  cod_due: 'warning',
  cod_collected: 'success',
  cod_refunded: 'neutral',
  online_paid: 'success',
  online_waiting: 'info',
  online_failed: 'danger',
  cash_paid: 'success',
  paid: 'success',
  unpaid: 'warning',
  none: 'neutral',
};

/** How an order is paid, in words. "Paid" only when Commerce recorded the payment as paid. */
export function PaymentPill({ order }: { order: any }) {
  const { t } = useTranslation();
  const kind = paymentKind(order);
  return <StatusPill tone={TONE[kind]}>{t(`merchant.orders.payment.${kind}`)}</StatusPill>;
}

export default PaymentPill;
