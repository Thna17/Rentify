const resolveCookieDomain = () => {
  const envDomain = process.env.COOKIE_DOMAIN;
  if (envDomain) return envDomain;
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }
  return undefined;
};

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  domain: resolveCookieDomain(),
  secure: isProduction,
  sameSite: isProduction ? 'None' : 'Lax',
  httpOnly: true,
  path: '/',
};
