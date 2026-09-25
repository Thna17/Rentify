const test = require('node:test');
const assert = require('node:assert/strict');
const { User } = require('../../src/models');
const { getMerchantCache } = require('../../src/utils/cache');
const { generateRefreshToken } = require('../../src/utils/jwtUtils');
const { refreshAccessToken } = require('../../src/middlewares/auth');
const refreshTokenHash = require('../../src/utils/refreshTokenHash');

const store = new Map();
const setup = (t, user) => {
  store.clear();
  const cache = getMerchantCache();
  t.mock.method(cache, 'set', async (key, value) => { store.set(key, value); return true; });
  t.mock.method(cache, 'get', async (key) => store.get(key) ?? null);
  t.mock.method(User, 'findOne', async () => user);
};
const response = () => ({
  cookies: {},
  statusCode: 200,
  cookie(name, value) { this.cookies[name] = value; },
  clearCookie(name) { this.cookies[name] = null; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('a request racing a just-rotated refresh token stays signed in without rotating again', async (t) => {
  process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';
  process.env.JWT_SECRET ||= 'test-secret';
  const oldToken = generateRefreshToken({ id: 'user-1', role: 'user' });
  const user = {
    id: 'user-1',
    role: 'user',
    refreshToken: await refreshTokenHash.hashRefreshToken(oldToken),
    refreshTokenExpires: new Date(Date.now() + 60_000),
    async save() {},
  };
  setup(t, user);

  // First request rotates the token.
  const first = response();
  let firstNext = false;
  await refreshAccessToken({ cookies: { userRefreshToken: oldToken } }, first, () => { firstNext = true; });
  assert.equal(firstNext, true);
  assert.ok(first.cookies.userRefreshToken);

  // A parallel request still carrying the old token.
  const second = response();
  let secondNext = false;
  const req = { cookies: { userRefreshToken: oldToken } };
  await refreshAccessToken(req, second, () => { secondNext = true; });
  assert.equal(secondNext, true);
  assert.ok(second.cookies.userAccessToken);
  assert.equal('userRefreshToken' in second.cookies, false);
  assert.equal(req.user.id, 'user-1');
});

test('an old refresh token outside the grace window is still rejected', async (t) => {
  const oldToken = generateRefreshToken({ id: 'user-1', role: 'user' });
  const user = {
    id: 'user-1',
    role: 'user',
    refreshToken: await refreshTokenHash.hashRefreshToken('some-other-token'),
    refreshTokenExpires: new Date(Date.now() + 60_000),
    async save() {},
  };
  setup(t, user);
  const res = response();
  await refreshAccessToken({ cookies: { userRefreshToken: oldToken } }, res, () => assert.fail('must not pass'));
  assert.equal(res.statusCode, 401);
  assert.equal(res.cookies.userRefreshToken, null);
});
