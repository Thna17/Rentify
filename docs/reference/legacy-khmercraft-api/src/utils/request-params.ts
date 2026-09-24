import { Request } from 'express';

/**
 * Read a route parameter as a single string.
 *
 * Express 5 types params as `string | string[]`, because a path can declare the
 * same name more than once. None of ours do, but the types are honest about
 * the possibility, so narrow it in one place rather than casting at every call
 * site — a stray `String(['a','b'])` would silently produce "a,b".
 */
export const param = (request: Request, name: string): string => {
  const value = request.params[name];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
};
