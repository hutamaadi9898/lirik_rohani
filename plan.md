Goal: Ship a fast, mobile-first Astro 5.16 app for searching Indonesian worship song lyrics (title or inline text) with minimal admin, strong SEO, and Cloudflare Workers + D1 + KV + Drizzle + FTS5. Checkboxes must be updated as work completes.

## Phase 0 — MVP (ship read-based search + basic pages)
- Repo/tooling
  - [x] Write initial plan with phases
  - [x] Enable TypeScript strict mode + path aliases
  - [x] Add React/islands support and base shadcn/ui setup
  - [x] Add Framer Motion starter utilities
  - [x] Add lint/format scripts (eslint, prettier, biome or similar)
  - [x] CI: typecheck + astro check (minimal)
- Data layer (D1 + Drizzle)
  - [x] Define Drizzle schema: `songs` table (id, title, artist, language, body, metadata, created_at, updated_at)
  - [x] Add FTS5 virtual table `songs_fts` with `body` + `title` indexed
  - [x] Create triggers to keep `songs_fts` in sync (insert/update/delete)
  - [x] Seed script for initial songs (manual admin-only use)
- Search API (Worker)
  - [x] `/api/search` endpoint: prepared statement MATCH, limit/offset, rank ordering
  - [x] KV cache for hot queries with short TTL
  - [x] Health/readiness endpoint
- Web experience
  - [x] Home/search page (SSR) with React island search bar
  - [x] Result list with skeleton/loading + empty/error states
  - [x] Song detail SSR page with canonical URL + OG/Twitter meta
  - [x] Mobile-first layout; ensure focus/keyboard flows
- SEO/perf
  - [x] robots.txt + sitemap.xml
  - [x] JSON-LD Song schema on detail pages
  - [x] Image/font optimization; limit client JS to islands
- Deployment
  - [x] Configure @astrojs/cloudflare adapter + platformProxy for local dev
  - [x] wrangler bindings for D1 & KV (dev/prod)
  - [ ] Deploy MVP to Cloudflare (Pages/Workers) and verify search works

## Phase 1 — Admin + reliability
- [x] Auth: single-user token or signed link middleware
- [x] Admin UI: list/create/update songs, FTS rebuild button
- [x] Audit log to KV (append-only) for admin actions
- [x] Harden admin token flow (no query tokens, HttpOnly session, security headers)
- [ ] Better error boundaries + user-facing fallbacks
- [ ] P99 latency SLO (<75ms warm) measured and logged

## Phase 2 — Polish, observability, growth
- [ ] Feature flags via KV for staged rollouts
- [ ] Analytics + structured logs
- [ ] Accessibility pass (screen reader labels, contrast, reduced motion)
- [ ] Core Web Vitals monitoring and Lighthouse budget
- [ ] Content ops: slug rules, redirect map, 404/410 handling
