const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.resolve(__dirname,"../../apps/web/app.js"),"utf8");

test("Discovery consent, seed, response language and undo are scoped to the unlocked save",async()=>{
  const ids=new Map(), choices=["like","dislike","unsure","skip"].map(choice=>({dataset:{choice}}));
  const element=()=>({hidden:false,checked:false,innerHTML:"",textContent:"",dataset:{},classList:{toggle(){}},replaceChildren(){},addEventListener(){}});
  const $=id=>{if(!ids.has(id))ids.set(id,element());return ids.get(id);};
  const card={id:"L01",block_id:"lottery",block:"Lotteries",a:"A",b:"B",fr:{block:"Loteries",a:"A",b:"B"},reference_wealth:1000,currency:"CHF"};
  const calls=[];
  const ctx={crypto:{getRandomValues:a=>{a[0]=42;return a;}},window:{RM:{t:k=>k,language:"fr"},confirm:()=>true,MandateForm:{reset(){},restore(){}}},document:{body:{dataset:{}},getElementById:$,querySelectorAll:q=>q==="[data-choice]"?choices:[],dispatchEvent(){},addEventListener(){},createElement:element},Event:class{},fetch:async(url,opts)=>{calls.push([url,JSON.parse(opts.body)]);return{ok:true,json:async()=>url.endsWith("preview")?{status:"structurally_valid",horizon_years:10,effective_stress_limit:.1,demo_eligible:false}:({version:"discovery-v2.0.0",seed:42,currency:"CHF",cards:[card, {...card,id:"L02"}]})};}};
  vm.createContext(ctx);vm.runInContext(source,ctx);vm.runInContext('setSaveSession(true);mandate={currency:"CHF",capital:100,years:10,max_stress_loss:.1};fullMandate={currency:"CHF",capital:100};page("discovery")',ctx);
  await $("discovery-start").onclick();assert.equal(calls.length,0);
  $("discovery-consent-check").checked=true;
  await $("discovery-start").onclick();assert.equal(calls[0][0],"/api/discovery/session");assert.equal(calls[0][1].seed,42);
  await choices[0].onclick();
  let snapshot=vm.runInContext("simulationSnapshot()",ctx);
  assert.equal(snapshot.discoverySeed,42);assert.equal(snapshot.answers.L01,"like");assert.equal(snapshot.responseLocales.L01,"fr");assert.equal(snapshot.index,1);
  ctx.saved=JSON.parse(JSON.stringify(snapshot));vm.runInContext("clearSimulation()",ctx);
  await vm.runInContext("restoreSimulation(saved)",ctx);
  snapshot=vm.runInContext("simulationSnapshot()",ctx);assert.equal(snapshot.discoverySeed,42);assert.equal(snapshot.index,1);assert.equal(snapshot.responseLocales.L01,"fr");
  await $("back").onclick();snapshot=vm.runInContext("simulationSnapshot()",ctx);assert.equal(snapshot.index,0);assert.equal(Object.keys(snapshot.answers).length,0);
  await $("discovery-reset").onclick();snapshot=vm.runInContext("simulationSnapshot()",ctx);assert.equal(snapshot.discoverySeed,null);assert.equal(snapshot.discoveryConsent,false);assert.equal(snapshot.mandate.capital,100);
});
