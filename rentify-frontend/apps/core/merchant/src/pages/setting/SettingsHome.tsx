import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { PageShell, PageTitle } from '../../components/page/PagePrimitives';
import { SETTINGS_SECTIONS } from '../../layouts/setting/SettingsLayout';

/**
 * Settings (redesign M21). On phones this list is the page; from tablet width up the list sits
 * beside each section, so /settings opens the first one.
 */
export function SettingsHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.matchMedia?.('(min-width: 768px)').matches) navigate(SETTINGS_SECTIONS[0].path, { replace: true });
  }, [navigate]);

  return (
    <PageShell width="narrow">
      <PageTitle title={t('merchant.settings.title')} />
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        {SETTINGS_SECTIONS.map(({ key, path, icon: Icon }) => (
          <li key={key}>
            <Link to={path} className="flex min-h-[64px] items-center justify-between gap-3 p-4 hover:bg-muted/40">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground" aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{t(`merchant.settings.sections.${key}.title`)}</span>
                  <span className="block text-sm text-muted-foreground">{t(`merchant.settings.sections.${key}.body`)}</span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

export default SettingsHome;
