const test = require("node:test");
const assert = require("node:assert/strict");

const { Website, WebsiteTemplate } = require("../../src/models");
const websiteService = require("../../src/modules/websites/websiteService");

const website = (paletteValue, templatePalette) => ({
  dataValues: {},
  WebsiteTemplate: { id: "t1", colorPalette: templatePalette },
  WebsiteContents: [{ label: "Color Palette", type: "palette", value: paletteValue }],
});

test("merchant website lookup only includes associations that exist", async (t) => {
  let include;
  t.mock.method(Website, "findOne", async (options) => { include = options.include; return website({ primary: "#111111" }); });

  const result = await websiteService.getUserWebsite("u1");

  assert.deepEqual(include, [{ model: WebsiteTemplate }, "WebsiteContents"]);
  assert.deepEqual(result.dataValues.colorPalette, { primary: "#111111" });
});

test("a named palette resolves to the template's palette", async (t) => {
  t.mock.method(Website, "findOne", async () => website("Ocean", { primary: "#0071e3", secondary: "#34c759" }));

  const result = await websiteService.getUserWebsite("u1");

  assert.deepEqual(result.dataValues.colorPalette, { primary: "#0071e3", secondary: "#34c759" });
});

test("a named palette falls back to the default when the template has none", async (t) => {
  t.mock.method(Website, "findOne", async () => website("Ocean", null));

  const result = await websiteService.getUserWebsite("u1");

  assert.deepEqual(result.dataValues.colorPalette, { primary: "#3B82F6", secondary: "#10B981" });
});
