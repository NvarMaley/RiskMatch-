const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("The Sources view shows audited evidence in the selected language", async () => {
  const report = { innerHTML: "", textContent: "" };
  const button = { addEventListener() {} };
  const context = {
    document: { getElementById: id => id === "sources-report" ? report : button },
    window: { RM: { t: key => key, language: "fr" } }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../../apps/web/sources.js"), "utf8"), context);
  await context.window.SourcesView.load(async () => ({
    rows: [{ id: "FUTURES", name: "Futures", evidence: "Ten families", evidence_fr: "Dix familles" }]
  }));
  assert.match(report.innerHTML, /Dix familles/);
  context.window.RM.language = "en";
  context.window.SourcesView.render();
  assert.match(report.innerHTML, /Ten families/);
});

test("Local inventory counts and rights are shown in both languages", async () => {
  const el = {innerHTML: "", addEventListener() {}};
  const context = {document: {getElementById: () => el}, window: {RM: {t: k => k, language: "fr"}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../apps/web/sources.js"), "utf8"), context);
  await context.window.SourcesView.load(async () => ({rows: [], inventory: {available: true, files: 11, providers: 3}}));
  assert.match(el.innerHTML, /11 versions de fichiers, 3 groupes/);
  assert.match(el.innerHTML, /droits WRDS/);
  context.window.RM.language = "en";
  context.window.SourcesView.render();
  assert.match(el.innerHTML, /11 file versions, 3 source groups/);
});

test("Point-in-time quality panel displays blocked historical approval", async () => {
  const el = {innerHTML: "", addEventListener() {}};
  const context = {document: {getElementById: () => el}, window: {RM: {t: k => k, language: "fr"}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../apps/web/sources.js"), "utf8"), context);
  await context.window.SourcesView.load(async endpoint => endpoint === "snapshot" ?
    {approved: false, datasets: [{dataset:"fixture",rows:3,quality:{missing_return:1}}]} : {rows: []});
  assert.match(el.innerHTML, /Qualité et données historiques/);
  assert.match(el.innerHTML, /Rendement manquant: 1/);
  assert.match(el.innerHTML, /bloqués/);
  context.window.RM.language = "en";
  context.window.SourcesView.render();
  assert.match(el.innerHTML, /Missing return: 1/);
});
