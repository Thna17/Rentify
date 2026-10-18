import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './auth.service';

describe('marketplace apiErrorMessage', () => {
  it('parses standard error envelope correctly', () => {
    const errorResponse = new HttpErrorResponse({
      error: {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Sign-in required to continue',
          fieldErrors: [],
          retryable: false,
          correlationId: 'test-cid-1234',
        },
        message: 'Sign-in required to continue',
        success: false,
        statusCode: 401,
        correlationId: 'test-cid-1234',
      },
      status: 401,
    });
    expect(apiErrorMessage(errorResponse)).toBe('Sign-in required to continue');
  });

  it('parses legacy Core error format correctly', () => {
    const legacyError = new HttpErrorResponse({
      error: { message: 'Invalid credentials provided' },
      status: 401,
    });
    expect(apiErrorMessage(legacyError)).toBe('Invalid credentials provided');
  });

  it('falls back to default message when error format is unfamiliar', () => {
    expect(apiErrorMessage(new Error('Unknown network glitch'), 'Custom fallback')).toBe('Custom fallback');
  });
});
