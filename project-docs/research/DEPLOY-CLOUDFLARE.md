# Deploying the static sites to Cloudflare Pages

`../../.github/workflows/deploy-sites.yml` builds the docs site and Storybook and
uploads them to Cloudflare Pages with Wrangler (Direct Upload). GitHub Actions
does the build; Cloudflare only hosts the files, so its own Git integration is
not used.

| Site      | Pages project       | Build output                              |
| --------- | ------------------- | ----------------------------------------- |
| Docs      | `retrojb-docs`      | `../../apps/docs/out`                           |
| Storybook | `retrojb-storybook` | `../../apps/retrojb-storybook/storybook-static` |

Push to `main` deploys to production at `https://<project>.pages.dev`. A pull
request from this repository deploys a preview at
`https://<branch>.<project>.pages.dev`. Pull requests from forks are skipped,
because GitHub does not give them secrets.

- [One-time setup](#one-time-setup)
- [Adding a site](#adding-a-site)
- [Notes](#notes)

## One-time setup

1. **Create a Cloudflare account** (free) at
   [dash.cloudflare.com/sign-up][cf-signup]. No domain or payment method is
   needed for `*.pages.dev`.
2. **Create the Pages projects.** Name them to match the table (or change the
   `project` values in the workflow):

   ```bash
   npx wrangler login
   npx wrangler pages project create retrojb-docs --production-branch=main
   npx wrangler pages project create retrojb-storybook --production-branch=main
   ```

   The projects must exist before the first deploy. A project name becomes part
   of the public URL, and `pages.dev` names are global, so pick ones that are
   free.

3. **Create an API token.** Cloudflare dashboard → Manage Account → Account API
   tokens → Create Token → Custom token. Give it one permission: **Account →
   Cloudflare Pages → Edit**. Copy the value; it is shown once.
4. **Find your account ID.** It is on the Overview page of any domain you have
   added, in the API section of the right-hand menu. If you have no domain yet,
   `npx wrangler whoami` prints it after you log in.
5. **Add both as repository secrets.** GitHub → Settings → Secrets and variables
   → Actions → New repository secret:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

Then run the workflow from the Actions tab (Deploy Sites → Run workflow) or push
to `main`.

## Adding a site

Add an entry to `strategy.matrix.site` in the workflow with a project name, the
Turbo `--filter` package name, and the build output directory, then create the
Pages project with the command above. The site must build to static files.

## Notes

- Free-plan limits per Pages site: 20,000 files and 25 MiB per file. Both sites
  are well under that today (Storybook is 157 files, about 14 MB). The
  500-builds-a-month limit applies to Cloudflare's own Git builds; this workflow
  builds in GitHub Actions instead.
- The docs site is a Next.js static export (`output: "export"` in
  `../../apps/docs/next.config.js`). Adding a route handler, middleware, or anything
  else that needs a server makes `next build` fail rather than deploy a broken
  site.
- Rotate the API token by creating a new one, updating the secret, and deleting
  the old token. Scope it to Pages only; it can deploy to any Pages project in
  the account.

---

author: John Baltes

updated: 2026-11-05

---

[cf-signup]: https://dash.cloudflare.com/sign-up
