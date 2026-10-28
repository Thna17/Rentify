import React, { useEffect, useState } from 'react';
import { Bell, Store } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { useChannels } from '../../context/ChannelContext';

const copy = {
  en: { title: 'Preferences', description: 'Manage your sales channels and notifications', channels: 'Sales channels',
    pos: 'Point of sale', marketplace: 'Marketplace', notifications: 'Notification settings',
    info: 'Security, legal and essential transaction notices always appear in your inbox. External delivery depends on provider availability.',
    optional: 'Optional updates', email: 'Email', telegram: 'Telegram', locale: 'Notification language',
    loading: 'Loading preferences…', error: 'Preferences could not be loaded or saved.', retry: 'Try again', save: 'Save preferences', saving: 'Saving…', saved: 'Preferences saved.' },
  km: { title: 'ចំណូលចិត្ត', description: 'គ្រប់គ្រងបណ្ដាញលក់ និងសេចក្ដីជូនដំណឹង', channels: 'បណ្ដាញលក់',
    pos: 'ចំណុចលក់', marketplace: 'ផ្សាររួម', notifications: 'ការកំណត់សេចក្ដីជូនដំណឹង',
    info: 'សេចក្ដីជូនដំណឹងសុវត្ថិភាព ច្បាប់ និងប្រតិបត្តិការសំខាន់តែងតែបង្ហាញក្នុងប្រអប់សារ។ ការផ្ញើខាងក្រៅអាស្រ័យលើអ្នកផ្ដល់សេវា។',
    optional: 'ព័ត៌មានស្រេចចិត្ត', email: 'អ៊ីមែល', telegram: 'តេឡេក្រាម', locale: 'ភាសាសេចក្ដីជូនដំណឹង',
    loading: 'កំពុងផ្ទុកចំណូលចិត្ត…', error: 'មិនអាចផ្ទុក ឬរក្សាទុកចំណូលចិត្តបានទេ។', retry: 'ព្យាយាមម្ដងទៀត', save: 'រក្សាទុកចំណូលចិត្ត', saving: 'កំពុងរក្សាទុក…', saved: 'បានរក្សាទុកចំណូលចិត្ត។' },
};
type Preferences = { locale: 'en' | 'km'; optionalEnabled: boolean; emailEnabled: boolean; telegramEnabled: boolean };

export const PreferencesSetting = () => {
  const { language } = useTranslation() as { language?: string };
  const text = copy[language === 'kh' ? 'km' : 'en'];
  const { hasPos, hasMarketplace, togglePos, toggleMarketplace } = useChannels();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  const request = async (method: 'GET' | 'PUT', body?: Preferences) => {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${RENTIFY_API_BASE}/api/notifications/preferences`, { method, credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
      if (!response.ok) throw new Error('Request failed');
      return (await response.json()).data as Preferences;
    } finally { clearTimeout(timer); }
  };
  const load = async () => { setLoading(true); setError(false); try { setPrefs(await request('GET')); } catch { setError(true); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!prefs) return;
    setSaving(true); setError(false); setSaved(false);
    try { const { locale, optionalEnabled, emailEnabled, telegramEnabled } = prefs;
      setPrefs(await request('PUT', { locale, optionalEnabled, emailEnabled, telegramEnabled })); setSaved(true);
    } catch { setError(true); } finally { setSaving(false); }
  };
  const check = (id: string, label: string, value: boolean, change: (value: boolean) => void) => (
    <label htmlFor={id} className="flex items-center gap-3 py-3 text-sm">
      <input id={id} type="checkbox" checked={value} onChange={(event) => change(event.target.checked)} />{label}
    </label>
  );
  return <SettingsLayout title={text.title} description={text.description} icon={<Bell />}>
    <Card><CardHeader><CardTitle className="flex gap-2"><Store className="h-5 w-5" />{text.channels}</CardTitle></CardHeader>
      <CardContent>{check('pos-channel', text.pos, hasPos, togglePos)}{check('marketplace-channel', text.marketplace, hasMarketplace, toggleMarketplace)}</CardContent></Card>
    <Card><CardHeader><CardTitle>{text.notifications}</CardTitle><CardDescription>{text.info}</CardDescription></CardHeader>
      <CardContent aria-live="polite">
        {loading && <p>{text.loading}</p>}
        {error && <div role="alert" className="mb-3 text-sm">{text.error} <button className="underline" type="button" onClick={load}>{text.retry}</button></div>}
        {prefs && <>
          {check('optional-notices', text.optional, prefs.optionalEnabled, (value) => setPrefs({ ...prefs, optionalEnabled: value }))}
          {check('email-notices', text.email, prefs.emailEnabled, (value) => setPrefs({ ...prefs, emailEnabled: value }))}
          {check('telegram-notices', text.telegram, prefs.telegramEnabled, (value) => setPrefs({ ...prefs, telegramEnabled: value }))}
          <label htmlFor="notification-locale" className="block py-3 text-sm">{text.locale}
            <select id="notification-locale" className="ml-3 rounded border p-2" value={prefs.locale} onChange={(event) => setPrefs({ ...prefs, locale: event.target.value as 'en' | 'km' })}>
              <option value="en">English</option><option value="km">ខ្មែរ</option>
            </select>
          </label>
          <Button disabled={saving} onClick={save}>{saving ? text.saving : text.save}</Button>
          {saved && <p role="status" className="mt-2 text-sm">{text.saved}</p>}
        </>}
      </CardContent></Card>
  </SettingsLayout>;
};
export default PreferencesSetting;
