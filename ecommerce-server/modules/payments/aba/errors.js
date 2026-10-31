// Small local helpers so this module never reaches into another module's internals
function fail(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.status = statusCode;
  if (code) error.code = code;
  throw error;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuid(value, label) {
  if (typeof value !== 'string' || !UUID.test(value)) fail(`Invalid ${label} id`);
  return value;
}

module.exports = { fail, uuid };
