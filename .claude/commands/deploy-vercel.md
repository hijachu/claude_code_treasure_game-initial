---
description: Deploy this project to Vercel (production) and report the live URL
allowed-tools: Bash(npx vercel*), Bash(vercel*), Bash(npm run build*), Bash(git status*), Read, Write
---

Deploy this project to Vercel and tell the user the resulting production URL.

## Steps

1. **Ensure `vercel.json` matches this project's build output.**
   `vite.config.ts` sets `build.outDir` to `build` (not Vite's default `dist`). Check if `vercel.json` exists at the project root:
   - If missing, create it with:
     ```json
     {
       "buildCommand": "npm run build",
       "outputDirectory": "build"
     }
     ```
   - If it exists, verify `outputDirectory` is `"build"` and fix it if not.

2. **Authenticate via `VERCEL_TOKEN` (no interactive login needed).**
   - Run `npx vercel whoami` first. If it succeeds, you're already authenticated — skip to step 3.
   - If it fails, check whether `VERCEL_TOKEN` is set: run `[ -n "$VERCEL_TOKEN" ] && echo set || echo unset`.
     - If **unset**, stop and tell the user:
       1. Open https://vercel.com/account/tokens in a browser and create a new token (e.g. named "claude-code-deploy").
       2. Export it in their shell for this session: `export VERCEL_TOKEN=...` (or `! export VERCEL_TOKEN=...` to run it directly in this chat), or add it to their shell profile to persist it.
       3. Re-run this command.
     - If **set** but `vercel whoami` still fails, the token may be invalid/expired — ask the user to generate a new one at the URL above.
   - Once `VERCEL_TOKEN` is valid, every `vercel`/`npx vercel` command below picks it up automatically — never echo or log the token value itself.

3. **Deploy to production.** From the project root, run:
   ```bash
   npx vercel --prod --yes
   ```
   - On the very first deploy this may prompt to link the directory to a Vercel project/scope — accept the defaults (current directory name, current account). If the token has access to multiple teams, add `--scope <team>`.

4. **Extract the URL.** The deployment URL is printed on the final line of the command output (a `https://...vercel.app` address, or a custom domain if one is configured).

5. **Report the result.** Reply to the user with a short confirmation and the URL, e.g.:
   > Deployed successfully. Your project is live at: https://<project>.vercel.app

## Notes

- `.vercel/` is already in `.gitignore` — do not commit it.
- Treat `VERCEL_TOKEN` as a secret: never write it into `vercel.json`, source files, or any committed file. `export VERCEL_TOKEN=...` only lasts for the current shell session unless added to a shell profile (e.g. `~/.zshrc`).
- The `server/` Express app (`server/index.js`) is a separate local dev API proxy and is not deployed by this command; only the Vite frontend (`build/`) is deployed to Vercel.
- If the deploy command fails on the build step, run `npm run build` locally first to surface and fix any TypeScript/build errors before retrying.
