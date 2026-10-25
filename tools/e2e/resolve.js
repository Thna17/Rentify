// tools/e2e/resolve.js - Resolves node_modules across workspaces for root tools

const path = require('node:path');
const fs = require('node:fs');

const ROOT_DIR = path.resolve(__dirname, '../..');

const CANDIDATE_DIRS = [
  path.resolve(ROOT_DIR, 'ecommerce-server/node_modules'),
  path.resolve(ROOT_DIR, 'rentify-server/node_modules'),
  path.resolve(ROOT_DIR, 'marketplace-frontend/node_modules'),
  path.resolve(ROOT_DIR, 'rentify-frontend/node_modules'),
  path.resolve(ROOT_DIR, 'admin-frontend/node_modules'),
  path.resolve(ROOT_DIR, 'node_modules'),
];

function findModule(subPath) {
  for (const dir of CANDIDATE_DIRS) {
    const candidate = path.resolve(dir, subPath);
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.resolve(CANDIDATE_DIRS[0], subPath);
}

function requireModule(subPath) {
  try {
    return require(findModule(subPath));
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return null;
    }
    throw err;
  }
}

module.exports = {
  ROOT_DIR,
  CANDIDATE_DIRS,
  findModule,
  requireModule,
};
