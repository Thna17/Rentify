/**
 * Base URL for the KhmerCraft API.
 *
 * Resolved at runtime rather than baked in, because the right value depends on
 * where the page is being served from:
 *
 *   localhost         → http://localhost:3001
 *   LAN (10.1.66.92)  → http://10.1.66.92:3001   — a phone or a colleague's
 *                       laptop must not be told to call *their* localhost,
 *                       which is what a hardcoded value did.
 *   tunnel / deployed → whatever `window.__KHMERCRAFT_API__` is set to, since
 *                       the API lives on a different host entirely.
 *
 * The override is read from a global so it can be injected by a <script> tag
 * in index.html at serve time, with no rebuild.
 *
 * TODO(deploy): replace the override with a proper Angular environment file
 * once there is a real build pipeline.
 */
declare global {
  interface Window {
    __KHMERCRAFT_API__?: string;
  }
}

const API_PORT = 3002;

const resolveBase = (): string => {
  const override = globalThis.window?.__KHMERCRAFT_API__;
  if (override) {
    return override.replace(/\/+$/, '');
  }

  const { protocol, hostname } = globalThis.location;
  return `${protocol}//${hostname}:${API_PORT}`;
};

export const API_BASE = resolveBase();

/** Auth is still mounted at /auth rather than /api/auth on the server. */
export const AUTH_URL = `${API_BASE}/auth`;
export const API_URL = `${API_BASE}/api`;
