const axios = require('axios');
const { RENTIFY_API_BASE } = require('../config/serviceUrls');
const cookieConfig = require('../config/cookieConfig');

const createVerifyCoreAdmin = ({ validate = (accessToken, refreshToken) => axios.post(
  `${RENTIFY_API_BASE}/api/auth/validate-token`, { accessToken, refreshToken },
) } = {}) => async (req, res, next) => {
  const authorization = req.headers?.authorization || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
  const accessToken = bearer || req.cookies?.userAccessToken;
  const refreshToken = req.cookies?.userRefreshToken;
  if (!accessToken && !refreshToken) return res.status(401).json({ error: 'Admin sign-in required' });
  let result;
  try { result = await validate(accessToken, refreshToken); }
  catch (_error) { return res.status(401).json({ error: 'Admin sign-in required' }); }
  if (!result.data?.valid || !result.data.entity?.id) {
    return res.status(401).json({ error: 'Admin sign-in required' });
  }
  if (result.data.entity.type !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.user = { id: result.data.entity.id, role: 'admin' };
  if (result.data.newAccessToken) res.cookie('userAccessToken', result.data.newAccessToken, {
    ...cookieConfig, maxAge: 15 * 60 * 1000,
  });
  return next();
};

module.exports = { verifyCoreAdmin: createVerifyCoreAdmin(), createVerifyCoreAdmin };
