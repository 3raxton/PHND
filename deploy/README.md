# Deploy the web app on Vercel

Static host for the Feishin web build, locked to one Navidrome server. Users enter a username and password. Server type, URL, and name come from Vercel environment variables at build time.

This folder and `vercel.json` are the only deploy-specific files. Upstream Feishin files are unchanged.

## Environment variables

In the Vercel project, set these for Production (and Preview, if preview deploys should be locked too). They are read while `deploy/write-settings.mjs` runs, which is during the build. Changing them does nothing until the next deploy.

| Name | Value |
| --- | --- |
| `SERVER_TYPE` | `navidrome` |
| `SERVER_URL` | Your Navidrome URL, including `https://` and the port |
| `SERVER_NAME` | The name shown on the login screen |
| `SERVER_LOCK` | `true` |

The build fails if any of those four are missing.

`SERVER_NAME` is also written into the page title and the Open Graph tags in `index.html`. iMessage and similar apps read those tags. They do not run the script that updates the browser tab. They also cache the preview, so a link that was already shared can keep the old name until that cache expires.

Optional, same names as the Docker image:

| Name | Value |
| --- | --- |
| `ANALYTICS_DISABLED` | `true` to skip the Umami script |

`LEGACY_AUTHENTICATION` does not apply to Navidrome. Set `REMOTE_URL` only when share links must use a different public URL than `SERVER_URL`.

## What the build does

`vercel.json` runs `pnpm run build:web`, which writes the site to `out/web`. Then `node deploy/write-settings.mjs` fills `settings.js.template` from the environment and writes `out/web/settings.js`. That is the same file nginx generates from the template when the Docker image starts. The page loads it with `<script src="settings.js"></script>`.

Optional variables that are not set are written as empty strings, matching the Docker image defaults. Unset `FS_*` theme overrides stay as placeholders, which the app ignores.

`/settings.js` is served with `Cache-Control: no-store`, matching the Docker nginx config.

The app uses hash routes (`/#/home`), so the document stays at `/`. There is no SPA rewrite. A rewrite would leave the browser on a path like `/login`, and the relative `settings.js` URL would miss the lock file.

## Custom domain

1. Import this repository in Vercel. Framework preset is Other (`framework` is `null` in `vercel.json`). Root directory is the repository root.
2. Add the environment variables above, then deploy.
3. In the Vercel project, open Settings, then Domains, and add the domain.
4. At the DNS host, add the record Vercel shows (usually a `CNAME` for a subdomain, or the `A` record Vercel gives for an apex domain).
5. Wait until Vercel marks the domain valid. HTTPS is issued automatically.

## Navidrome

The browser on the Vercel domain calls Navidrome directly. Navidrome 0.64.2 at `SERVER_URL` already sends `Access-Control-Allow-Origin: *`, allows `Content-Type` and `X-Nd-Authorization`, and exposes `X-Nd-Authorization`. No Navidrome CORS setting is required. The host is reachable from the public internet, so friends do not need to be on the tailnet.

## Sync this fork with upstream

Upstream files are untouched, so a sync should not conflict on this deploy.

```bash
git remote add upstream https://github.com/jeffvli/feishin.git
git fetch upstream
git merge upstream/development
```

If upstream later adds its own `vercel.json`, keep this one. It points the build at `web.vite.config.ts` and writes the locked `settings.js`.
