const test = require("node:test");
const assert = require("node:assert/strict");

const { WebsiteTemplate, TemplateContent } = require("../../src/models");
const admin = require("../../src/modules/admin/adminController");

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("template lookups only include associations that exist", async (t) => {
  const includes = [];
  t.mock.method(WebsiteTemplate, "findAll", async (options) => { includes.push(options.include); return []; });
  t.mock.method(WebsiteTemplate, "findByPk", async (_id, options) => { includes.push(options.include); return { id: "t1" }; });

  const list = response();
  await admin.getAllTemplates({}, list);
  const one = response();
  await admin.getTemplateById({ params: { id: "t1" } }, one);

  assert.equal(list.statusCode, 200);
  assert.equal(one.statusCode, 200);
  for (const include of includes) {
    assert.deepEqual(include, [TemplateContent]);
  }
});

test("creating a template with legacy colorPalettes does not fail", async (t) => {
  t.mock.method(WebsiteTemplate, "create", async (data) => ({ id: "t1", ...data }));
  t.mock.method(TemplateContent, "create", async (data) => data);

  const res = response();
  await admin.createTemplate({ body: { name: "Shop", colorPalettes: ["Ocean"], colorPalette: { primary: "#0071e3" } } }, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body.colorPalette, { primary: "#0071e3" });
});
