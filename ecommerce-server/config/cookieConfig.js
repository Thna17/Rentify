const resolveCookieDomain = () => {
  const envDomain = process.env.COOKIE_DOMAIN;
  if (envDomain) {
    if (process.env.NODE_ENV === 'production' && /rentifystore\.shop$/i.test(envDomain.trim())) {
      throw new Error(`COOKIE_DOMAIN cannot be set to hosted storefront parent "${envDomain}" in production (cross-storefront session leakage risk)`);
    }
    return envDomain;
  }
  return undefined;
};

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  domain: resolveCookieDomain(),
  secure: isProduction,
  sameSite: process.env.COOKIE_SAMESITE || 'Lax',
  httpOnly: true,
  path: '/',
};
