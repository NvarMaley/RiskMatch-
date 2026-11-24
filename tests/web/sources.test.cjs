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

test("Return coverage distinguishes price and total returns", async () => {
  const el = {innerHTML: "", addEventListener() {}};
  const context = {document: {getElementById: () => el}, window: {RM: {t: k => k, language: "fr"}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../apps/web/sources.js"), "utf8"), context);
  await context.window.SourcesView.load(async endpoint => endpoint === "returns" ?
    {approved:false,datasets:[{dataset:"fixture",rows:4,price_returns:3,total_returns:0,chf_price_returns:2,chf_total_returns:0}]} : {rows:[]});
  assert.match(el.innerHTML,/06 · Rendements et devises/);
  assert.match(el.innerHTML,/3 \/ 0/);
  assert.match(el.innerHTML,/75%/);
  context.window.RM.language="en";
  context.window.SourcesView.render();
  assert.match(el.innerHTML,/06 · Returns and FX/);
});

test("Universe research renders the asset library and opens an explained statistical profile", async () => {
  const elements=new Map();
  const defaults={"research-start":"2025-01-01","research-end":"2025-01-02","research-currency":"USD","research-kind":"total_return"};
  const get=id=>{if(!elements.has(id))elements.set(id,{innerHTML:"",value:defaults[id]||"",querySelectorAll(){return [];},scrollIntoView(){}});return elements.get(id);};
  const context={document:{getElementById:get},window:{RM:{t:k=>k,language:"fr"}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../../apps/web/asset-research.js"),"utf8"), context);
  await context.window.AssetResearch.load(async endpoint=>{
    if(endpoint==="statistics/catalog")return {items:[{id:"asset-a",name:"Asset A",ticker:"A",category:"equity_etf",provider:"Fixture source",series:[{source:"listed_daily",instrument:"A",frequency:"daily",kinds:["total_return"],first:"2025-01-01",last:"2025-01-02"}]},{id:"asset-b",name:"Asset B",ticker:"B",category:"stock",provider:"Fixture source",series:[]}]};
    if(endpoint==="statistics/compare")return {assets:[{source:"listed_daily",instrument:"A",statistics:{count:2,missing:0,mean:.01},distribution:{histogram:[],cdf:[],qq:[]}}],matrix:{count:2,psd:true,covariance:[[.01]],pearson:[[1]],spearman:[[1]]},frequency:"daily",currency:"USD"};
    return {rows:[]};
  },"2025-01-02");
  assert.match(get("universe-statistics").innerHTML,/Catalogue/);
  assert.match(get("universe-statistics").innerHTML,/Asset A/);
  assert.doesNotMatch(get("universe-statistics").innerHTML,/classement local|3'658/);
  await context.window.AssetResearch.open("asset-a");
  assert.match(get("universe-statistics").innerHTML,/Retour au catalogue/);
  assert.match(get("universe-statistics").innerHTML,/Moyenne arithmétique/);
  assert.match(get("universe-statistics").innerHTML,/1.00%/);
  assert.match(get("universe-statistics").innerHTML,/Dépendance temporelle/);
  assert.doesNotMatch(get("universe-statistics").innerHTML,/catalog-card/);
  await context.window.AssetResearch.open("asset-b");
  assert.match(get("universe-statistics").innerHTML,/Aucune série statistique exploitable/);
});
