"""Versioned experimental card design and score. No clinical or suitability inference."""

from collections import Counter
from math import floor
import random

VERSION = "discovery-v2.0.0"
QUOTAS = {"lottery": 8, "framing": 6, "trajectory": 6, "uncertainty": 4, "style": 4, "consistency": 2}
CHOICES = {"like", "dislike", "unsure", "skip"}
LABELS = {"lottery": ("Lotteries", "Loteries"), "framing": ("Gain / loss framing", "Cadre gains / pertes"),
          "trajectory": ("Paths and drawdowns", "Trajectoires et baisses"),
          "uncertainty": ("Ambiguity / time", "Ambiguïté / temps"),
          "style": ("Management preferences", "Préférences de gestion"),
          "consistency": ("Repeated choice", "Choix répété")}


def alt(en, fr, *, outcomes=(), probabilities=(), horizon_days=0, path=None, cost=0):
    return dict(en=en, fr=fr, outcomes=list(outcomes), probabilities=list(probabilities),
                expected_payoff=sum(x*p for x,p in zip(outcomes,probabilities)) if outcomes and probabilities else None,
                horizon_days=horizon_days, path=path, annual_cost=cost)


def bank(currency="USD"):
    if currency not in {"USD", "CHF"}:
        raise ValueError("invalid_currency")
    result = []

    def card(id, block, dimension, a, b, scored=False, reference=1000, pair=None):
        result.append(dict(id=id, version=VERSION, block_id=block, dimension=dimension,
                           currency=currency, reference_wealth=reference, canonical_a=a, canonical_b=b,
                           prudent_option="B" if scored else None, scored=scored, pair_id=pair))

    # Gains from the same positive reference wealth; known expected gains, CE varies.
    for i in range(16):
        gain = 100 + (i % 8) * 25
        p = .5 if i < 8 else .75
        loss = (gain//2) if i >= 12 else 0
        if loss:p=.5
        safe = round((p * gain-(1-p)*loss) * (0.8 + (i % 4) * .15), 2)
        pct = round(p * 100)
        a = alt(f"{pct}%: +{gain} {currency}; {100-pct}%: {-loss} {currency}.",
                f"{pct} % : +{gain} {currency} ; {100-pct} % : {-loss} {currency}.",
                outcomes=(gain, -loss), probabilities=(p, 1-p))
        b = alt(f"+{safe:g} {currency} certain.", f"+{safe:g} {currency} certain.", outcomes=(safe,), probabilities=(1,))
        card(f"L{i+1:02}", "lottery", "risk_tolerance", a, b, True)

    # Six pairs: same starting wealth, probabilities and terminal wealth; only wording differs.
    for i in range(6):
        ref = 1000 + i * 200
        loss = 100 + i * 50
        p = .2 if i % 2 == 0 else .5
        safe_loss = p * loss
        pct = round(p * 100)
        for frame in range(2):
            if frame == 0:
                a_text = (f"{100-pct}% retain {ref} {currency}; {pct}% retain {ref-loss} {currency}.",
                          f"{100-pct} % conservent {ref} {currency} ; {pct} % conservent {ref-loss} {currency}.")
                b_text = (f"Retain {ref-safe_loss:g} {currency} with certainty.",f"Conserver {ref-safe_loss:g} {currency} avec certitude.")
            else:
                a_text = (f"Starting with {ref} {currency}: {100-pct}% lose 0; {pct}% lose {loss}.",
                          f"Sur {ref} {currency} : {100-pct} % perdent 0 ; {pct} % perdent {loss}.")
                b_text = (f"Certain loss of {safe_loss:g} {currency} from {ref}.",f"Perte certaine de {safe_loss:g} {currency} sur {ref}.")
            a = alt(*a_text, outcomes=(0,-loss), probabilities=(1-p,p))
            b = alt(*b_text, outcomes=(-safe_loss,), probabilities=(1,))
            card(f"F{2*i+frame+1:02}", "framing", "loss_sensitivity", a,b,True,ref,f"FP{i+1:02}")

    for i in range(12):
        dip = 8+i*2
        low, high = 90-i, 114+i*2
        safe_dip = max(1,dip//4)
        # Both alternatives have equal horizon, two equiprobable outcomes, and equal assumed costs.
        a = alt(f"100 → {100-dip} at six months → {low} or {high} at 12 months (50% each). Net of 0.5% assumed cost; recovery uncertain.",
                f"100 → {100-dip} à six mois → {low} ou {high} à 12 mois (50 % chacun). Net de 0,5 % de frais supposés ; reprise incertaine.",
                outcomes=(low-100,high-100),probabilities=(.5,.5),horizon_days=365,path=[100,100-dip,low,high],cost=.005)
        b = alt(f"100 → {100-safe_dip} at six months → 98 or 108 at 12 months (50% each). Same cost and horizon; no guarantee.",
                f"100 → {100-safe_dip} à six mois → 98 ou 108 à 12 mois (50 % chacun). Mêmes frais et horizon ; aucune garantie.",
                outcomes=(-2,8),probabilities=(.5,.5),horizon_days=365,path=[100,100-safe_dip,98,108],cost=.005)
        card(f"D{i+1:02}","trajectory","trajectory_tolerance",a,b,True,100)

    for i in range(4):
        gain=100+i*50
        card(f"A{i+1:02}","uncertainty","ambiguity",alt(f"+{gain} {currency} with an unknown probability; otherwise 0.",f"+{gain} {currency} avec une probabilité inconnue ; sinon 0.",outcomes=(gain,0)),
             alt(f"50% chance of +{gain} {currency}; otherwise 0.",f"50 % de chance de +{gain} {currency} ; sinon 0.",outcomes=(gain,0),probabilities=(.5,.5)))
        later=102+i*6
        card(f"H{i+1:02}","uncertainty","time_preference",alt(f"{later} {currency} certain in one year.",f"{later} {currency} certains dans un an.",outcomes=(later,),probabilities=(1,),horizon_days=365),alt(f"100 {currency} certain today.",f"100 {currency} certains aujourd’hui.",outcomes=(100,),probabilities=(1,)))
    styles = [
        (("Monthly review", "Revue mensuelle"),("Annual review", "Revue annuelle")),
        (("Reinvest distributions", "Réinvestir les distributions"),("Receive regular income", "Recevoir un revenu régulier")),
        (("Use a transparent systematic rule", "Utiliser une règle systématique transparente"),("Use a simple static allocation", "Utiliser une allocation statique simple")),
        (("Allow periodic tactical shifts within the same risk limits", "Autoriser des ajustements tactiques dans les mêmes limites de risque"),("Keep strategic weights stable", "Garder les poids stratégiques stables")),
        (("Review portfolio weekly", "Examiner le portefeuille chaque semaine"),("Review portfolio quarterly", "Examiner le portefeuille chaque trimestre")),
        (("Accumulate total wealth", "Accumuler le patrimoine total"),("Prioritize predictable cash flows", "Privilégier des flux prévisibles")),
        (("Use several independent investment styles", "Utiliser plusieurs styles d’investissement indépendants"),("Use one transparent core allocation", "Utiliser une allocation cœur transparente")),
        (("Rebalance at a defined drift threshold", "Rééquilibrer à un seuil d’écart défini"),("Rebalance on a fixed calendar", "Rééquilibrer à dates fixes")),
    ]
    for i,(a,b) in enumerate(styles):
        card(f"P{i+1:02}","style","management_style",alt(*a),alt(*b))
    for i in range(4):
        original=result[i]
        card(f"C{i+1:02}","consistency","decision_consistency",original["canonical_a"],original["canonical_b"],False,original["reference_wealth"],original["id"])
    return result


def session(seed, currency="USD"):
    if type(seed) is not int or not 0 <= seed < 2**32:
        raise ValueError("invalid_seed")
    rng=random.Random(seed)
    source=bank(currency)
    by_id={c["id"]:c for c in source}
    blocks={name:[c for c in source if c["block_id"]==name] for name in QUOTAS}
    repeats=rng.sample(blocks["consistency"],2)
    anchors=[by_id[c["pair_id"]] for c in repeats]
    lottery=anchors+rng.sample([c for c in blocks["lottery"] if c not in anchors],6)
    frame_pairs=rng.sample(range(6),3)
    frames=[by_id[f"F{2*i+j+1:02}"] for i in frame_pairs for j in range(2)]
    ambiguity=rng.sample([c for c in blocks["uncertainty"] if c["dimension"]=="ambiguity"],2)
    patience=rng.sample([c for c in blocks["uncertainty"] if c["dimension"]=="time_preference"],2)
    selected={"lottery":lottery,"framing":frames,"trajectory":rng.sample(blocks["trajectory"],6),
              "uncertainty":ambiguity+patience,"style":rng.sample(blocks["style"],4),"consistency":repeats}
    presented=[]
    for name,items in selected.items():
        swaps=[False]*(len(items)//2)+[True]*(len(items)//2)
        rng.shuffle(swaps)
        for item,swap in zip(items,swaps):
            a,b=(item["canonical_b"],item["canonical_a"]) if swap else (item["canonical_a"],item["canonical_b"])
            en,fr=LABELS[name]
            presented.append({**item,"swapped":swap,"block":en,"a":a["en"],"b":b["en"],
                              "fr":{"block":fr,"a":a["fr"],"b":b["fr"]},
                              "display_a":a,"display_b":b,
                              "prudent_response":("like" if swap else "dislike") if item["scored"] else None})
    # Separate economically paired/repeated prompts so immediate memory is less dominant.
    for _ in range(200):
        rng.shuffle(presented)
        positions={c["id"]:i for i,c in enumerate(presented)}
        frame_positions={p:[i for i,c in enumerate(presented) if c["pair_id"]==p] for p in {c["pair_id"] for c in frames}}
        if all(abs(positions[c["id"]]-positions[c["pair_id"]])>=3 for c in repeats) and all(abs(a-b)>=3 for a,b in frame_positions.values()):
            break
    for i,c in enumerate(presented,1):
        c["presented_order"]=i
    assert Counter(c["block_id"] for c in presented)==QUOTAS
    return dict(version=VERSION,seed=seed,currency=currency,session_id=f"{VERSION}:{seed}:{currency}",cards=presented)


def canonical_choice(card, response):
    if response not in {"like","dislike"}:
        return None
    display_a=response=="like"
    return "A" if display_a != card["swapped"] else "B"


def round_score(value):
    return floor(value+.5)


def score(seed, currency, responses, confidence=None, locales=None):
    if not isinstance(responses,dict) or any(v not in CHOICES for v in responses.values()):
        raise ValueError("Invalid responses")
    cards=session(seed,currency)["cards"]
    ids={c["id"] for c in cards}
    if not set(responses)<=ids:
        raise ValueError("unknown_card")
    if confidence is not None and (type(confidence) is not int or not 1<=confidence<=5):
        raise ValueError("invalid_confidence")
    if locales is not None and (not isinstance(locales,dict) or not set(locales)<=ids or any(x not in {"en","fr"} for x in locales.values())):
        raise ValueError("invalid_locale")
    scored=[c for c in cards if c["scored"]]
    decisions={c["id"]:canonical_choice(c,responses.get(c["id"])) for c in cards}
    n=sum(decisions[c["id"]] is not None for c in scored)
    prudent=sum(decisions[c["id"]]=="B" for c in scored)
    total=len(scored)
    dimensions={}
    for name in ("risk_tolerance","loss_sensitivity","trajectory_tolerance","ambiguity","time_preference","management_style"):
        subset=[c for c in cards if c["dimension"]==name]
        resolved=[decisions[c["id"]] for c in subset if decisions[c["id"]] is not None]
        dimensions[name]={"answered":len(resolved),"total":len(subset),"canonical_b_fraction":resolved.count("B")/len(resolved) if resolved else None}
    inconsistencies=[];pairs_checked=0
    for c in cards:
        if c["block_id"]=="consistency":
            a,b=decisions[c["id"]],decisions[c["pair_id"]]
            if a and b:
                pairs_checked+=1
                if a!=b:inconsistencies.append(c["id"])
    framing=[];framing_checked=0
    for pair in sorted({c["pair_id"] for c in cards if c["block_id"]=="framing"}):
        a,b=[decisions[c["id"]] for c in cards if c["pair_id"]==pair and c["block_id"]=="framing"]
        if a and b:
            framing_checked+=1
            if a!=b:framing.append(pair)
    counts=Counter(responses.values())
    return dict(version=VERSION,score=round_score(1+29*prudent/n) if n/total>=.7 else None,
                coverage=n/total,answered=n,total_scored=total,prudent_fraction=prudent/n if n else None,
                sensitivity=[round_score(1+29*prudent/total),round_score(1+29*(prudent+total-n)/total)],
                counts={**{k:counts[k] for k in CHOICES},"unpresented":len(cards)-len(responses)},
                dimensions=dimensions,confidence=confidence,inconsistencies=inconsistencies,pairs_checked=pairs_checked,
                framing_differences=framing,framing_pairs_checked=framing_checked,status="experimental",
                session_id=f"{VERSION}:{seed}:{currency}")
