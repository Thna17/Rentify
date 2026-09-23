// components/SocialMediaSection.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Facebook, Instagram, Twitter, Linkedin, Share2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { EditableField } from './EditableField';

interface SocialMediaSectionProps {
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

export const SocialMediaSection: React.FC<SocialMediaSectionProps> = ({
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
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }}
    className={className}
  >
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t('dashboard.store_management.social_media')}</CardTitle>
        </div>
        <CardDescription>
          {t('dashboard.store_management.social_media_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableField
            field="socialMedia.facebook"
            value={storeData?.socialMedia?.facebook || ''}
            label="dashboard.store_management.facebook_url"
            type="url"
            Icon={Facebook}
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
            field="socialMedia.instagram"
            value={storeData?.socialMedia?.instagram || ''}
            label="dashboard.store_management.instagram_url"
            type="url"
            Icon={Instagram}
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
            field="socialMedia.twitter"
            value={storeData?.socialMedia?.twitter || ''}
            label="dashboard.store_management.twitter_url"
            type="url"
            Icon={Twitter}
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
            field="socialMedia.linkedin"
            value={storeData?.socialMedia?.linkedin || ''}
            label="dashboard.store_management.linkedin_url"
            type="url"
            Icon={Linkedin}
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

        {/* Social Media Preview */}
        {Object.values(storeData.socialMedia).some((val: any) => val) && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-3">
              {t('dashboard.store_management.social_preview')}
            </h4>
            <div className="flex gap-3">
              {storeData.socialMedia.facebook && (
                <a 
                  href={storeData.socialMedia.facebook} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {storeData.socialMedia.instagram && (
                <a 
                  href={storeData.socialMedia.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {storeData.socialMedia.twitter && (
                <a 
                  href={storeData.socialMedia.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {storeData.socialMedia.linkedin && (
                <a 
                  href={storeData.socialMedia.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);