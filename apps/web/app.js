const $ = id => document.getElementById(id);
const t = key => window.RM.t(key);
let mandate = null, cards = [], answers = {}, index = 0, portfolios = [], swipes = [], shortlist = [];
let fullMandate = null, mandateReport = null, pendingMandate = null, pendingReport = null;
let discoverySeed=null, discoveryVersion=null, discoveryCurrency="USD", discoveryConsent=false, responseLocales={}, discoveryConfidence=null;
let activePage = "saves", lastSimulationPage = "home", scoreReport = null, errorKey = "";
let sessionUnlocked = false, sessionEpoch = 0;
function setSaveSession(open) {
  sessionEpoch++;
  sessionUnlocked=Boolean(open);
  if(!open)window.GoalsView?.clear();
  if(!open)window.BaselinesView?.clear();
  if(!open)window.MeanVarianceView?.clear();
  if(!open)window.BlackLittermanView?.clear();
  if(!open)window.HierarchicalView?.clear();
  if(!open)window.DownsideView?.clear();
  if(!open)window.AdvancedView?.clear();
  if(!open)window.LongOnlyView?.clear();
  if(!open)window.AlternativeView?.clear();
  document.body.dataset.session=sessionUnlocked?"unlocked":"locked";
  $("studio-nav").hidden=!sessionUnlocked;
}
function changed(){if(sessionUnlocked)document.dispatchEvent(new Event("riskmatch:changed"));}
const confirmed = new Set();
const pct = x => (100*x).toFixed(1) + "%";
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
async function api(path, data) {
  const epoch=sessionEpoch;
  let response;
  try { response = await fetch('/api/'+path, data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); }
  catch { throw Error("networkError"); }
  const result = await response.json().catch(() => { throw Error("networkError"); });
  if(epoch!==sessionEpoch)throw Error("sessionChanged");
  if (!response.ok) throw Error(result.error);
  return result;
}
const handle = fn => async (...args) => {
  try { errorKey = ""; $("error").textContent = ""; await fn(...args); }
  catch (e) { if(e.message==="sessionChanged")return; errorKey = e.message; $("error").textContent = diagnostic(errorKey); }
};
function page(name) {
  if(!sessionUnlocked && name!=="saves")name="saves";
  activePage = name;
  if(name!=="saves")lastSimulationPage=name;
  document.querySelectorAll(".page").forEach(x => x.hidden = x.id!==name);
  document.querySelectorAll("[data-page]").forEach(x => x.classList.toggle("active", x.dataset.page===name));
  if (name==="compare") compare();
  if (name==="compare")window.BaselinesView?.mount(api,mandate?.currency);
  if (name==="compare")window.MeanVarianceView?.mount(api,fullMandate);
  if (name==="compare")window.BlackLittermanView?.mount(api,fullMandate);
  if (name==="compare")window.HierarchicalView?.mount(api,fullMandate);
  if (name==="compare")window.DownsideView?.mount(api,fullMandate);
  if (name==="compare")window.AdvancedView?.mount(api,fullMandate);
  if (name==="compare")window.LongOnlyView?.mount(api,fullMandate);
  if (name==="compare")window.AlternativeView?.mount(api,fullMandate);
  if (name==="mandate") window.GoalsView?.mount(fullMandate,api);
  if (name==="saves") document.dispatchEvent(new Event("riskmatch:saves"));
  changed();
}
document.querySelectorAll("[data-page]").forEach(button => button.onclick = handle(async () => {
  if(!sessionUnlocked)throw Error("saveRequired");
  if (button.dataset.page==="explore" && !mandate) throw Error("mandateRequired");
  if (button.dataset.page==="explore" && fullMandate && !mandateReport?.demo_eligible) throw Error("demoUnavailable");
  page(button.dataset.page);
  if (activePage==="explore") await loadPortfolios();
  if (activePage==="universe") await window.UniverseView.load(api);
  if (activePage==="sources") await window.SourcesView.load(api);
  if (activePage==="discovery") {
    await showCard();
  }
}));
$("form").onsubmit = handle(async event => {
  event.preventDefault();
  if(!sessionUnlocked)throw Error("saveRequired");
  const payload=window.MandateForm.payload();
  const report=await api("mandate/preview",payload);
  if(JSON.stringify(payload)!==JSON.stringify(window.MandateForm.payload()))return;
  pendingMandate=payload;pendingReport=report;renderMandateReport();
  $("mandate-report").scrollIntoView({behavior:"smooth",block:"start"});
});
const diagnostic=key=>{const [head,...tail]=key.split(":");return t(head)+(tail.length?": "+t(tail.join(":")):"");};
const money=(amount,currency)=>amount===null||amount===undefined?t("noValue"):new Intl.NumberFormat(window.RM.language==="fr"?"fr-CH":"en-US",{style:"currency",currency,maximumFractionDigits:0}).format(amount);
function renderMandateReport(){
  if(!pendingReport)return;
  const r=pendingReport, p=pendingMandate, area=$("mandate-report");
  const cash=v=>money(v,r.currency), result=x=>x?.annual_return===null||x?.annual_return===undefined?t(x?.status||"noValue"):pct(x.annual_return);
  const stats=[["netWorth",cash(r.net_worth)],["investableWealth",cash(r.investable_wealth)],["monthlySurplus",cash(r.monthly_surplus)],["nextWithdrawal",r.next_withdrawal||t("noValue")],["loss_capacity_amount",cash(r.loss_capacity_amount)],["nearTermCushion",cash(r.near_term_liquidity_cushion)],["effectiveStress",pct(r.effective_stress_limit)],["zeroReturnBalance",cash(r.zero_return_min_balance)],["combinedReturn",result(r.combined_required_return)]];
  let comparison="";
  if(mandateReport)comparison=`<h3>${esc(t("compareBefore"))}</h3><p>${esc(t("effectiveStress"))}: ${pct(mandateReport.effective_stress_limit)} → ${pct(r.effective_stress_limit)} · ${esc(t("goalCount"))}: ${mandateReport.goals.length} → ${r.goals.length} · ${esc(t("capital"))}: ${esc(money(fullMandate.capital,fullMandate.currency))} → ${esc(cash(p.capital))}</p><p>${esc(t("mandateGoals"))}: ${esc(mandateReport.goals.map(g=>`${t(g.objective_id)} (${g.due_date}, ${money(g.target_nominal_base,mandateReport.currency)})`).join(" · "))} → ${esc(r.goals.map(g=>`${t(g.objective_id)} (${g.due_date}, ${cash(g.target_nominal_base)})`).join(" · "))}</p>`;
  const messages=(items,cls)=>items.map(k=>`<p class="${cls}">• ${esc(diagnostic(k))}</p>`).join("");
  area.innerHTML=`<article><h2>${esc(t("mandateReport"))}</h2><p class="mandate-status ${r.conflicts.length?"mandate-conflict":""}">${esc(t(r.conflicts.length?"structuralConflicts":"structuralValid"))}</p><div class="mandate-summary">${stats.map(([k,v])=>`<div><span>${esc(t(k))}</span><b>${esc(v)}</b></div>`).join("")}</div>${comparison}<h3>${esc(t("mandateGoals"))}</h3>${r.goals.map(g=>`<div class="mandate-row mandate-goal"><b>${esc(t(g.objective_id))} · ${esc(g.due_date)}</b><p>${esc(t("goal_amount"))}: ${esc(cash(g.target_nominal_base))} · ${esc(t("requiredReturn"))}: ${esc(result(g.required_return))} · ${esc(t("zeroReturnGap"))}: ${esc(cash(g.zero_return_gap))}</p></div>`).join("")}${messages(r.conflicts,"mandate-conflict")}${messages(r.warnings,"muted")}${messages(r.demo_reasons,"muted")}<p class="muted">${esc(t("riskNotMeasured"))}</p><button id="confirm-mandate" class="primary" ${r.conflicts.length?"disabled":""}>${esc(t("confirmMandate"))}</button></article>`;
  area.hidden=false;
  $("confirm-mandate").onclick=handle(confirmMandate);
}
async function confirmMandate(){
  if(!sessionUnlocked||!pendingReport||pendingReport.status!=="structurally_valid"||$("mandate-report").hidden)throw Error("mandateRequired");
  if(JSON.stringify(pendingMandate)!==JSON.stringify(window.MandateForm.payload()))throw Error("mandateRequired");
  fullMandate=pendingMandate;mandateReport=pendingReport;pendingMandate=null;pendingReport=null;
  mandate={capital:fullMandate.capital,years:mandateReport.horizon_years,max_stress_loss:mandateReport.effective_stress_limit,currency:fullMandate.currency};
  portfolios=[]; swipes=[]; shortlist=[]; confirmed.clear(); resetDiscovery();
  $("mandate-report").hidden=true;
  changed();page("discovery");await showCard();changed();
}
function resetDiscovery(){cards=[];answers={};index=0;scoreReport=null;discoverySeed=null;discoveryVersion=null;discoveryConsent=false;responseLocales={};discoveryConfidence=null;discoveryCurrency=mandate?.currency||"USD";$("discovery-consent-check").checked=false;}
$("discovery-start").onclick=handle(async()=>{
  if(!sessionUnlocked||!mandate)throw Error("mandateRequired");
  if(!$("discovery-consent-check").checked)throw Error("discoveryConsentRequired");
  const seed=crypto.getRandomValues(new Uint32Array(1))[0], currency=mandate.currency;
  const session=await api("discovery/session",{seed,currency});
  discoverySeed=seed;discoveryCurrency=currency;discoveryVersion=session.version;discoveryConsent=true;cards=session.cards;answers={};responseLocales={};index=0;scoreReport=null;discoveryConfidence=null;
  changed();await showCard();
});
$("discovery-reset").onclick=handle(async()=>{if(!sessionUnlocked||!discoveryConsent)return;if(!window.confirm(t("withdrawDiscoveryConfirm")))return;resetDiscovery();changed();await showCard();});
async function discoveryScore(){return discoveryVersion?api("discovery/score",{seed:discoverySeed,currency:discoveryCurrency,answers,confidence:discoveryConfidence,locales:responseLocales}):api("score",answers);}
async function showCard() {
  $("discovery-consent").hidden=!mandate||discoveryConsent||cards.length>0;
  $("discovery-question").hidden=!discoveryConsent&&!cards.length;
  $("back").hidden=!cards.length;
  $("discovery-reset").hidden=!cards.length;
  const card = cards[index];
  $("actions").hidden=!card; $("back").disabled=index===0; $("result").replaceChildren();
  if(!mandate){
    $("card").replaceChildren();
    $("discovery-question").hidden=true;
    $("actions").hidden=true;
    $("back").hidden=true;
    $("discovery-reset").hidden=true;
    $("result").innerHTML='<article><h2>'+esc(t("mandateRequired"))+'</h2><button id="discovery-go-mandate" class="primary">'+esc(t("navMandate"))+' →</button></article>';
    $("discovery-go-mandate").onclick=()=>page("mandate");
    return;
  }
  if (!card) {
    $("card").replaceChildren();
    if (!cards.length) return;
    if (!scoreReport) scoreReport=await discoveryScore();
    const r=scoreReport;
    const dimensions=r.dimensions?`<div class="mandate-summary discovery-summary">${Object.entries(r.dimensions).map(([key,v])=>`<div><b>${esc(t(key))}</b><p>${v.canonical_b_fraction===null?esc(t("noValue")):pct(v.canonical_b_fraction)} · ${v.answered}/${v.total}</p><small>${esc(t(key+"_explain"))}</small></div>`).join("")}</div>`:"";
    const confidence=r.dimensions?`<label><span>${esc(t("confidenceOptional"))}</span><select id="discovery-confidence"><option value="">${esc(t("noValue"))}</option>${[1,2,3,4,5].map(v=>`<option value="${v}" ${v===discoveryConfidence?"selected":""}>${v}/5</option>`).join("")}</select></label>`:"";
    const audit=r.dimensions?`<p>${esc(t("coverage"))}: ${r.answered}/${r.total_scored} · ${esc(t("unsure"))}: ${r.counts.unsure} · ${esc(t("skip"))}: ${r.counts.skip} · ${esc(t("inconsistencies"))}: ${r.inconsistencies.length}/${r.pairs_checked} · ${esc(t("framingDifferences"))}: ${r.framing_differences.length}/${r.framing_pairs_checked}</p><p class="muted">${esc(t("scoreMethod"))}</p>`:"<p>"+esc(t("inconsistencies"))+": "+r.inconsistencies.length+"</p>";
    $("result").innerHTML='<article><h2>'+esc(r.score===null?t("scoreUnavailable"):r.score+" / 30")+'</h2><p>'+esc(t("scoreExplanation"))+' '+esc(t("coverage"))+': '+pct(r.coverage)+'. '+esc(t("sensitivity"))+': '+r.sensitivity.join("–")+'. '+esc(t("scoreLimit"))+'</p>'+audit+dimensions+confidence+'<p class="muted">'+esc(t("discoverySeparate"))+'</p><button class="primary" id="next">'+esc(t("exploreAllocations"))+'</button></article>';
    if(r.dimensions)$("discovery-confidence").onchange=handle(async event=>{discoveryConfidence=event.target.value?Number(event.target.value):null;scoreReport=null;changed();await showCard();});
    $("next").onclick=handle(async()=>{if(!mandate)throw Error("mandateRequired");if(fullMandate&&!mandateReport?.demo_eligible)throw Error("demoUnavailable");page("explore");await loadPortfolios();});
    return;
  }
  $("discovery-question").hidden=false;
  const c=window.RM.language==="fr"?card.fr:card;
  const reference=["lottery","framing","consistency"].includes(card.block_id)?`<p class="muted">${esc(t("referenceWealth"))}: ${esc(money(card.reference_wealth,card.currency))}</p>`:"";
  $("card").innerHTML='<article class="card"><p>'+esc(c.block)+' · '+(index+1)+' / '+cards.length+'</p><div class="bar"><i style="width:'+100*index/cards.length+'%"></i></div>'+reference+'<div class="options"><div><b>B</b><p>'+esc(c.b)+'</p></div><div><b>A</b><p>'+esc(c.a)+'</p></div></div></article>';
}
document.querySelectorAll("[data-choice]").forEach(b=>b.onclick=handle(async()=>{if(sessionUnlocked&&index<cards.length){const id=cards[index++].id;answers[id]=b.dataset.choice;responseLocales[id]=window.RM.language;scoreReport=null;changed();await showCard();}}));
$("back").onclick=handle(async()=>{if(sessionUnlocked&&index){const id=cards[--index].id;delete answers[id];delete responseLocales[id];scoreReport=null;discoveryConfidence=null;changed();await showCard();}});
document.addEventListener("keydown",e=>{if(!sessionUnlocked||activePage!=="discovery"||index>=cards.length||!cards.length||e.ctrlKey||e.metaKey||e.altKey||["INPUT","SELECT","TEXTAREA"].includes(e.target?.tagName))return;const choice={ArrowLeft:"dislike",ArrowRight:"like",u:"unsure",s:"skip"}[e.key];if(choice){e.preventDefault();document.querySelector(`[data-choice="${choice}"]`).click();}});
let touchStart=null;
$("card").addEventListener("touchstart",e=>touchStart=e.touches[0].clientX);
$("card").addEventListener("touchend",e=>{if(touchStart===null)return;let d=e.changedTouches[0].clientX-touchStart;if(Math.abs(d)>70)document.querySelector('[data-choice="'+(d>0?"like":"dislike")+'"]').click();touchStart=null;});
async function loadPortfolios(){if(fullMandate&&!mandateReport?.demo_eligible)throw Error("demoUnavailable");if(!portfolios.length)portfolios=await api("candidates",fullMandate||mandate);showPortfolio();}
function detail(p){
  const metrics=[["cagr",p.metrics.cagr],["vol",p.metrics.vol],["drawdown",p.metrics.drawdown],["stress",p.stress_loss]];
  return "<h2>"+esc(t(p.name))+"</h2><div class='stats'>"+metrics.map(([key,value])=>"<div><b>"+pct(value)+"</b>"+esc(t(key))+"</div>").join("")+"</div><p>"+esc(t("stressLoss"))+": "+p.stress_usd.toFixed(0)+" USD · "+esc(t("es"))+": "+pct(p.metrics.es95_monthly)+"</p>"+Object.entries(p.weights).map(([k,v])=>"<p>"+esc(t(k))+" · "+pct(v)+"</p><div class='bar'><i style='width:"+100*v+"%'></i></div>").join("")+"<p class='muted'>"+esc(t(p.period))+" · "+esc(t(p.costs))+"</p>";
}
function showPortfolio(){const p=portfolios[swipes.length];$("portfolio").innerHTML=p?"<article>"+detail(p)+"</article>":"<article>"+esc(t("end"))+": "+shortlist.length+"</article>";}
function swipe(choice){if(!sessionUnlocked)return;const p=portfolios[swipes.length];if(!p)return;swipes.push(choice);if(choice==="like")shortlist.push(p);showPortfolio();changed();}
$("like").onclick=()=>swipe("like");$("reject").onclick=()=>swipe("dislike");$("skip").onclick=()=>swipe("skip");
$("undo").onclick=()=>{if(!sessionUnlocked)return;if(swipes.pop()==="like"){const undone=shortlist.pop();confirmed.delete(undone.name);}showPortfolio();changed();};
function compare(){
  const area=$("shortlist");area.replaceChildren();
  if(!shortlist.length){area.textContent=t("empty");return;}
  shortlist.forEach(p=>{
    const article=document.createElement("article");article.innerHTML=detail(p);
    const button=document.createElement("button");
    function update(){button.disabled=confirmed.has(p.name);button.textContent=t(button.disabled?"selected":"select");}
    button.onclick=()=>{if(sessionUnlocked){confirmed.add(p.name);update();changed();}};update();article.append(button);area.append(article);
  });
}
document.addEventListener("riskmatch:language",()=>{
  $("error").textContent=errorKey?diagnostic(errorKey):"";
  if(activePage==="discovery")showCard().catch(e=>{$("error").textContent=t(e.message);});
  if(activePage==="explore"&&portfolios.length)showPortfolio();
  if(activePage==="compare")compare();
  if(activePage==="compare")window.BaselinesView?.render();
  if(activePage==="compare")window.MeanVarianceView?.render();
  if(activePage==="compare")window.BlackLittermanView?.render();
  if(activePage==="compare")window.HierarchicalView?.render();
  if(activePage==="compare")window.DownsideView?.render();
  if(activePage==="compare")window.AdvancedView?.render();
  if(activePage==="compare")window.LongOnlyView?.render();
  if(activePage==="compare")window.AlternativeView?.render();
  if(activePage==="universe")window.UniverseView.render();
  if(activePage==="sources")window.SourcesView.render();
  if(activePage==="mandate"&&!$("mandate-report").hidden)renderMandateReport();
  if(activePage==="mandate")window.GoalsView?.render();
});

