# RiskMatch Discovery — Behavioral Protocol

## Objective and Limits
Measure stated and revealed willingness to accept financial risk in simulated situations. Separate financial capacity, subjective tolerance, risk required by goals, knowledge and experience. Swipes do not reveal actual cognitive mechanisms or diagnose excitement or addiction. Biases are hypotheses to test, not personal labels. No biometric collection or exploitation of vulnerabilities.

## Initial Bank: 60 Cards, Target Session of 30

| Block | Per session | Bank | Target measure |
|---|---:|---:|---|
| Lotteries and trade-offs | 8 | 16 | risk-return preferences, certainty equivalents |
| Gains/losses and framing | 6 | 12 | loss sensitivity, framing |
| Paths and drawdowns | 6 | 12 | fluctuation tolerance, reaction to losses |
| Uncertainty and horizon | 4 | 8 | ambiguity, patience, horizon |
| Management preferences | 4 | 8 | stability, income, frequency, style |
| Consistency repeated pairs | 2 | 4 | within-session reliability |

Proposed prototype counts, not a scientific conclusion. Pilot 30 cards, then adjust based on reliability, fatigue and precision. Independent mandatory financial questionnaire: capital, debt, reserves, horizon, income, withdrawals, experience, tolerable losses and restrictions.

## Card Mechanics

Like = would accept; dislike = would not; unsure = do not know; skip = nonresponse. Show the safe alternative explicitly in lotteries. Present probabilities/amounts consistently, controlled random order and comparable units; no animations rewarding large gains. No jackpot, confetti, streak, real money, risk reward or artificial urgency. Response time does not measure excitement; optional and consented, only for quality analysis, never initial score.

## Example Cards (Unvalidated Prototypes)

| ID | Question: accept A rather than B? | A | B | Dimension |
|---|---|---|---|---|
| L01 | Same mean gain, more uncertainty | 50% +200 CHF, 50% 0 | +100 CHF certain | risk |
| L02 | Potential gain with loss | 50% +150, 50% −100 CHF | 0 CHF | mixed lottery |
| L03 | Certain or variable gain | 50% +220, 50% 0 CHF | +100 CHF | certainty equivalent |
| F01 | Simulated situation | 80% retain 1000 CHF, 20% retain 800 CHF | retain 960 CHF | framing |
| F02 | Reframe F01 | 80% loss 0, 20% loss 200 on 1000 CHF | loss 40 CHF | framing consistency |
| D01 | Simulated 10-year allocation | accept temporary 20% decline, uncertain recovery | lower-volatility allocation with lower growth potential | drawdown |
| A01 | Two probabilities | 50% chance of 100 CHF | 100 CHF with unknown probability | ambiguity |
| H01 | Time preference | 110 CHF in a year | 100 CHF today | patience, not direct aversion |
| P01 | Management style | signal-based adjustments and more turnover | stable allocation | style |

D01 must show distribution and costs in testable version; do not assume recovery. F01/F02 are economically equivalent; differences are exploratory framing indicators. Ambiguity/time choices are not automatically included in risk score. English and French formulations must preserve identical meaning and probabilities.

## Three-Level Scoring

**MVP:** only prespecified, balanced, documented directional risk items. For item i, a_i=1 if prudent response and 0 if risk-taking. p=Σ w_i a_i/Σ w_i over valid answers; score=1+29p (rounded for display). Equal weights initially. Exclude unsure/skip and flag missingness. Do not score with fewer than 70% of scored items answered (provisional threshold). Keep other dimensions separate. Show missing-response sensitivity bounds; not a validated confidence interval.

**Research:** fit IRT/logistic P(prudent response)=sigmoid(a_i(θ−b_i)); test discrimination, difficulty, dimensionality and invariance. Calibrate on an independent sample, map θ monotonically to 1–30 and version transformation. If data do not support one dimension, show multidimensional profile and limit use of aggregate score.

**Finance:** separately estimate γ or λ from choices between wealth distributions. CRRA U(W)=W^(1−γ)/(1−γ), W>0; log W at γ=1. Model P(A)=sigmoid(κ[EU(A)−EU(B)]) with decision noise κ. Alternatives: prospect theory (reference point, loss sensitivity, probability weighting), without conflating coefficients. Mean-variance λ depends on horizon, units, choices and constraints; 1–30 is not λ. Compare OOS models and report uncertainty.

## Experimental Validation

1. Psychometrics/behavioral-finance specialist review, cognitive interviews and accessibility.
2. Exploratory pilot (e.g. 30–50 volunteers, insufficient for definitive validation); measure understanding, dropout, time and distributions.
3. Determine sample size via power analysis/IRT simulation; consent, diversity and preregistration.
4. Test-retest and internal consistency where appropriate (omega), convergent validity with licensed instrument, discriminant validity and prediction of independent choices.
5. Differential item functioning by language/order; calibration and uncertainty. Person-level train/validation/test split.
6. Version items, parameters and decisions; no validated-service deployment without independent review. Reassess after major client changes.

Concepts to study: expected utility, prospect theory (Kahneman & Tversky), Holt–Laury lottery tasks, Grable–Lytton financial tolerance scales and IRT. Check rights before reproducing existing questionnaires.

## Data Contract
Card: id, version, locale, dimension, alternatives, probability, payoff, score_direction, scoring_weight, pair_id. Response: pseudonymous_session_id, card_id/version, choice, presented_order, optional_consent_latency. Profile: score, score_version, coverage, sensitivity_range, dimensions, inconsistencies, suitability_status. Deterministic, auditable calculation independent of portfolio swipes.
