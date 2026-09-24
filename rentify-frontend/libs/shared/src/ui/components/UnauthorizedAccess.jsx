import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';


export function UnauthorizedAccess({ requiredPermission, currentFeature }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Lock className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">
            {t('dashboard.unauthorized.title') && t('dashboard.unauthorized.title') !== 'dashboard.unauthorized.title' ? t('dashboard.unauthorized.title') : 'Access Restricted'}
          </CardTitle>
          <CardDescription>
            {t('dashboard.unauthorized.description') && t('dashboard.unauthorized.description') !== 'dashboard.unauthorized.description' ? t('dashboard.unauthorized.description') : 'You do not have permission to access this page.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requiredPermission && (
            <p className="text-sm text-muted-foreground">
              {t('dashboard.unauthorized.required_permission')}:{' '}
              <strong>{requiredPermission}</strong>
            </p>
          )}
          {currentFeature && (
            <p className="text-sm text-muted-foreground">
              {t('dashboard.unauthorized.required_feature')}:{' '}
              <strong>{currentFeature}</strong>
            </p>
          )}
          <Button
            onClick={() => navigate('/dashboard/overview')}
            className="w-full"
          >
            {t('dashboard.unauthorized.back_to_dashboard') && t('dashboard.unauthorized.back_to_dashboard') !== 'dashboard.unauthorized.back_to_dashboard' ? t('dashboard.unauthorized.back_to_dashboard') : 'Back to Dashboard'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}