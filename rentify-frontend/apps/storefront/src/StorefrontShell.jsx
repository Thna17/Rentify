import { Component, Suspense } from 'react';
import { useGetWebsiteByDomainQuery } from '@rentify/storefront/api';
import { templateFor } from './templates';

const MESSAGES = {
  en: {
    loading: 'Loading store…',
    missingTitle: 'This store isn’t available',
    missingBody: 'Check the address, or come back later if the store is still being set up.',
    errorTitle: 'We couldn’t open this store',
    errorBody: 'Please check your connection and try again.',
    retry: 'Try again',
  },
  kh: {
    loading: 'កំពុងបើកហាង…',
    missingTitle: 'មិនអាចចូលហាងនេះបានទេ',
    missingBody: 'សូមពិនិត្យអាសយដ្ឋាន ឬត្រឡប់មកវិញពេលក្រោយ ប្រសិនបើហាងកំពុងរៀបចំ។',
    errorTitle: 'យើងមិនអាចបើកហាងនេះបានទេ',
    errorBody: 'សូមពិនិត្យការតភ្ជាប់ ហើយព្យាយាមម្តងទៀត។',
    retry: 'ព្យាយាមម្តងទៀត',
  },
};

// Same storage key as the templates, so the shopper's language choice is kept.
const shopperLanguage = () => {
  try {
    return window.localStorage.getItem('appLanguage') === 'kh' ? 'kh' : 'en';
  } catch {
    return 'en';
  }
};

function Notice({ title, body, action }) {
  const language = shopperLanguage();
  return (
    <main className="shell-notice" lang={language === 'kh' ? 'km' : 'en'}>
      <h1>{title}</h1>
      <p>{body}</p>
      {action}
    </main>
  );
}

function Loading({ text }) {
  return (
    <div className="shell-loading" role="status">
      <span className="shell-spinner" aria-hidden="true" />
      <span className="shell-sr">{text}</span>
    </div>
  );
}

/** Shows a retry notice if a template chunk fails to download. */
class TemplateBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    const t = MESSAGES[shopperLanguage()];
    if (!this.state.failed) return this.props.children;
    return (
      <Notice
        title={t.errorTitle}
        body={t.errorBody}
        action={
          <button type="button" onClick={() => window.location.reload()}>
            {t.retry}
          </button>
        }
      />
    );
  }
}

/**
 * Finds the store for this address and hands over to its template. The
 * template's own website provider reuses the same cached lookup.
 */
export function StorefrontShell({ host = window.location.host }) {
  const t = MESSAGES[shopperLanguage()];
  const { data, isLoading, isError, error, refetch } = useGetWebsiteByDomainQuery(host, { skip: !host });

  if (isLoading) return <Loading text={t.loading} />;

  if (isError && error?.status !== 404) {
    return (
      <Notice
        title={t.errorTitle}
        body={t.errorBody}
        action={
          <button type="button" onClick={refetch}>
            {t.retry}
          </button>
        }
      />
    );
  }

  const Template = templateFor(data);
  if (!Template) return <Notice title={t.missingTitle} body={t.missingBody} />;

  return (
    <TemplateBoundary>
      <Suspense fallback={<Loading text={t.loading} />}>
        <Template />
      </Suspense>
    </TemplateBoundary>
  );
}
