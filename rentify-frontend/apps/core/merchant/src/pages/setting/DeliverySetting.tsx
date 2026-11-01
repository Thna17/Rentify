import React from 'react';
import { Truck } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { useChannels } from '../../context/ChannelContext';
import { DeliveryFeeForm } from '../../app/features/delivery-fee/DeliveryFeeForm';
import { useSetupGuide } from '../../app/features/setup-guide/SetupGuideContext';

/** Settings › Delivery: the permanent home of the Store's delivery fee (docs/specs/merchant-setup-guide.md, D8). */
export default function DeliverySetting() {
  const { t } = useTranslation();
  const { store } = useChannels();
  const { refresh } = useSetupGuide();
  const storeId = (store as { id?: string } | null)?.id ?? null;

  return (
    <SettingsLayout title={t('merchant.settings.sections.delivery.title')} description={t('merchant.setup.deliverySettingDescription')} icon={<Truck />}>
      <Card className="rounded-2xl border border-border shadow-[var(--shadow-soft)]">
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-muted-foreground">{t('merchant.setup.deliveryBody')}</p>
          <DeliveryFeeForm storeId={storeId} onSaved={() => void refresh()} />
        </CardContent>
      </Card>
      {/* Returns follow Rentify's rule (DEC-008); a store-written policy has no backend field yet */}
      <Card className="rounded-2xl border border-border shadow-[var(--shadow-soft)]">
        <CardContent className="space-y-1 pt-6">
          <h2 className="text-base font-semibold text-foreground">{t('merchant.settings.returnsTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('merchant.settings.returnsBody')}</p>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
