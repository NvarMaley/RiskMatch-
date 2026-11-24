# Experiment and Data Registry

Each research run uses a unique `run_id` (UTC date/time + ticket + short random identifier), schema version and model version. Record the Git commit, dependency lock digest, dataset version/hash and decision-time cutoff, seed, split boundaries, instrument IDs, return frequency, currency and units, assumptions, metrics and warnings. Keep records of failed and rejected experiments. Store only synthetic or redistribution-authorized results in Git; keep licensed data, derived proprietary outputs and client records local.

| Run ID | Ticket | Data | Evidence | Status |
|---|---|---|---|---|
| 20261124-infra01-local | INFRA.01 | Synthetic tests; environment only | Python 3.12; requirements.lock; 13 Python and 5 Node tests passed; 8 synthetic notebook cells executed | Local installation verified |
| 20261124-contracts-local | SYS.01–02 | Synthetic fixture | tests/unit/test_contracts.py; notebook g00-contract-demo | Contract and fail-closed registry checks passed; no model approved |

Use `data/raw/` for immutable authorized sources, `data/processed/` for versioned transformations and `data/features/` for derived features. Keep dataset license and provenance metadata local if identifying restricted contents. Shared tests must use synthetic fixtures or licensed redistributable examples, never require a WRDS account. Logical data versions are content hashes plus cutoff and transformation version. Never log passwords, tokens, client identities or raw client responses.
