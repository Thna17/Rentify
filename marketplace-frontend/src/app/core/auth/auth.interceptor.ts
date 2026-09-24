import { HttpInterceptorFn } from '@angular/common/http';

function getOrCreateSessionId(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    let id = localStorage.getItem('rentify_session_id');
    if (!id) {
      id = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('rentify_session_id', id);
    }
    return id;
  } catch {
    return null;
  }
}

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

  const sessionId = getOrCreateSessionId();
  if (sessionId) {
    setHeaders['X-Session-Id'] = sessionId;
  }

  return next(
    request.clone({
      withCredentials: true,
      setHeaders,
    }),
  );
};
