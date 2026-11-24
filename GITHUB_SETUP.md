# GitHub Infrastructure

Use the dedicated V3 repository at https://github.com/NvarMaley/RiskMatch-. Git was initialized and the initial commit was confirmed on `origin/main`. Repository visibility, collaborator access, protected main, and actual remote CI still require owner verification. CI, issue/PR templates and .gitignore are prepared.

1. Verify the existing remote and private visibility (do not recreate the repository).
2. Open Terminal in the project directory.
3. Until main protection is configured, the owner may publish the reviewed bootstrap changes:

```sh
git status
git add .
git diff --cached --stat
git commit -m "G00: reproducible environment and shared contracts"
git push origin main
```

Inspect git status before committing. Never include client data, secrets, licensed market data or .venv.

4. Invite authorized collaborators in Settings.
5. Protect main: require PR, review and CI before merge where plan supports.
6. Create branch `feature/01-client-profile` and one issue per checklist ticket.

CI installs the Python 3.12 lock, runs tests, executes explicitly approved synthetic notebook cells, checks Git exclusions, and validates the single notebook, the 75-entry catalog and dependency registry. Add financial tests incrementally. The full gate requires CI on a second machine or runner and a reviewed PR. Keep licensed data local.
