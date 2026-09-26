import React, { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { useLanguage } from '../../../contexts/LanguageContext';
import { businessDetailErrors } from '../businessDetails';
import { Field, NoteCard, SectionHeading, SelectField, inputClass } from './OnboardingFields';

const LOCATIONS = ['phnom-penh', 'siem-reap', 'kampong-speu', 'other'];
const PREFIX = '+855';

// The phone is kept as a full number (+855 12 345 678); the prefix is shown beside the input
const localPart = (value = '') => value.replace(/^\+?855\s*/, '');

// Step 1: the details that identify the store
const EssentialsStep = ({ data, onUpdate }) => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [touched, setTouched] = useState(false);
  const details = data.businessDetails || {};
  const [emailTouched, setEmailTouched] = useState(false);
  const phoneError = touched && businessDetailErrors(details).contact;
  const emailError = emailTouched && businessDetailErrors(details).email;

  useEffect(() => {
    fetch(`${RENTIFY_API_BASE}/api/stores/categories`)
      .then((response) => response.json())
      .then((result) => setCategories(result.data || []))
      .catch(() => setCategories([]));
  }, []);

  const update = (field, value) =>
    onUpdate({ businessDetails: { ...data.businessDetails, [field]: value } });

  return (
    <section className="max-w-[760px]">
      <SectionHeading
        title={t('onboarding.essentials.title')}
        description={t('onboarding.essentials.description')}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t('onboarding.essentials.name')} htmlFor="store-name" required full>
          <input
            id="store-name"
            value={details.name || ''}
            onChange={(event) => update('name', event.target.value)}
            placeholder={t('business.name.placeholder')}
            maxLength={120}
            autoComplete="organization"
            className={inputClass}
          />
        </Field>

        <Field label={t('onboarding.essentials.category')} htmlFor="store-category" required>
          <SelectField
            id="store-category"
            value={details.primaryCategory || ''}
            options={categories.map((category) => ({ value: category, label: category }))}
            placeholder={t('onboarding.essentials.categoryPlaceholder')}
            onChange={(value) => update('primaryCategory', value)}
          />
        </Field>

        <Field label={t('onboarding.essentials.location')} htmlFor="store-location" required>
          <SelectField
            id="store-location"
            value={details.location || ''}
            options={LOCATIONS.map((location) => ({ value: location, label: t(`business.location.${location}`) }))}
            placeholder={t('business.location.placeholder')}
            onChange={(value) => update('location', value)}
          />
        </Field>

        <Field
          label={t('onboarding.essentials.phone')}
          htmlFor="store-phone"
          required
          error={phoneError && t(phoneError)}
        >
          <div className="flex h-[52px] items-center sm:h-[54px] overflow-hidden rounded-xl border border-black/[0.1] bg-white transition focus-within:border-[#0071e3] focus-within:ring-4 focus-within:ring-[#0071e3]/10">
            <span className="flex h-full items-center border-r border-black/[0.08] bg-[#f5f5f7] px-3 text-[14px] text-[#6e6e73] sm:px-4">
              KH {PREFIX}
            </span>
            <input
              id="store-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={localPart(details.contact)}
              onChange={(event) => {
                const local = event.target.value;
                update('contact', local.trim() ? `${PREFIX} ${local}` : '');
              }}
              onBlur={() => setTouched(true)}
              placeholder="12 345 678"
              aria-invalid={Boolean(phoneError)}
              className="h-full min-w-0 flex-1 px-4 text-[15px] text-[#1d1d1f] outline-none placeholder:text-[#aeaeb2]"
            />
          </div>
        </Field>

        <Field
          label={t('onboarding.brand.email')}
          htmlFor="store-email"
          required
          error={emailError && t(emailError)}
        >
          <input
            id="store-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={details.email || ''}
            onChange={(event) => update('email', event.target.value)}
            onBlur={() => setEmailTouched(true)}
            placeholder={t('business.email.placeholder')}
            aria-invalid={Boolean(emailError)}
            className={inputClass}
          />
        </Field>
      </div>

      <NoteCard
        className="mt-8"
        icon={Lightbulb}
        title={t('onboarding.essentials.tipTitle')}
        body={t('onboarding.essentials.tipBody')}
      />
    </section>
  );
};

export default EssentialsStep;
