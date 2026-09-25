import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { PATHS } from '../paths';

const CartFeedbackContext = createContext({ notify: () => undefined });

/**
 * Short, non-blocking confirmation after cart actions. Rendered in a polite
 * live region so screen readers announce it without moving focus.
 */
export function CartFeedbackProvider({ children }) {
  const { t } = useI18n();
  const [message, setMessage] = useState(null);
  const timer = useRef();

  const dismiss = useCallback(() => setMessage(null), []);
  const notify = useCallback((next) => {
    window.clearTimeout(timer.current);
    setMessage({ ...next, key: Date.now() });
    timer.current = window.setTimeout(() => setMessage(null), next.tone === 'error' ? 7000 : 4000);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ notify }), [notify]);
  const isError = message?.tone === 'error';

  return (
    <CartFeedbackContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 pb-safe sm:justify-end sm:px-6 md:bottom-0"
      >
        {message && (
          <div
            key={message.key}
            className="pointer-events-auto flex w-full max-w-sm items-start motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 gap-3 rounded-xl border border-border bg-card p-3.5 text-sm shadow-lg"
          >
            {isError ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{message.text}</p>
              {!isError && (
                <Link to={PATHS.CART} onClick={dismiss} className="mt-1 inline-block font-semibold text-primary underline-offset-2 hover:underline">
                  {t('cart.view')}
                </Link>
              )}
            </div>
            <button type="button" onClick={dismiss} className="-m-1 rounded p-1 text-muted-foreground hover:text-foreground" aria-label={t('cart.dismiss')}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </CartFeedbackContext.Provider>
  );
}

export const useCartFeedback = () => useContext(CartFeedbackContext);
