/* Local source readiness view; no download or allocation is triggered by opening this page. */
(() => {
  const $=id=>document.getElementById(id),t=k=>window.RM.t(k);
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const fr={CRYPTO_SPOT:"Vérifier les jours manquants, les frais, la conservation et le mandat client.",ETF_DAILY:"Rapprocher les volumes et rendements WRDS par titre et date. Vérifier les indicateurs de qualité et compléter 2026.",ETF_MONTHLY:"Actualiser 2026 et réconcilier les distributions / delistings.",EQUITY_MASTER:"Valider la classification et les dates de cotation; conserver les titres radiés.",ETF_HOLDINGS:"Télécharger N-PORT et demander les historiques de détentions WRDS si disponibles, surtout avant 2019.",FUNDAMENTALS:"Vérifier les dates de publication, les RDQ manquantes et les révisions.",LINKS:"Actualiser CCM et valider les intervalles de liaison.",TREASURY_MASTER:"Réconcilier les pages d'adjudications historiques et récentes; exclure FRN/STRIPS.",TREASURY_DAILY:"Demander les prix secondaires individuels CRSP Treasury, coupons et intérêts courus.",RATES_FX:"Vérifier unités, calendrier et délai de publication; ne pas confondre taux et rendement.",MACRO_VINTAGES:"Compléter les vintages ALFRED et dates de publication.",FACTORS:"Actualiser si nécessaire auprès des producteurs officiels; vérifier unités et licences.",BENCHMARKS:"Demander rendements totaux et historiques de composition lorsque licenciés.",FUTURES:"Compléter les échéances et vérifier cours de compensation, volumes, positions ouvertes, ticks et marges auprès de la bourse.",COSTS_LIQUIDITY:"Rapprocher les volumes et les prix, puis vérifier les frais et les encours datés.",SENTIMENT:"Facultatif; vérifier les droits du cours et la disponibilité historique."};
  let report=null, snapshot=null, returns=null, statistics=null, api=null;
  let statsSelection=null, statsAssets=null, statsResult=null;
  const statLabels={mean:["Mean","Moyenne"],geometric_mean:["Geometric mean","Moyenne géométrique"],median:["Median","Médiane"],volatility:["Sample volatility","Volatilité échantillon"],annualized_volatility:["Annualized volatility","Volatilité annualisée"],downside_deviation:["Downside deviation","Déviation baissière"],skewness:["Skewness","Asymétrie"],excess_kurtosis:["Excess kurtosis","Kurtosis excédentaire"],jarque_bera_p:["Jarque–Bera p-value","Jarque–Bera valeur p"],q05:["5% quantile","Quantile 5%"],q95:["95% quantile","Quantile 95%"]};
  function statisticsHtml(french){
    if(!statistics?.sources?.length)return "";
    const rows=statistics.sources.map(r=>`<tr><td>${esc(r.source)}</td><td>${esc(r.frequency)}</td><td>${esc(r.instruments)}</td><td>${esc(r.valid)} / ${esc(r.observations)}</td></tr>`).join("");
    const matrices=(statistics.covariance_checks||[]).map(r=>`<tr><td>${esc(r.source)}</td><td>${esc(r.assets)}</td><td>${esc(r.observations)}</td><td>${r.psd===true?"✓":r.psd===false?"✗":"—"}</td></tr>`).join("");
    return `<article><h2>${french?"07 · Statistiques descriptives":"07 · Descriptive statistics"}</h2><p>${french?"Résultats historiques de recherche. Sélectionne une source, des actifs et des dates communes.":"Historical research results. Select a source, assets and common dates."}</p><p>${statistics.datasets[0]?.rows?.toLocaleString(french?"fr-CH":"en-US")||0} ${french?"profils statistiques":"statistical profiles"}</p>
      <label>${french?"Source / fréquence":"Source / frequency"} <select id="stats-source">${statistics.sources.map(r=>`<option value="${esc(r.source)}">${esc(r.source)} · ${esc(r.frequency)}</option>`).join("")}</select></label>
      <label>${french?"Actifs (1 à 8)":"Assets (1 to 8)"} <select id="stats-assets" multiple size="5"></select></label>
      <label>${french?"Début":"Start"} <input type="date" id="stats-start"></label><label>${french?"Fin":"End"} <input type="date" id="stats-end"></label>
      <label>${french?"Devise":"Currency"} <select id="stats-currency"><option>USD</option><option>CHF</option></select></label>
      <label>${french?"Rendement":"Return"} <select id="stats-kind"><option value="total_return">${french?"Total":"Total"}</option><option value="price_return">${french?"Prix":"Price"}</option></select></label>
      <button id="stats-compare" type="button">${french?"Comparer":"Compare"}</button><div id="stats-result" aria-live="polite"></div>
      <h3>${french?"Matrices de référence":"Reference covariance matrices"}</h3><div class="universe-table-wrap"><table><thead><tr><th>Source</th><th>${french?"Actifs":"Assets"}</th><th>${french?"Intervalles communs":"Common intervals"}</th><th>PSD</th></tr></thead><tbody>${matrices}</tbody></table></div>
      <div class="universe-table-wrap"><table><thead><tr>${(french?["Source","Fréquence","Instruments","Valides / observations"]:["Source","Frequency","Instruments","Valid / observations"]).map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></article>`;
  }
  function plot(points,label){
    if(!points?.length)return "";
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const a=Math.min(...xs),b=Math.max(...xs),c=Math.min(...ys),d=Math.max(...ys);
    const line=points.map(p=>`${(32+236*(p[0]-a)/(b-a||1)).toFixed(2)},${(110-90*(p[1]-c)/(d-c||1)).toFixed(2)}`).join(" ");
    return `<figure><figcaption>${esc(label)}</figcaption><svg viewBox="0 0 280 140" role="img" aria-label="${esc(label)}"><path d="M32 16 V110 H270" fill="none" stroke="currentColor"/><polyline points="${line}" fill="none" stroke="#c6a15b" stroke-width="2"/><text x="32" y="128" fill="currentColor" font-size="9">${a.toPrecision(3)}</text><text x="240" y="128" fill="currentColor" font-size="9">${b.toPrecision(3)}</text><text x="1" y="108" font-size="9" fill="currentColor">${c.toPrecision(3)}</text><text x="1" y="20" font-size="9" fill="currentColor">${d.toPrecision(3)}</text></svg></figure>`;
  }
  function renderComparison(){
    if(!statsResult||!$("stats-result"))return;
    const french=window.RM.language==="fr",fmt=v=>Number.isFinite(v)?Number(v).toPrecision(4):"—";
    const rows=statsResult.assets.map(a=>`<tr><td>${esc(a.instrument)}</td><td>${a.statistics.count} / ${a.statistics.missing}</td>${Object.keys(statLabels).map(k=>`<td>${fmt(a.statistics[k])}</td>`).join("")}</tr>`).join("");
    const plots=statsResult.assets.map(a=>`<article><h3>${esc(a.instrument)}</h3><p>${french?"Histogramme":"Histogram"}</p>${a.distribution.histogram.map(([lo,hi,n])=>`<div><small>${fmt(lo)} – ${fmt(hi)}</small> <progress max="${a.statistics.count||1}" value="${n}"></progress> ${n}</div>`).join("")}${plot(a.distribution.cdf,"ECDF")}${plot(a.distribution.qq,"Normal QQ")}${plot(a.serial?.acf?.map((v,i)=>[i,v]),"ACF")}${plot(a.serial?.pacf?.map((v,i)=>[i,v]),"PACF")}<p>Ljung–Box p: ${fmt(a.serial?.ljung_box_p)} · ADF(1): ${fmt(a.serial?.adf_lag1_t)}</p></article>`).join("");
    const matrix=statsResult.matrix;
    const table=(data,label)=>data?`<h3>${label}</h3><div class="universe-table-wrap"><table><tbody>${data.map((row,i)=>`<tr><th>${esc(statsResult.assets[i].instrument)}</th>${row.map(v=>`<td>${fmt(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:"";
    $("stats-result").innerHTML=`<p>${esc(statsResult.frequency)} · ${esc(statsResult.currency)} · ${french?"rendements décimaux":"decimal returns"}</p><div class="universe-table-wrap"><table><thead><tr><th>Asset</th><th>${french?"N / manquants":"N / missing"}</th>${Object.values(statLabels).map(v=>`<th>${v[french?1:0]}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div><p>${french?"Intervalles communs":"Common intervals"}: ${matrix.count} · PSD: ${matrix.psd??"—"}</p>${table(matrix.covariance,"Covariance")}${table(matrix.pearson,"Pearson")}${table(matrix.spearman,"Spearman")}${plots}`;
  }
  function setupStatistics(){
    if(!statistics?.sources?.length||!$("stats-source"))return;
    const cutoff={as_of:new Date().toISOString().slice(0,10)};
    const select=$("stats-source");
    if(!statsSelection)statsSelection={source:statistics.sources.find(r=>r.source==="listed_daily")?.source||statistics.sources[0].source,currency:"USD",kind:"total_return"};
    select.value=statsSelection.source;$("stats-currency").value=statsSelection.currency;$("stats-kind").value=statsSelection.kind;
    function showAssets(){
      if(!statsAssets)return;
      $("stats-assets").innerHTML=statsAssets.assets.map(id=>`<option value="${esc(id)}" ${(statsSelection.instruments||[]).includes(id)?"selected":""}>${esc(id)}</option>`).join("");
      $("stats-start").value=statsSelection.start||statsAssets.first;$("stats-end").value=statsSelection.end||statsAssets.last;
    }
    async function getAssets(){
      try{statsAssets=await api("statistics/assets",{...cutoff,source:statsSelection.source});
        statsSelection.instruments=statsAssets.assets.slice(0,2);statsSelection.start=statsAssets.first;statsSelection.end=statsAssets.last;showAssets();
      }catch(e){$("stats-result").textContent=e.message;}
    }
    select.onchange=()=>{statsSelection.source=select.value;statsAssets=null;statsResult=null;$("stats-result").textContent="";getAssets();};
    $("stats-compare").onclick=async()=>{
      statsSelection={source:select.value,instruments:Array.from($("stats-assets").selectedOptions).map(o=>o.value),start:$("stats-start").value,end:$("stats-end").value,currency:$("stats-currency").value,kind:$("stats-kind").value};
      try{statsResult=await api("statistics/compare",{...cutoff,...statsSelection});renderComparison();}
      catch(e){$("stats-result").textContent=e.message;}
    };
    if(statsAssets)showAssets();else getAssets();
    renderComparison();
  }
  function returnsHtml(french){
    if(!Array.isArray(returns?.datasets))return "";
    const rows=returns.datasets.map(r=>{
      const valid=r.total_returns || r.price_returns || r.real_returns || r.annualized_means || r.matched || 0;
      const pct=r.rows?Math.round(100*valid/r.rows):0;
      const kind=r.total_returns? "Total" : r.price_returns? (french?"Prix":"Price") : r.real_returns? (french?"Réel":"Real") : r.annualized_means? (french?"Annualisé":"Annualized") : (french?"Rapprochement":"Reconciliation");
      return `<tr><td><b>${esc(r.dataset)}</b><small>${esc(r.method)}</small></td><td>${esc(r.frequency)} · ${esc(r.base_currency)} · ${esc(r.units)}</td><td>${esc(r.rows)}</td><td>${esc(r.price_returns??"—")} / ${esc(r.total_returns??"—")}</td><td>${esc(r.chf_price_returns??"—")} / ${esc(r.chf_total_returns??"—")}</td><td>${esc(kind)} <progress max="100" value="${pct}" aria-label="${esc(french?"Couverture":"Coverage")}"></progress> ${pct}%</td></tr>`;
    }).join("");
    const total=returns.datasets.reduce((sum,r)=>sum+r.rows,0);
    return `<article><h2>${french?"06 · Rendements et devises":"06 · Returns and FX"}</h2><p>${french?"Résultats de recherche. Les scénarios obligataires et les données historiques nécessitent une validation avant tout backtest.":"Research results. Bond scenarios and historical data require validation before backtesting."}</p><p>${returns.datasets.length} ${french?"tables":"partitions"} · ${esc(total.toLocaleString(french?"fr-CH":"en-US"))} ${french?"lignes":"rows"}</p><div class="universe-table-wrap"><table><thead><tr>${(french?["Table","Fréquence / devise / unités","Lignes","Prix / total USD","Prix / total CHF","Couverture"]:["Table","Frequency / currency / units","Rows","Price / total USD","Price / total CHF","Coverage"]).map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></article>`;
  }
  function snapshotHtml(french){
    if (!snapshot) return "";
    const quality = r => Object.entries(r.quality || {}).map(([k,v]) => {
      const labels = {unchanged_close:["Unchanged close","Clôture identique"],large_price_change:["Large price change","Forte variation"],missing_return:["Missing return","Rendement manquant"],expected_sessions:["Expected observations","Observations attendues"],missing_sessions:["Missing observations","Observations manquantes"]};
      return `${esc(labels[k]?.[french?1:0] || k)}: ${esc(v)}`;
    }).join(" · ");
    const rows = snapshot.datasets.map(r => `<tr><td>${esc(r.dataset)}</td><td>${esc(r.rows)}</td><td>${esc(r.first)} – ${esc(r.last)}</td><td>${esc(r.invalid)} / ${esc(r.duplicates)} / ${esc(r.conflicts)}</td><td>${quality(r)}</td></tr>`).join("");
    const total = snapshot.datasets.reduce((sum,r)=>sum+(Number(r.rows)||0),0);
    return `<article><h2>${french?"05 · Qualité et données historiques":"05 · Point-in-time data quality"}</h2><p>${french?"Les séries historiques restent en recherche. Les calculs financiers sur ces données sont bloqués en attendant la validation des dates de disponibilité.":"Historical series remain under research. Financial runs on these data are blocked pending availability validation."}</p><p>${esc(snapshot.built_at || "")} · ${snapshot.datasets.length} ${french?"tables":"partitions"} · ${esc(total.toLocaleString(french?"fr-CH":"en-US"))} ${french?"lignes normalisées":"normalized rows"}</p><div class="universe-table-wrap"><table><thead><tr>${(french?["Table","Lignes","Période","Invalides / doublons / conflits","Qualité"]:["Table","Rows","Period","Invalid / duplicate / conflict","Quality"]).map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></article>`;
  }
  function render(){if(!report)return;const french=window.RM.language==="fr";const rows=report.rows.map(r=>`<tr><td><b>${esc(r.name)}</b><small>${esc(r.provider)} · ${esc(r.frequency)}</small></td><td><b>${esc(t(r.status))}</b><small>${esc(french?(r.evidence_fr||r.evidence):r.evidence)}</small></td><td>${esc(r.acquisition)}<small>${esc(french?(fr[r.id]||r.action):r.action)}</small></td><td><small>${esc(r.required_fields)}</small><small>${esc(r.rights)}</small></td><td>${String(r.url).startsWith("https://")?`<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(t("universeSource"))}</a>`:""}</td></tr>`).join("");
    const inv = report.inventory;
    const inventory = inv?.available ? (french ? `Inventaire local : ${inv.files} versions de fichiers, ${inv.providers} groupes de sources.` : `Local inventory: ${inv.files} file versions, ${inv.providers} source groups.`) : (french ? "Inventaire local indisponible." : "Local inventory unavailable.");
    const rights = french ? "Les droits WRDS pour le stockage local, les transformations et le partage restent à confirmer. Aucune diffusion de données aux testeurs." : "WRDS rights for local storage, transformation and sharing await confirmation. Data distribution to testers is on hold.";
    $("sources-report").innerHTML=`<article><p>${esc(inventory)}</p><p>${esc(rights)}</p><p>${esc(report.version)} · ${esc(report.as_of)}</p><div class="universe-table-wrap"><table><thead><tr>${["sourcesProvider","sourcesStatus","sourcesAction","sourcesFields","universeSource"].map(k=>`<th>${esc(t(k))}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></article>${snapshotHtml(french)}${returnsHtml(french)}${statisticsHtml(french)}`;
    setupStatistics();
  }
  async function load(fetcher){api=fetcher;$("sources-report").textContent=t("universeLoading");try{const cutoff={as_of:new Date().toISOString().slice(0,10)};report=await api("sources",cutoff);snapshot=await api("snapshot",cutoff);if(!Array.isArray(snapshot?.datasets))snapshot=null;returns=await api("returns",cutoff);statistics=await api("statistics",cutoff);render();}catch(e){if(e.message!=="sessionChanged")$("sources-report").textContent=t(e.message||"networkError");}}
  $("sources-refresh").addEventListener("click",()=>{if(api)load(api);});window.SourcesView={load,render};
})();
