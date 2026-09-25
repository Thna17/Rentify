import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useI18n } from '../i18n';
import { PATHS } from '../paths';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { EmptyState } from '../components/StatusMessage';

export default function NotFound() {
  const { t } = useI18n();
  useDocumentTitle(t('notFound.title'));
  return (
    <div className="store-container max-w-xl py-16">
      <EmptyState as="h1" icon={Compass} title={t('notFound.title')} body={t('notFound.body')}>
        <Link to={PATHS.HOME} className="btn-primary">
          {t('notFound.home')}
        </Link>
      </EmptyState>
    </div>
  );
}
