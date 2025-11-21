# Tutorial: Deploy “Lirik Rohani” Astro app to Cloudflare (Workers + D1 + KV)

Follow these atomic steps; stop once each checkbox is done.

## 0) Prereqs
- [ ] Node 18+ and npm installed.
- [ ] Cloudflare account with D1 + KV access.
- [ ] Logged in locally: `npx wrangler login`.
- [ ] Set secrets (once): `wrangler secret put ADMIN_TOKEN`

## 1) Install deps locally
- [ ] `npm install`

## 2) Create D1 database
- [ ] `wrangler d1 create lyrics-dev`
  - Copy the returned `uuid` and set it in `wrangler.jsonc` under `"database_id"`.
  - Keep `binding` as `LYRICS_DB`, `migrations_dir` already set to `drizzle/migrations`.

## 3) Create KV namespaces
- [ ] `wrangler kv namespace create LYRICS_CACHE`
  - Copy `id` and `preview_id` into `wrangler.jsonc` → `"kv_namespaces"` entry.
- [ ] `wrangler kv namespace create AUDIT_LOG`
  - Copy ids into the second `"kv_namespaces"` entry.

## 4) Regenerate Worker types (optional but nice)
- [ ] `npm run cf-typegen` (refreshes `worker-configuration.d.ts` with bindings)

## 5) Apply database migrations to D1
- [ ] `npm run db:migrate`
  - Uses the `drizzle/migrations/0001_init.sql` FTS5 schema + triggers.

## 6) Seed starter songs (optional)
- [ ] `npm run db:seed`
  - Reads `seed/songs.json`; runs against `LYRICS_DB` (local by default).  
  - For remote environments: `CLOUDFLARE_ENV=production D1_NAME=LYRICS_DB npm run db:seed`
    (expects `wrangler` to pick the production binding ids).

## 7) Local development (Cloudflare runtime emulation)
- [ ] `npm run dev`
  - Uses `@astrojs/cloudflare` `platformProxy` to expose `locals.runtime.env`.
  - API checks: `curl http://localhost:4321/api/health`.

## 8) Preview with Pages/Workers
- [ ] `npm run preview` (build + `wrangler pages dev dist`)

## 9) Deploy
- [ ] `npm run deploy` (build + `wrangler pages deploy`)
  - Ensure `wrangler.jsonc` has production `database_id` and KV `id` set before running.

## 10) Post-deploy smoke checks
- [ ] `curl https://<your-domain>/api/health` → expect `{ ok: true }`
- [ ] Run a search anecdotally in browser; confirm results and snippets render.
- [ ] Verify `robots.txt` and `sitemap.xml` load.

## 11) Operational tips
- KV cache TTL is 5 minutes; adjust in `src/pages/api/search.ts` if traffic patterns change.
- Migrations: add new SQL files into `drizzle/migrations`, then rerun step 5.
- Logs/metrics: `wrangler tail` during debug; health endpoint is lightweight and safe.
