/* Read-only local universe research. No portfolio selections or user data changed. */
(() => {
  const $=id=>document.getElementById(id), t=k=>window.RM.t(k);
  const escape=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const day=$("universe-date");day.value=new Date().toISOString().slice(0,10);day.max=day.value;
  let report=null, fetchReport=null, revision=0;
  const txt=k=>escape(t(k));
  const cell=value=>escape(value??t("noValue"));
  const number=value=>value==null?t("noValue"):new Intl.NumberFormat(window.RM.language==="fr"?"fr-CH":"en-US").format(value);
  function render(){
    if(!report)return;
    const cls=$("universe-class").value, availability=$("universe-availability").value, query=$("universe-search").value.trim().toLowerCase();
    const rows=report.rows.filter(r=>(cls==="all"||r.asset_class===cls)&&
      (availability==="all"||(availability==="observed"?r.coverage?.status==="observed":availability==="reported"?r.coverage?.status==="reported_unvalidated":!r.coverage||r.coverage.status==="not_observed"))&&
      (!query||`${r.ticker} ${r.name} ${r.sector}`.toLowerCase().includes(query)));
    const observed=report.rows.filter(r=>r.coverage?.status==="observed").length, reported=report.rows.filter(r=>r.coverage?.status==="reported_unvalidated").length;
    const risk=report.risk_free;
    const cards=[["universeCandidates",report.rows.length],["universeObserved",observed],["universeReported",reported],["universeEligible",report.eligible_count],["universeVersion",report.version]];
    const stat=`<div class="universe-stats">${cards.map(([k,v])=>`<article><p>${txt(k)}</p><b>${cell(v)}</b></article>`).join("")}</div>`;
    const status=`<p class="muted">${txt(report.source_status)} · ${txt("universeDate")}: ${cell(report.as_of)} · ${txt("universeMetadataDate")}: ${cell(report.metadata_reviewed_on)}</p>`;
    const coverage=r=>{const c=r.coverage;if(!c)return `<span>${txt("noValue")}</span>`;const ratio=c.missing_fraction==null?null:Math.max(0,Math.min(1,1-c.missing_fraction));return `<div class="universe-meter" aria-label="${txt("universeCoverage")}"><span style="width:${ratio===null?0:Math.round(ratio*100)}%"></span></div><small>${ratio===null?txt("noValue"):`${Math.round(ratio*100)}%`} · ${escape(number(c.observed))}/${escape(number(c.source_grid_sessions))}</small><small>${txt(c.status)}</small>`;};
    const table=rows.map(r=>`<tr><td><b>${cell(r.ticker)}</b><small>${cell(r.name)}</small></td><td>${txt(r.asset_class)}<small>${cell(r.sector)}</small></td><td>${cell(r.inception)}<small>${txt("universeListing")}: ${cell(r.listing_date)}</small></td><td>${cell(r.benchmark)}</td><td>${coverage(r)}<small>${cell(r.coverage?.first)} → ${cell(r.coverage?.last)}</small></td><td><small>ADV USD: ${escape(number(r.investability?.adv_usd))}</small><small>AUM USD: ${escape(number(r.investability?.aum_usd))}</small><small>${txt("fundExpenseRatio")}: ${r.investability?.expense_ratio==null?txt("noValue"):escape((100*r.investability.expense_ratio).toFixed(3)+"%")}</small></td><td>${r.eligible?txt("universeEligible"):r.reasons.map(k=>`<small>${txt(k)}</small>`).join("")}</td><td>${String(r.source).startsWith("https://")?`<a href="${cell(r.source)}" target="_blank" rel="noopener noreferrer">${txt("universeSource")}</a>`:txt("noValue")}</td></tr>`).join("");
    $("universe-report").innerHTML=stat+status+`<article><h2>${txt("universeCash")}</h2><p>${txt("universeCashHelp")}</p><p>${cell(risk.reference)} · ${txt(risk.status)} · ${cell(risk.first)} → ${cell(risk.last)}</p></article><article><h2>${txt("universeCoverage")}</h2><p class="muted">${txt("universeGridHelp")}</p><div class="universe-table-wrap"><table><thead><tr>${["universeTicker","universeClass","universeInception","universeBenchmark","universeCoverage","universeLiquidity","universeReason","universeSource"].map(k=>`<th>${txt(k)}</th>`).join("")}</tr></thead><tbody>${table||`<tr><td colspan="8">${txt("universeNoResults")}</td></tr>`}</tbody></table></div></article><p class="muted">${txt("universeExtension")}</p>`;
  }
  async function load(api){
    fetchReport=api;const own=++revision;
    $("universe-report").textContent=t("universeLoading");
    try{const result=await api("universe",{as_of:day.value});if(own===revision){report=result;render();}}
    catch(e){if(own===revision){report=null;$("universe-report").textContent=t(e.message||"networkError");}}
  }
  for(const id of ["universe-class","universe-availability","universe-search"]){$(id).addEventListener("input",render);$(id).addEventListener("change",render);}
  $("universe-refresh").addEventListener("click",()=>{if(fetchReport)load(fetchReport);});
  window.UniverseView={load,render};
})();
