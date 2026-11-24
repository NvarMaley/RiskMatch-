/* UI localization only. English is the canonical project and API language. */
(() => {
  const entries = {
    homeLabel:["RiskMatch home","Accueil RiskMatch"], navigation:["RiskMatch navigation","Navigation RiskMatch"],
    overview:["Overview","Vue d'ensemble"], navMandate:["01 · Mandate","01 · Mandat"], navCompare:["04 · Compare","04 · Comparaison"],
    synthetic:["● SYNTHETIC DATA","● DONNÉES SYNTHÉTIQUES"], headline:["Build. Test. Understand.","Construire. Tester. Comprendre."],
    intro:["RiskMatch connects quantitative research to the portfolio discovery experience.","RiskMatch relie la recherche quantitative à l'expérience de découverte des portefeuilles."],
    start:["Get started →","Commencer →"], mandate:["Mandate","Mandat"],
    mandateSummary:["Define capital, horizon and loss in a hypothetical stress scenario.","Définir le capital, l'horizon et la perte dans un stress hypothétique."],
    discoverySummary:["30 simulated choices. Exploratory risk-aversion score from 1 to 30.","30 choix simulés. Score exploratoire d'aversion de 1 à 30."],
    exploreSummary:["Filter allocations and build a shortlist.","Filtrer les allocations et construire une shortlist."],
    disclaimer:["Prototype: no real orders or promised returns. Results are not investment advice.","Prototype : aucun ordre réel, aucune promesse de rendement. Les résultats ne constituent pas un conseil."],
    yourMandate:["Your mandate","Votre mandat"], capital:["Simulated capital (USD)","Capital fictif (USD)"], horizon:["Horizon (years)","Horizon (années)"],
    loss:["Maximum loss in the stress scenario (%)","Perte maximale dans le stress testé (%)"],
    lossHelp:["This filters one scenario, not a guaranteed maximum loss. USD only in this version.","Ce seuil filtre un scénario précis, pas une garantie de perte maximale. Devise USD uniquement pour cette version."],
    validateMandate:["Validate mandate →","Valider le mandat →"], question:["Would you accept A rather than B?","Accepteriez-vous A plutôt que B ?"],
    refuse:["← Reject","← Refuser"], unsure:["Unsure","Indécis"], skip:["Skip","Passer"], accept:["Accept →","Accepter →"], back:["Undo last answer","Annuler la dernière réponse"], undo:["Undo","Annuler"],
    exploreHelp:["Only candidates compatible with the chosen stress scenario are shown. Results are out-of-calibration simulations without modeled fees.","Seuls les candidats compatibles avec le stress choisi sont présentés. Les mesures sont des simulations hors calibration, sans frais modélisés."],
    compare:["Compare","Comparer"], compareShortlist:["Compare shortlist →","Comparer la shortlist →"], compareHelp:["Simulation shortlist only. Your choice does not trigger an order.","Shortlist de simulation uniquement. Le choix ne déclenche aucun ordre."],
    mandateRequired:["Validate your mandate first.","Validez d'abord le mandat."], scoreUnavailable:["Score unavailable","Score indisponible"],
    scoreExplanation:["30 = strong risk aversion.","30 = forte aversion au risque."], coverage:["Coverage","Couverture"], sensitivity:["Sensitivity","Sensibilité"],
    scoreLimit:["Unvalidated score, independent of the mandate and λ.","Score non validé, indépendant du mandat et de λ."],
    inconsistencies:["Inconsistencies","Incohérences"], exploreAllocations:["Explore allocations →","Explorer les allocations →"],
    cagr:["Simulated CAGR","CAGR simulé"], vol:["Volatility","Volatilité"], drawdown:["Drawdown","Drawdown"], stress:["Hypothetical stress","Stress hypothétique"],
    stressLoss:["Stress loss","Perte stress"], es:["Monthly ES","ES mensuel"], end:["End of compatible candidates. Shortlist","Fin des candidats compatibles. Shortlist"],
    empty:["No portfolios retained.","Aucun portefeuille retenu."], select:["Select for paper simulation","Sélectionner pour simulation papier"],
    selected:["Simulated selection confirmed (no order)","Sélection simulée confirmée (aucun ordre)"],
    musicOn:["Enable music","Activer la musique"], musicOff:["Mute music","Couper la musique"],
    Cash:["Cash","Liquidités"], Conservative:["Conservative","Prudent"], Growth:["Growth","Croissance"], "Fixed income":["Fixed income","Obligataire"],
    "US equities":["US equities","Actions US"], "US Treasuries":["US Treasuries","Obligations d'État US"], "US REIT":["US REIT","REIT US"], "USD cash":["USD cash","Liquidités USD"],
    "36 synthetic out-of-calibration months":["36 synthetic out-of-calibration months","36 mois synthétiques hors calibration"], "Not modeled":["Not modeled","Non modélisés"],
    "Non-finite values":["Non-finite values","Valeurs non finies"], "Invalid mandate":["Invalid mandate","Mandat invalide"],
    "USD-only prototype":["USD-only prototype","Prototype USD uniquement"], "Invalid responses":["Invalid responses","Réponses invalides"],
    "Invalid choice":["Invalid choice","Choix invalide"], "Invalid request size":["Invalid request size","Taille invalide"], "Not found":["Not found","Introuvable"],
    networkError:["Could not load data. Start the local RiskMatch server and try again.","Impossible de charger les données. Démarrez le serveur local RiskMatch et réessayez."]
    ,pressStart:["Press to start","Appuie pour commencer"],opening:["Opening your studio","Ouverture de ton studio"],
    saves:["Saves","Sauvegardes"],yourSaves:["Your saves","Tes sauvegardes"],saveHelp:["Create or unlock a local simulation save. A save is required to enter the studio.","Crée ou déverrouille une sauvegarde locale de simulation. Une sauvegarde est obligatoire pour accéder au studio."],
    saveChoice:["Choose a save","Choisir une sauvegarde"],newSave:["New save","Nouvelle sauvegarde"],saveName:["Save name","Nom de la sauvegarde"],
    pin:["Four-digit PIN","Code à quatre chiffres"],legacyPassphrase:["Previous save passphrase (legacy)","Ancienne phrase secrète (ancienne sauvegarde)"],
    savePrivacy:["Local simulation only. Save names are visible; use fictional names. A four-digit PIN is not strong protection for sensitive data.","Simulation locale uniquement. Les noms sont visibles : utilise des pseudonymes fictifs. Un code à quatre chiffres ne protège pas suffisamment les données sensibles."],
    createSave:["Create save","Créer une sauvegarde"],unlockSave:["Unlock save","Déverrouiller"],resumeSave:["Back to studio","Retour au studio"],saveRequired:["Unlock a save before entering the studio.","Déverrouille une sauvegarde avant d'accéder au studio."],
    saveNow:["Save current simulation","Sauvegarder la simulation actuelle"],lockSave:["Lock save","Verrouiller la sauvegarde"],saveActive:["Open save","Sauvegarde ouverte"],
    saveNameRequired:["Enter a save name.","Saisis un nom de sauvegarde."],
    saveError:["Cannot open save. Check the code or saved data.","Impossible d'ouvrir la sauvegarde. Vérifie le code ou les données."],
    saveUnavailable:["Local encrypted saves are unavailable in this browser context.","Les sauvegardes locales chiffrées ne sont pas disponibles dans ce contexte."],
    saveDone:["Simulation saved locally.","Simulation sauvegardée localement."],pinInvalid:["Enter exactly four digits.","Saisis exactement quatre chiffres."],saveFailed:["Could not save changes. Please try again.","Impossible de sauvegarder les changements. Réessaie."]
  };
  let language="en";
  try { if(localStorage.getItem("riskmatch-v3-language")==="fr") language="fr"; } catch {}
  function t(key){return entries[key]?.[language==="fr"?1:0] ?? key;}
  function apply(){
    document.documentElement.lang=language;
    document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));
    document.querySelectorAll("[data-i18n-label]").forEach(el=>el.setAttribute("aria-label",t(el.dataset.i18nLabel)));
    document.querySelectorAll("#language,#intro-language,#save-language").forEach(el=>el.value=language);
  }
  window.RM={t,get language(){return language;}};
  document.querySelectorAll("#language,#intro-language,#save-language").forEach(el=>el.addEventListener("change",e=>{
    language=e.target.value==="fr"?"fr":"en";
    try {localStorage.setItem("riskmatch-v3-language",language);} catch {}
    apply();
    document.dispatchEvent(new Event("riskmatch:language"));
  }));
  apply();
})();
