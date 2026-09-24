import React, { useEffect, useRef, useState } from 'react';
import { Upload, Mail, Phone, MapPin, Briefcase, Store } from 'lucide-react';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';
import { useLanguage } from '../../../contexts/LanguageContext';
import StepHeader from './StepHeader';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';

const LOCATIONS = ['phnom-penh', 'siem-reap', 'kampong-speu', 'other'];

const FieldIcon = ({ icon: Icon }) => (
  <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
);

const BusinessDetailsStep = ({ data, onUpdate }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const details = data.businessDetails || {};

  useEffect(() => {
    fetch(`${RENTIFY_API_BASE}/api/stores/categories`)
      .then((response) => response.json())
      .then((result) => setCategories(result.data || []))
      .catch(() => setCategories([]));
  }, []);

  const handleInputChange = (field, value) => {
    onUpdate({ businessDetails: { ...data.businessDetails, [field]: value } });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const logoUrl = URL.createObjectURL(file);
      onUpdate({ businessDetails: { ...data.businessDetails, logo: logoUrl, file: file } });
    }
  };

  return (
    <div className="space-y-8">
      <StepHeader
        icon={Store}
        title={t('business.title')}
        description={t('business.description')}
      />

      <Card className="gap-0 py-0">
        <CardContent className="space-y-6 p-6 md:p-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('business.sections.brand')}
          </h3>

          <div className="space-y-2">
            <Label htmlFor="business-name">{t('business.name.label')}</Label>
            <div className="relative">
              <FieldIcon icon={Briefcase} />
              <Input
                id="business-name"
                value={details.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('business.name.placeholder')}
                className="h-11 pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary-store-category">Primary store category</Label>
            <select
              id="primary-store-category"
              required
              value={details.primaryCategory || ''}
              onChange={(event) => handleInputChange('primaryCategory', event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3"
            >
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t('business.logo.label')}</Label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/svg+xml"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              {details.logo ? (
                <img
                  src={details.logo}
                  alt="Logo preview"
                  className="h-16 w-16 rounded-lg border bg-background object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </span>
              )}
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {details.logo
                    ? t('business.logo.change')
                    : t('business.logo.upload')}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t('business.logo.format')}
                </span>
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardContent className="space-y-6 p-6 md:p-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('business.sections.contact')}
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business-location">
                {t('business.location.label')}
              </Label>
              <Select
                value={details.location || undefined}
                onValueChange={(value) => handleInputChange('location', value)}
              >
                <SelectTrigger id="business-location" className="h-11 w-full">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <SelectValue
                      placeholder={t('business.location.placeholder')}
                    />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((location) => (
                    <SelectItem key={location} value={location}>
                      {t(`business.location.${location}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-contact">
                {t('business.contact.label')}
              </Label>
              <div className="relative">
                <FieldIcon icon={Phone} />
                <Input
                  id="business-contact"
                  type="tel"
                  value={details.contact || ''}
                  onChange={(e) => handleInputChange('contact', e.target.value)}
                  placeholder={t('business.contact.placeholder')}
                  className="h-11 pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-email">{t('business.email.label')}</Label>
            <div className="relative">
              <FieldIcon icon={Mail} />
              <Input
                id="business-email"
                type="email"
                value={details.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder={t('business.email.placeholder')}
                className="h-11 pl-10"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessDetailsStep;
