# GitHub Infrastructure

Use a private V3 repository separate from TindeRisk (V1/V2). CI, issue/PR templates and .gitignore are prepared. No remote repository has been created by this setup.

1. Create a private empty RiskMatch-V3 repository without a README.
2. Open Terminal in /Users/nvareese/Desktop/v3.
3. Run:

```sh
git init -b main
git add .
git status
git commit -m "Initialize RiskMatch V3 research workspace"
git remote add origin https://github.com/YOUR_ACCOUNT/RiskMatch-V3.git
git push -u origin main
```

Inspect git status before committing. Never include client data, secrets, licensed market data or .venv.

4. Invite authorized collaborators in Settings.
5. Protect main: require PR, review and CI before merge where plan supports.
6. Create branch `feature/01-client-profile` and one issue per checklist ticket.

CI installs the engine/research dependencies, runs tests and validates the single notebook, the 75-entry catalog and dependency registry. Add financial tests incrementally.
