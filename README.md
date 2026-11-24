# RiskMatch — V3

**Understand risk. Explore strategies. Build a suitable portfolio.**

A collaborative quantitative US multi-asset research and development platform. RiskMatch combines portfolio discovery cards with a reproducible quantitative engine. V3 currently contains a demonstration Web App and shared engine using synthetic data; no financial model or questionnaire has been independently validated.

**Treasury-only fixed-income universe:** T-Bills, Treasury Notes, Treasury Bonds, TIPS and bond ETFs with verified exclusively Treasury exposure. No corporate debt, MBS, agencies, municipal debt or mixed bond ETFs. US equities, REITs, eligible futures and USD cash remain in scope. Treasury Curve (slope/curvature) replaces the original Credit factor, retaining 13 factors.

## User Experience

1. Mandate: goals, investable wealth, horizon, cash flows, constraints, base currency and financial loss capacity.
2. RiskMatch Discovery: swipeable simulated financial choices (like/dislike, unsure and skip).
3. Profile: exploratory risk-aversion score 1–30 (30 = strong aversion), uncertainty, consistency and separate preferences. The score is neither a diagnosis nor automatic calibration of λ.
4. Quantitative engine: candidate generation, optimization, simulations and out-of-sample testing.
5. RiskMatch Explore: swipe among mandate-compatible portfolios with comparable risk, costs, losses and goals.
6. Final comparison: likes create a shortlist, not a trade. Explicit informed paper selection only.

The original V2 animated opening and visual/audio identity are retained. The interface offers English and French, with English as the project and API language. After the opening, users must select an existing local simulation save and enter its four-digit PIN, or create a new save with a name and four-digit PIN. The studio navigation is hidden until a save is unlocked. Each save has independent simulation state. No online account or real client data.

## Documentation

- [Detailed A–Z checklist](CHECKLIST_A_Z.md): chapter tickets, 75 catalog entries, metrics, tests and validation gates.
- [Quantitative guide](docs/QUANT_GUIDE_A_Z.md): universe, data, 11 objectives, 22 construction methods, 19 strategies, 13 factors and 10 dynamic models.
- [Behavioral protocol](docs/RISKMATCH_BEHAVIORAL.md): cards, scoring, research and validation.
- [Portfolio matching](docs/PORTFOLIO_MATCHING.md): UX, filtering, ranking and confirmation.
- [Architecture](docs/ARCHITECTURE.md): components, contracts and flow.
- [Roadmap](docs/ROADMAP.md): execution order, milestones and acceptance criteria.
- [Dependency registry](docs/TASK_DEPENDENCIES.csv): direct prerequisites and topological order; `python scripts/task_dependencies.py --ready` lists available tickets.
- [Data and security](docs/DATA_SECURITY.md): licenses, privacy and controls.
- [Contributing](CONTRIBUTING.md): branches, reviews and conventions.

## Start on Mac

1. Double-click `INSTALL.command` (already executed on this Mac).
2. Double-click `START.command`. Web App: http://127.0.0.1:3000 ; JupyterLab: http://127.0.0.1:8888/lab (authenticated link in `.run/jupyter.log`).
3. Open the [checklist](CHECKLIST_A_Z.md) and [single notebook](notebooks/RiskMatch_V3.ipynb). Follow prerequisites and work on chapters 01 and 12 together.
4. Double-click `STOP.command` to stop the V3 services.

If macOS prevents opening a .command file, run the same script in Terminal from this directory. Both services are strictly bound to 127.0.0.1; port 8888 must be available.

```bash
./INSTALL.command
./START.command
# Local tests (no server required)
PYTHONPATH=src .venv/bin/python -m unittest discover -s tests/unit
.venv/bin/python scripts/check_notebooks.py
.venv/bin/python scripts/task_dependencies.py --check
.venv/bin/python scripts/task_dependencies.py --ready
```

## Research Cycle

One notebook with 27 numbered chapters and a navigable table of contents. Six chapters contain initial executable experiments; the remaining chapters are research plans. Validate methods in the notebook, extract into `src/riskmatch/`, test, expose via `apps/api/` and integrate into `apps/web/`. Both use the same Python engine.

The prototype uses a local Python standard-library HTTP server and HTML/CSS/JS. No Node web dependencies are required. React/FastAPI remain planned. The MVP includes 30 unvalidated cards, exploratory score with coverage and sensitivity, six predefined allocations filtered by hypothetical stress, synthetic metrics, shortlist and paper selection. Horizon is collected but does not yet change allocations. Complete mandate, real data, optimizers and costs remain planned.

## Publish on GitHub

Create a separate empty **private** repository, e.g. RiskMatch-V3 (do not overwrite TindeRisk), then:

```bash
git init -b main
git add .
git status
git commit -m "Initialize RiskMatch V3"
git remote add origin REPOSITORY_URL
git push -u origin main
```

Local permissions previously prevented Git initialization and server launch from the assisted session. Run commands in Terminal if needed. CI, issue and PR templates are included; no remote publication is implied. Invite authorized collaborators, protect main, require review and CI. Never publish client data, API keys or licensed market data.

## Positioning

Research and paper trading initially. Obtain independent model and applicable regulatory review (including Switzerland if offered there) before personalized real investment advice or execution. No guaranteed returns or incentives to increase risk.
