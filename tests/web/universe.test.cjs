const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
test("Universe filters coverage and shows explicit exclusions without selecting assets",async()=>{
  const ids=new Map();const $=id=>{if(!ids.has(id))ids.set(id,{value:"",textContent:"",innerHTML:"",addEventListener(k,fn){this[k]=fn;}});return ids.get(id);};
  $("universe-class").value="all";$("universe-availability").value="all";
  const ctx={document:{getElementById:$},window:{RM:{t:k=>k,language:"en"}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.resolve(__dirname,"../../apps/web/universe.js"),"utf8"),ctx);
  const common={name:"Test",sector:"Test",inception:"2000-01-01",listing_date:null,benchmark:"Index",eligible:false,reasons:["market_data_not_validated"],source:"https://example.com",investability:null};
  await ctx.window.UniverseView.load(async()=>({rows:[{...common,ticker:"SPY",asset_class:"equity_etf",coverage:{status:"observed",missing_fraction:.25,observed:3,source_grid_sessions:4}},{...common,ticker:"IEF",asset_class:"treasury_etf",coverage:null}],eligible_count:0,risk_free:{reference:"FRED:DTB3",status:"not_observed"},version:"fixture",source_status:"observed_local_unvalidated",as_of:"2026-11-24",metadata_reviewed_on:"2026-11-24"}));
  assert.match($("universe-report").innerHTML,/75%/);assert.match($("universe-report").innerHTML,/market_data_not_validated/);
  $("universe-class").value="treasury_etf";ctx.window.UniverseView.render();assert.match($("universe-report").innerHTML,/<b>IEF<\/b>/);assert.doesNotMatch($("universe-report").innerHTML,/<b>SPY<\/b>/);
  $("universe-availability").value="observed";ctx.window.UniverseView.render();assert.match($("universe-report").innerHTML,/universeNoResults/);
});
