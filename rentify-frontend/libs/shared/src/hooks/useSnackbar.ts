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
    toast({
      title: severity.charAt(0).toUpperCase() + severity.slice(1), // Capitalize first letter
      description: message,
      variant: severity === 'error' ? 'destructive' : 'default', // Map error to destructive variant
    });
  }, []);

  return showSnackbar;
}
