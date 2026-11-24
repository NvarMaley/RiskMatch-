# RiskMatch Explore — Portfolio Matching

## Pipeline
1. Generate candidates from mandate, strategies and construction methods in the A–Z guide. Retain versioned models, data and assumptions.
2. Filter hard constraints (liquidity, concentration, leverage, derivatives, financial capacity, currency, horizon). If required risk is incompatible, explain the funding gap and offer to reconsider horizon, contributions or goal; never raise risk automatically.
3. Evaluate out of sample, costs, stress, scenarios and uncertainty. Eliminate invalid or dominated models on relevant criteria. Never guarantee historical drawdown limits.
4. Present at most 6–12 diverse initial candidates with identical format/horizon, neutral/controlled ordering and option to view all. Do not favor past performance.
5. Like/dislike/skip and undo. Optional reason: loss, income, horizon, complexity, ESG, fees. Do not infer new risk tolerance from likes alone.
6. Compare shortlist, benchmark and simple reference. If no compatible preference, ask for clarification rather than force a match. Recheck mandate, data and costs before explicit choice.

## Standard Card
Name, objective, asset classes, allocation and futures notionals, expected return with interval and assumptions, volatility, ES, historical drawdown and stress, estimated goal probability, costs, turnover, currency, FX risk, liquidity, benchmark, OOS period and calculation date. Distinguish realized, simulated and forecast data. Show loss percentages and currency, fit reasons and limitations.

## Ranking
After hard filtering, normalize criteria on documented stable scales. Example S=Σ w_j u_j(x_j), weights from explicit client goals, sum=1. Criteria may include success probability, ES, costs, robustness, simplicity and preferences. Test weight sensitivity and display tradeoffs. Likes are soft preferences, never overrides of hard guardrails. Construction methods are not 22 indistinct products.

## Proposed States and API
candidate → validated → presented → liked/disliked/skipped → shortlisted → reviewed → selected_for_paper_trading. API POST /profiles, GET /sessions/{id}/cards, POST /sessions/{id}/responses, GET /profiles/{id}/risk-report, POST /portfolio-runs, GET /portfolio-runs/{id}/candidates, POST /candidates/{id}/swipes, POST /selections. Authentication, ownership checks, idempotency, minimal sensitive logging. No real-order endpoint in MVP.
