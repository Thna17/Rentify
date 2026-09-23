const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Core startup does not synchronize or alter schema", () => {
  const startup = fs.readFileSync(path.join(__dirname, "../../src/config/initDB.js"), "utf8");
  assert.doesNotMatch(startup, /\.sync\s*\(/);
  assert.match(fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8"), /db:migrate:verify/);
});
