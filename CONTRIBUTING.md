# Contributing

1. Choose an available ticket using `python scripts/task_dependencies.py --ready`. Open an issue with ID, goal, assumptions, acceptance criteria, dependencies and owner.
2. Create branch `feature/123-description` from main. No direct commits to main.
3. Add tests, formula documentation, units, sources, limitations and seed where applicable.
4. Run `pytest` and `ruff check .`; open a linked PR.
5. At least one review; independent quantitative review for models and security review for personal data. Squash merge after green CI.

Use English for code, documentation, notebook, issues and PRs. Web UI provides EN/FR localization. Use Python type hints, public docstrings, snake_case, UTC timestamps and explicit currencies. Separate live data and fixtures; no performance results without period, benchmark and costs. Document architecture decisions in docs/ through PR. Do not add licenses without co-author agreement.
