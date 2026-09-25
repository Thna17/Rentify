import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const setHeaders: Record<string, string> = {};

  try {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('rentify_token');
      if (token) {
        setHeaders['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch {}

  return next(
    request.clone({
      withCredentials: true,
      setHeaders,
    }),
  );
};
