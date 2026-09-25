// components/StoreInfoSection.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Store, Mail, Phone, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { EditableField } from './EditableField';

interface StoreInfoSectionProps {
  storeData: any;
  editingField: string | null;
  handleEdit: (field: string, value: string) => void;
  handleSave: (field: string) => void;
  handleCancel: () => void;
  tempValue: string;
  setTempValue: (value: string) => void;
  isUpdating: boolean;
  t: (key: string) => string;
  className?: string;
}

export const StoreInfoSection: React.FC<StoreInfoSectionProps> = ({
  storeData,
  editingField,
  handleEdit,
  handleSave,
  handleCancel,
  tempValue,
  setTempValue,
  isUpdating,
  t,
  className
}) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }} 
    animate={{ opacity: 1, x: 0 }}
    className={className}
  >
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.store_management.store_information')}</CardTitle>
        <CardDescription>
          {t('dashboard.store_management.store_info_description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableField
            field="shop.name"
            value={storeData.shop.name}
            label="dashboard.store_management.store_name"
            type="text"
            Icon={Store}
            editingField={editingField}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            tempValue={tempValue}
            setTempValue={setTempValue}
            isUpdating={isUpdating}
            t={t}
          />
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t('dashboard.store_management.store_domain')}
            </label>
            <div className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg">
              {storeData.shop.domain ? (
                <a
                  href={/^https?:\/\//.test(storeData.shop.domain) ? storeData.shop.domain : `https://${storeData.shop.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate font-medium text-primary underline-offset-4 hover:underline"
                >
                  {storeData.shop.domain.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              {storeData.shop.status === 'active' ? (
                <span className="shrink-0 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">{t('dashboard.store_management.store_live')}</span>
              ) : (
                <span className="shrink-0 px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">{t('dashboard.store_management.store_not_published')}</span>
              )}
            </div>
          </div>

          <EditableField
            field="shop.email"
            value={storeData.shop.email}
            label="dashboard.store_management.contact_email"
            type="email"
            Icon={Mail}
            editingField={editingField}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            tempValue={tempValue}
            setTempValue={setTempValue}
            isUpdating={isUpdating}
            t={t}
          />

          <EditableField
            field="shop.phone"
            value={storeData.shop.phone}
            label="dashboard.store_management.phone_number"
            type="tel"
            Icon={Phone}
            editingField={editingField}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            tempValue={tempValue}
            setTempValue={setTempValue}
            isUpdating={isUpdating}
            t={t}
          />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);