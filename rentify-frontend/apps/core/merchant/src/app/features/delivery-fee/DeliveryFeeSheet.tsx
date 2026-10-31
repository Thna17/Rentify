import React from 'react';
import { useTranslation } from '@rentify/utils';
import { ResponsiveDialog } from '@rentify/shared/ui';
import { toast } from 'sonner';
import { useChannels } from '../../../context/ChannelContext';
import { useSetupGuide } from '../setup-guide/SetupGuideContext';
import { DeliveryFeeForm } from './DeliveryFeeForm';

/**
 * Sets the delivery fee without leaving the page: a bottom sheet on phones, a dialog on desktop.
 * Opened from the setup guide; the permanent home of the fee is Settings › Delivery.
 */
export function DeliveryFeeSheet() {
  const { t } = useTranslation();
  const { store } = useChannels();
  const { deliverySheetOpen, setDeliverySheetOpen, refresh } = useSetupGuide();
  const storeId = (store as { id?: string } | null)?.id ?? null;

  return (
    <ResponsiveDialog
      open={deliverySheetOpen}
      onOpenChange={setDeliverySheetOpen}
      title={t('merchant.setup.deliverySheetTitle')}
      description={t('merchant.setup.deliveryBody')}
    >
      <div className="mt-4 space-y-3">
        <DeliveryFeeForm
          storeId={storeId}
          block
          onSaved={() => {
            void refresh();
            setDeliverySheetOpen(false);
            toast.success(t('merchant.setup.deliverySaved'));
          }}
        />
        <p className="text-xs text-muted-foreground">{t('merchant.setup.deliveryChangeLater')}</p>
      </div>
    </ResponsiveDialog>
  );
}

export default DeliveryFeeSheet;
