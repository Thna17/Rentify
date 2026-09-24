import { useTranslation } from '@rentify/utils';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../card';

export function AuthenticationRequired() {
  const { t } = useTranslation();
  const returnUrl = typeof window !== 'undefined' ? window.location.href : '';
  const authBase = (typeof __AUTH__URL__ !== 'undefined' && __AUTH__URL__ ? __AUTH__URL__ : 'http://localhost:4300').replace(/\/+$/, '');
  const loginUrl = `${authBase}/login?returnUrl=${encodeURIComponent(returnUrl)}`;

  const title = t('dashboard.auth_required.title');
  const description = t('dashboard.auth_required.description');
  const loginText = t('dashboard.auth_required.login');

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md shadow-lg border border-border">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold mt-2">
            {title && title !== 'dashboard.auth_required.title' ? title : 'Authentication Required'}
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            {description && description !== 'dashboard.auth_required.description'
              ? description
              : 'Please sign in to access your merchant dashboard.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => window.location.assign(loginUrl)} className="w-full">
            {loginText && loginText !== 'dashboard.auth_required.login' ? loginText : 'Sign In to Dashboard'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
