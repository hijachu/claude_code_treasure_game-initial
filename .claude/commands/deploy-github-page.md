---
description: Deploy this project's static frontend to GitHub Pages (production) and report the live URL
allowed-tools: Bash(gh*), Bash(git*), Bash(npm install*), Bash(npm run build*), Bash(npx gh-pages*), Bash(curl*), Bash(brew*), Read, Write, Edit
---

Deploy this project's static frontend to GitHub Pages, guiding the user through any missing prerequisites (GitHub login, repo creation) along the way, and report both the GitHub repo URL and the live Pages URL.

## Step 1: Ensure `gh` CLI is installed and authenticated

- Run `command -v gh`.
- **If `gh` is NOT installed:**
  - Run `command -v brew`.
    - If Homebrew is available, install it now: `brew install gh`. Tell the user this is a one-time setup step.
    - If Homebrew is also unavailable, stop and tell the user to install Homebrew from https://brew.sh (or `gh` directly from https://cli.github.com), then re-run this command.
- **Now that `gh` is installed**, run `gh auth status`.
  - If authenticated, get the username with `gh api user --jq .login` — this is `<owner>`.
  - If **not** authenticated, `gh auth login` is interactive (opens a browser / prompts for input) and can't be driven non-interactively. Stop and tell the user to run one of, in their terminal or via `!` in this chat:
    - `gh auth login` (pick "GitHub.com" → "HTTPS" → "Login with a web browser")
    - or, if they already have a personal access token: `! echo "$GITHUB_TOKEN" | gh auth login --with-token`
    Then re-run this command.
- **Fallback (no `gh`, e.g. non-macOS without Homebrew):** use a `GITHUB_TOKEN` personal access token instead.
  - Check `[ -n "$GITHUB_TOKEN" ] && echo set || echo unset`.
  - If **unset**, tell the user to create a token at https://github.com/settings/tokens (classic, scopes: `repo`) and run `export GITHUB_TOKEN=...` (or `! export GITHUB_TOKEN=...`), then re-run this command.
  - If **set**, get `<owner>` with: `curl -s -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user`, reading the `login` field from the JSON.
  - Never echo or log `GITHUB_TOKEN`.

## Step 2: Determine the target repo name

- If this command was invoked with an argument (e.g. `/deploy-github-page my-repo`), use that as `<repo>`.
- Otherwise, default `<repo>` to the current directory's name.

## Step 3: Ensure a local git repo with at least one commit exists

- `git rev-parse --is-inside-work-tree` — if it fails, run `git init`.
- `git log -1` — if it fails (no commits yet), stage and commit everything:
  ```bash
  git add -A
  git commit -m "Initial commit"
  ```
- If commits already exist but there are uncommitted changes, just note this to the user — don't auto-commit their work-in-progress.

## Step 4: Ensure the GitHub repo exists and the source code is pushed

- Run `git remote get-url origin`.
- **If no `origin` remote exists:**
  - With `gh` authenticated:
    ```bash
    gh repo create <owner>/<repo> --public --source=. --remote=origin --push
    ```
    This creates the GitHub repo, wires up the `origin` remote, and pushes the current branch in one step. (Use `--public` — GitHub Pages on free plans requires a public repo unless the account has GitHub Pro/Team/Enterprise.)
  - With `GITHUB_TOKEN` only:
    ```bash
    curl -s -X POST -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" \
      https://api.github.com/user/repos -d '{"name":"<repo>","private":false}'
    git remote add origin https://github.com/<owner>/<repo>.git
    git push -u origin HEAD
    ```
- **If `origin` already exists:** confirm it points at `<owner>/<repo>` (adjust `<owner>`/`<repo>` to match the existing remote if different), and push the current branch if it hasn't been pushed yet:
  ```bash
  git push -u origin HEAD
  ```

**Pre-flight check** — before moving on, confirm and report to the user that all of the following are true:
- ✅ `gh` CLI installed and authenticated as `<owner>` (or `GITHUB_TOKEN` fallback working)
- ✅ Local git repository initialized with at least one commit
- ✅ GitHub repo `<owner>/<repo>` exists and the source code is pushed

If any of these aren't true, stop here and resolve it (per Steps 1–4) before proceeding to the build/deploy steps below.

## Step 5: Set Vite's `base` path for GitHub Pages without breaking other deploy targets

- GitHub Pages serves a project repo at `https://<owner>.github.io/<repo>/`, so built asset URLs must be prefixed with `/<repo>/`. The existing Vercel deploy serves from `/`, so `base` cannot be hardcoded to `/<repo>/`.
- In `vite.config.ts`, ensure the `defineConfig` object has:
  ```ts
  base: process.env.GH_PAGES ? '/<repo>/' : '/',
  ```
  - Use `/` (not `/<repo>/`) if `<repo>` is `<owner>.github.io` — that's a user/org page served at the domain root.
- If this line already exists, just verify `<repo>` matches the actual repo name and fix it if not.

## Step 6: Ensure `gh-pages` is installed

- Check whether `node_modules/gh-pages` exists. If not:
  ```bash
  npm install -D gh-pages
  ```

## Step 7: Build with the GitHub Pages base path

```bash
GH_PAGES=true npm run build
```

If this fails, run `npm run build` (without `GH_PAGES`) to check whether the failure is pre-existing, then fix any TypeScript/build errors before retrying.

## Step 8: Deploy the build output to the `gh-pages` branch

```bash
npx gh-pages -d build -m "Deploy to GitHub Pages"
```

- If `gh auth login` was used, git push credentials are already configured via `gh`'s credential helper and this should just work.
- If using `GITHUB_TOKEN` and this fails with an auth error, retry with a token-authenticated remote (don't echo the token):
  ```bash
  npx gh-pages -d build -m "Deploy to GitHub Pages" -r https://x-access-token:${GITHUB_TOKEN}@github.com/<owner>/<repo>.git
  ```

## Step 9: Enable GitHub Pages (first deploy only)

- Check current status:
  ```bash
  gh api repos/<owner>/<repo>/pages --jq .html_url
  ```
  (or with curl/`GITHUB_TOKEN`: `curl -s -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/repos/<owner>/<repo>/pages`)
- If that returns 404 (not yet configured), enable it with source = `gh-pages` branch:
  ```bash
  gh api repos/<owner>/<repo>/pages -X POST -f "source[branch]=gh-pages" -f "source[path]=/"
  ```
  - A `409` response means Pages is already configured — that's fine, ignore it.

## Step 10: Report the result

Reply to the user with both URLs:
> Deployed successfully.
> - Repo: https://github.com/`<owner>`/`<repo>`
> - Live site: https://`<owner>`.github.io/`<repo>`/

Note that the first activation of Pages can take a minute or two to go live (subsequent deploys to `gh-pages` update the same URL within seconds).

## Notes

- Only the static frontend (`build/`) is published. The `server/` Express app (auth, SQLite, etc.) is not hosted on GitHub Pages — features that depend on it (login, persisted scores) won't work there, same caveat as the Vercel deploy.
- The `gh-pages` branch is fully managed by this command and overwritten on every deploy — don't make manual edits to it.
- Treat `GITHUB_TOKEN` as a secret: never write it into `vite.config.ts`, source files, or any committed file.
- If the repository is renamed later, update the `base` path in `vite.config.ts` to match and redeploy.
