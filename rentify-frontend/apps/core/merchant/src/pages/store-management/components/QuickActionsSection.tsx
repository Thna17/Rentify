// components/QuickActionsSection.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Package, CreditCard, Settings, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';

interface QuickActionsSectionProps {
  t: (key: string) => string;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({ t }) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }} 
    animate={{ opacity: 1, x: 0 }}
  >
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.store_management.quick_actions')}</CardTitle>
        <CardDescription>
          {t('dashboard.store_management.quick_actions_description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="outline" className="w-full justify-start gap-2">
          <Package className="h-4 w-4" />
          {t('dashboard.product.title')}
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2">
          <CreditCard className="h-4 w-4" />
          {t('dashboard.store_management.payment_settings')}
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Settings className="h-4 w-4" />
          {t('dashboard.settings.title')}
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Plus className="h-4 w-4" />
          {t('header.add_category')}
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2 text-destructive border-destructive/20 hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
          {t('dashboard.store_management.delete_store')}
        </Button>
      </CardContent>
    </Card>
  </motion.div>
);