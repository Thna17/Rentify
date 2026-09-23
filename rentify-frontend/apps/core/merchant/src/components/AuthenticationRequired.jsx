import { useTranslation } from '@rentify/utils';
import { AlertCircle } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';

export function AuthenticationRequired() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <AlertCircle className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">
            {t('dashboard.auth_required.title')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.auth_required.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => window.location.assign(__AUTH__URL__)} className="w-full">
            {t('dashboard.auth_required.login')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