// Serialize only the synthetic simulation, not passwords or computed market data.
function simulationSnapshot() {
  return {version:1,mandate,fullMandate,answers,index,swipes,activePage:lastSimulationPage,discoverySeed,discoveryVersion,discoveryCurrency,discoveryConsent,responseLocales,discoveryConfidence};
}
function clearSimulation(){
  window.GoalsView?.clear();
  window.BaselinesView?.clear();
  window.MeanVarianceView?.clear();
  window.BlackLittermanView?.clear();
  window.HierarchicalView?.clear();
  window.DownsideView?.clear();
  window.AdvancedView?.clear();
  window.LongOnlyView?.clear();
  window.AlternativeView?.clear();
  mandate=null;resetDiscovery();portfolios=[];swipes=[];shortlist=[];confirmed.clear();scoreReport=null;
  fullMandate=null;mandateReport=null;pendingMandate=null;pendingReport=null;
  lastSimulationPage="home";
  window.MandateForm.reset();$("card").replaceChildren();$("result").replaceChildren();$("portfolio").replaceChildren();$("shortlist").replaceChildren();
}
async function restoreSimulation(snapshot){
  if(snapshot?.version!==1 || !snapshot.answers || !Array.isArray(snapshot.swipes))throw Error("saveError");
  if(!snapshot.mandate){clearSimulation();return "home";}
  if(snapshot.fullMandate){
    fullMandate=snapshot.fullMandate;mandateReport=await api("mandate/preview",fullMandate);
    if(mandateReport.status!=="structurally_valid")throw Error("saveError");
  }
  const m=snapshot.mandate;
  const nextMandate=fullMandate?{capital:fullMandate.capital,years:mandateReport.horizon_years,max_stress_loss:mandateReport.effective_stress_limit,currency:fullMandate.currency}:{capital:Number(m.capital),years:Number(m.years),max_stress_loss:Number(m.max_stress_loss),currency:"USD"};
  if(!Number.isFinite(nextMandate.capital)||nextMandate.capital<=0||!Number.isFinite(nextMandate.years)||nextMandate.years<=0||!Number.isFinite(nextMandate.max_stress_loss)||nextMandate.max_stress_loss<0||nextMandate.max_stress_loss>1)throw Error("saveError");
  const nextIndex=Number(snapshot.index);
  let nextCards=[];
  if(snapshot.discoveryVersion){
    const restored=await api("discovery/session",{seed:snapshot.discoverySeed,currency:snapshot.discoveryCurrency});
    if(restored.version!==snapshot.discoveryVersion||restored.currency!==nextMandate.currency)throw Error("saveError");
    nextCards=restored.cards;discoverySeed=restored.seed;discoveryVersion=restored.version;discoveryCurrency=restored.currency;discoveryConsent=true;
  }else if(nextIndex>0){nextCards=await api("cards");discoveryConsent=true;}
  const nextPortfolios=fullMandate&&!mandateReport.demo_eligible?[]:await api("candidates",fullMandate||nextMandate);
  if(!Number.isInteger(nextIndex)||nextIndex<0||nextIndex>nextCards.length)throw Error("saveError");
  const choices=new Set(["like","dislike","unsure","skip"]);
  const nextAnswers={};
  for(const c of nextCards.slice(0,nextIndex)){
    if(!choices.has(snapshot.answers[c.id]))throw Error("saveError");
    nextAnswers[c.id]=snapshot.answers[c.id];
  }
  const nextSwipes=snapshot.swipes;
  if(nextSwipes.length>nextPortfolios.length||nextSwipes.some(v=>!["like","dislike","skip"].includes(v)))throw Error("saveError");
  mandate=nextMandate;cards=nextCards;answers=nextAnswers;index=nextIndex;
  responseLocales=Object.fromEntries(Object.keys(nextAnswers).filter(id=>["en","fr"].includes(snapshot.responseLocales?.[id])).map(id=>[id,snapshot.responseLocales[id]]));
  discoveryConfidence=[1,2,3,4,5].includes(snapshot.discoveryConfidence)?snapshot.discoveryConfidence:null;
  portfolios=nextPortfolios;swipes=nextSwipes.slice();shortlist=portfolios.filter((_,i)=>swipes[i]==="like");confirmed.clear();scoreReport=null;
  if(fullMandate)window.MandateForm.restore(fullMandate);
  else{window.MandateForm.reset();const f=$("form");f.querySelector('[name="currency"]').value="USD";f.elements.capital.value=mandate.capital;f.elements.cash.value=mandate.capital;f.elements.loss_capacity_amount.value=mandate.capital*mandate.max_stress_loss;f.elements.stress_loss.value=mandate.max_stress_loss*100;f.elements.loss_budget.value=mandate.max_stress_loss*100;}
  const target=["home","mandate","discovery","universe","sources","explore","compare"].includes(snapshot.activePage)?snapshot.activePage:"home";
  return fullMandate&&!mandateReport.demo_eligible&&["explore","compare"].includes(target)?"mandate":target;
}
async function enterSavedStudio(target){
  setSaveSession(true);
  page(target);
  if(target==="discovery")await showCard();
  if(target==="explore")showPortfolio();
  if(target==="universe")await window.UniverseView.load(api);
  if(target==="sources")await window.SourcesView.load(api);
}
