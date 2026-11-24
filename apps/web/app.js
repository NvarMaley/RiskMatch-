const $ = id => document.getElementById(id);
const t = key => window.RM.t(key);
let mandate = null, cards = [], answers = {}, index = 0, portfolios = [], swipes = [], shortlist = [];
let activePage = "saves", lastSimulationPage = "home", scoreReport = null, errorKey = "";
let sessionUnlocked = false, sessionEpoch = 0;
function setSaveSession(open) {
  sessionEpoch++;
  sessionUnlocked=Boolean(open);
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
  catch (e) { if(e.message==="sessionChanged")return; errorKey = e.message; $("error").textContent = t(errorKey); }
};
function page(name) {
  if(!sessionUnlocked && name!=="saves")name="saves";
  activePage = name;
  if(name!=="saves")lastSimulationPage=name;
  document.querySelectorAll(".page").forEach(x => x.hidden = x.id!==name);
  document.querySelectorAll("[data-page]").forEach(x => x.classList.toggle("active", x.dataset.page===name));
  if (name==="compare") compare();
  if (name==="saves") document.dispatchEvent(new Event("riskmatch:saves"));
  changed();
}
document.querySelectorAll("[data-page]").forEach(button => button.onclick = handle(async () => {
  if(!sessionUnlocked)throw Error("saveRequired");
  if (button.dataset.page==="explore" && !mandate) throw Error("mandateRequired");
  page(button.dataset.page);
  if (activePage==="explore") await loadPortfolios();
  if (activePage==="discovery") {
    if (!cards.length) cards=await api("cards");
    await showCard();
  }
}));
$("form").onsubmit = handle(async event => {
  event.preventDefault();
  if(!sessionUnlocked)throw Error("saveRequired");
  const f = new FormData(event.target);
  mandate={capital:+f.get("capital"),years:+f.get("years"),max_stress_loss:+f.get("loss")/100,currency:"USD"};
  portfolios=[]; swipes=[]; shortlist=[]; confirmed.clear(); scoreReport=null;cards=[];answers={};index=0;
  changed();cards=await api("cards");page("discovery");await showCard();changed();
});
async function showCard() {
  const card = cards[index];
  $("actions").hidden=!card; $("back").disabled=index===0; $("result").replaceChildren();
  if (!card) {
    $("card").replaceChildren();
    if (!cards.length) return;
    if (!scoreReport) scoreReport=await api("score",answers);
    const r=scoreReport;
    $("result").innerHTML='<article><h2>'+esc(r.score===null?t("scoreUnavailable"):r.score+" / 30")+'</h2><p>'+esc(t("scoreExplanation"))+' '+esc(t("coverage"))+': '+pct(r.coverage)+'. '+esc(t("sensitivity"))+': '+r.sensitivity.join("–")+'. '+esc(t("scoreLimit"))+'</p><p>'+esc(t("inconsistencies"))+': '+r.inconsistencies.length+'</p><button class="primary" id="next">'+esc(t("exploreAllocations"))+'</button></article>';
    $("next").onclick=handle(async()=>{if(!mandate)throw Error("mandateRequired");page("explore");await loadPortfolios();});
    return;
  }
  const c=window.RM.language==="fr"?card.fr:card;
  $("card").innerHTML='<article class="card"><p>'+esc(c.block)+' · '+(index+1)+' / '+cards.length+'</p><div class="bar"><i style="width:'+100*index/cards.length+'%"></i></div><div class="options"><div><b>A</b><p>'+esc(c.a)+'</p></div><div><b>B</b><p>'+esc(c.b)+'</p></div></div></article>';
}
document.querySelectorAll("[data-choice]").forEach(b=>b.onclick=handle(async()=>{if(sessionUnlocked&&index<cards.length){answers[cards[index++].id]=b.dataset.choice;scoreReport=null;changed();await showCard();}}));
$("back").onclick=handle(async()=>{if(sessionUnlocked&&index){delete answers[cards[--index].id];scoreReport=null;changed();await showCard();}});
let touchStart=null;
$("card").addEventListener("touchstart",e=>touchStart=e.touches[0].clientX);
$("card").addEventListener("touchend",e=>{if(touchStart===null)return;let d=e.changedTouches[0].clientX-touchStart;if(Math.abs(d)>70)document.querySelector('[data-choice="'+(d>0?"like":"dislike")+'"]').click();touchStart=null;});
async function loadPortfolios(){if(!portfolios.length)portfolios=await api("candidates",mandate);showPortfolio();}
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
  $("error").textContent=errorKey?t(errorKey):"";
  if(activePage==="discovery"&&cards.length)showCard().catch(e=>{$("error").textContent=t(e.message);});
  if(activePage==="explore"&&portfolios.length)showPortfolio();
  if(activePage==="compare")compare();
});

// Serialize only the synthetic simulation, not passwords or computed market data.
function simulationSnapshot() {
  return {version:1,mandate,answers,index,swipes,activePage:lastSimulationPage};
}
function clearSimulation(){
  mandate=null;cards=[];answers={};index=0;portfolios=[];swipes=[];shortlist=[];confirmed.clear();scoreReport=null;
  lastSimulationPage="home";
  $("form").reset();$("card").replaceChildren();$("result").replaceChildren();$("portfolio").replaceChildren();$("shortlist").replaceChildren();
}
async function restoreSimulation(snapshot){
  if(snapshot?.version!==1 || !snapshot.answers || !Array.isArray(snapshot.swipes))throw Error("saveError");
  if(!snapshot.mandate){clearSimulation();return "home";}
  const m=snapshot.mandate;
  const nextMandate={capital:Number(m.capital),years:Number(m.years),max_stress_loss:Number(m.max_stress_loss),currency:"USD"};
  if(!Number.isFinite(nextMandate.capital)||nextMandate.capital<=0||!Number.isFinite(nextMandate.years)||nextMandate.years<=0||!Number.isFinite(nextMandate.max_stress_loss)||nextMandate.max_stress_loss<0||nextMandate.max_stress_loss>1)throw Error("saveError");
  const nextCards=await api("cards");
  const nextPortfolios=await api("candidates",nextMandate);
  const nextIndex=Number(snapshot.index);
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
  portfolios=nextPortfolios;swipes=nextSwipes.slice();shortlist=portfolios.filter((_,i)=>swipes[i]==="like");confirmed.clear();scoreReport=null;
  $("form").elements.capital.value=mandate.capital;$("form").elements.years.value=mandate.years;$("form").elements.loss.value=mandate.max_stress_loss*100;
  const target=["home","mandate","discovery","explore","compare"].includes(snapshot.activePage)?snapshot.activePage:"home";
  return target;
}
async function enterSavedStudio(target){
  setSaveSession(true);
  page(target);
  if(target==="discovery")await showCard();
  if(target==="explore")showPortfolio();
}
