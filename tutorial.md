# Tutorial: Deploy “Lirik Rohani” to Cloudflare as lirikrohani.com

Follow these atomic steps; check each box as you finish it.

## 0) Prereqs
- [ ] Node 18+ and npm installed.
- [ ] Cloudflare account with the `lirikrohani.com` domain already added/verified (DNS proxied through Cloudflare).
- [ ] Logged in locally: `npx wrangler login`.
- [ ] Set secrets once: `wrangler secret put ADMIN_TOKEN`.

## 1) Install deps locally
- [ ] `npm install`

## 2) Set site URL to the real domain
- [ ] In `astro.config.mjs`, set `site` to `https://lirikrohani.com` (or export `SITE_URL=https://lirikrohani.com`).
- [ ] Ensure `.env` (if used) mirrors the same `SITE_URL` so canonical tags/sitemaps are correct.

## 3) Create D1 database (if not existing)
- [ ] `wrangler d1 create lyrics-dev`
  - Copy the returned `uuid` into `wrangler.jsonc` → `database_id` and `preview_database_id` for binding `LYRICS_DB`.
  - Keep `migrations_dir` at `drizzle/migrations`.

## 4) Create KV namespaces
- [ ] `wrangler kv namespace create LYRICS_CACHE`
  - Copy `id` and `preview_id` into `wrangler.jsonc` for `LYRICS_CACHE`.
- [ ] `wrangler kv namespace create AUDIT_LOG`
  - Copy ids into the `AUDIT_LOG` entry.

## 5) Regenerate Worker types (optional but nice)
- [ ] `npm run cf-typegen` to refresh `worker-configuration.d.ts` bindings.

## 6) Apply database migrations to D1
- [ ] `npm run db:migrate` (uses `drizzle/migrations/0001_init.sql`).

## 7) Seed starter songs (optional)
- [ ] Local: `npm run db:seed`
- [ ] Remote: `CLOUDFLARE_ENV=production D1_NAME=LYRICS_DB npm run db:seed` (uses prod binding ids from `wrangler.jsonc`).

## 8) Local development (Cloudflare runtime emulation)
- [ ] `npm run dev`
- [ ] Health check: `curl http://localhost:4321/api/health` should return `{ ok: true }`.

## 9) Preview with Pages/Workers
- [ ] `npm run preview` (build + `wrangler pages dev dist`).

## 10) Deploy build to Cloudflare Pages
- [ ] `npm run deploy` (build + `wrangler pages deploy`).
- [ ] Confirm deploy succeeded in the Cloudflare Pages dashboard (project name `my-astro-app` unless renamed).

## 11) Map the custom domain lirikrohani.com
- [ ] In Pages → Custom Domains: add `lirikrohani.com` and `www.lirikrohani.com` to this project.
- [ ] DNS: ensure Cloudflare created the CNAME for `www` to the Pages edge host; apex uses flattened CNAME/ALIAS automatically.
- [ ] Page Rule / Redirect: create `www.lirikrohani.com/*` → `https://lirikrohani.com/$1` (301), and force `http://*` → `https://*`.
- [ ] TLS: keep “Full” or “Full (strict)” enabled; enable HSTS (include subdomains, preload optional).

## 12) Post-deploy smoke checks (production)
- [ ] `curl https://lirikrohani.com/api/health` → expect `{ ok: true }`.
- [ ] Run a search in browser; confirm results render and snippets highlight.
- [ ] Open a song page; ensure lyrics display, JSON-LD present, and OG tags reference `lirikrohani.com`.
- [ ] Admin: log in, create a test song, delete it, and confirm audit log writes.

## 13) SEO + analytics hooks
- [ ] Submit sitemap to Google Search Console and Bing Webmaster after domain verification (TXT record via Cloudflare).
- [ ] Enable Cloudflare Web Analytics or PostHog; verify page view and search query events land.
- [ ] Validate rich results for a song URL using Google’s Rich Results Test.

## 14) Operations
- [ ] `wrangler tail` to watch logs for 5xx after launch.
- [ ] Adjust KV cache TTL in `src/pages/api/search.ts` if traffic patterns change.
- [ ] Add new migrations to `drizzle/migrations` and rerun Step 6 whenever schema changes.
