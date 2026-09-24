import { toast } from 'sonner';
import { useCallback } from 'react';

/**
 * Severity types for the snackbar
 */
type SnackbarSeverity = 'info' | 'success' | 'warning' | 'error';

/**
 * Custom hook to display snackbars/toasts
 * Wraps the `sonner` toast for consistent usage
 */
export function useSnackbar() {
  /**
   * Show a snackbar with message and optional severity
   * @param message - Message to display
   * @param severity - Severity type (info, success, warning, error)
   */
  const showSnackbar = useCallback((message: string, severity: SnackbarSeverity = 'info') => {
    if (severity === 'error') {
      toast.error(message);
    } else if (severity === 'success') {
      toast.success(message);
    } else if (severity === 'warning') {
      toast.warning(message);
    } else {
      toast.info(message);
    }
  }, []);

  return showSnackbar;
}
