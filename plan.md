Goal: Ship lirikrohani.com as a fast, minimalist Astro 5.16 app for Indonesian worship lyrics with great UX, strong SEO, and Cloudflare Workers + Pages + D1 + KV + Drizzle + FTS5. Keep tasks atomic and tick boxes as soon as they’re done.

## Phase 0 — Foundation (mostly done)
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

## Phase 1 — Reliability & admin polish
- [x] Auth: single-user token or signed link middleware
- [x] Admin UI: list/create/update songs, FTS rebuild button
- [x] Audit log to KV (append-only) for admin actions
- [x] Harden admin token flow (no query tokens, HttpOnly session, security headers)
- [ ] Better error boundaries + user-facing fallbacks (keep `/api` and pages from blank states)
- [x] Point Astro session storage to existing KV binding so missing `SESSION` never crashes API routes
- [x] Ensure homepage islands hydrate (unique IDs + direct client load, no SafeIsland render gap)
- [x] P99 latency SLO (<75ms warm) measured and logged
- [x] Add automated DB health check (migrations applied, bindings present) surfaced in `/api/health`
- [x] Background KV cache warmer endpoint; cron scheduling unsupported on Pages (manual trigger only)

## Phase 2 — Launch on lirikrohani.com
- [ ] Set `SITE_URL=https://lirikrohani.com` in env + `astro.config.mjs` and align canonical/OG links
- [ ] Configure Cloudflare Pages project, point to repo, and enable `_routes.json`/`_headers` passthrough
- [ ] Map custom domain: CNAME `www` → Pages target, apex A/AAAA flattening; force HTTPS
- [ ] Add `www → apex` 301 and `http → https` redirects (Cloudflare Rules)
- [ ] Provision/verify TLS for apex + www; enable HSTS (include subdomains, preload opt-in)
- [ ] Update sitemap/robots to emit `https://lirikrohani.com` URLs and redeploy
- [ ] Search Console + Bing Webmaster: verify domain property via TXT, submit sitemap
- [ ] Production smoke: `/api/health`, search query, lyric detail render, admin login, cache hit log

## Phase 3 — Experience & UI/UX (modern, minimalist, fast)
- [ ] Apply cohesive minimalist theme (two-tone palette, soft glass effect, fluid spacing scale) and document tokens in Tailwind config
- [ ] Add search microcopy in Bahasa + success/failure toasts for admin actions
- [x] View Transitions for search → song detail and back, with reduced-motion guard
- [x] Instant suggestions: suggest top queries/artists as chips (from KV stats) + keyboard focus order
- [x] Filters: quick toggles for bahasa/artist + “only title matches” toggle; remember last filter in localStorage
- [x] Result cards: highlight matched terms, show short lyric snippet with ellipsis + copy button
- [x] Song page: floating action bar (copy lyric, share link, report issue) and scrollspy for sections (verses/chorus)
- [x] Add offline-friendly “Save song” (localStorage) to re-open recently viewed lyrics
- [ ] Accessibility pass: labels, focus rings, skip-to-search link, prefers-reduced-motion variants (partial)
- [ ] QA sweep: mobile breakpoints, tap targets ≥48px, input focus, low-bandwidth mode (no motion, fewer images)

## Phase 4 — Performance, SEO, and growth
- [ ] Dynamic OG image generation per song (Satori/ResVG in Worker) with title/artist branding
- [ ] Image/OG hygiene: 1200x630 WebP fallback logo + per-song cover if available
- [ ] Security headers: CSP (script/style/img/frame), Referrer-Policy strict-origin-when-cross-origin, X-Content-Type-Options, Permissions-Policy
- [ ] Core Web Vitals budget: LCP <1.8s, CLS <0.1, TBT <150ms on 4G; add `web-vitals` client logger to KV/Analytics
- [ ] Analytics + structured logs (Cloudflare Analytics or PostHog) capturing search queries (anonymized) and result clicks
- [ ] Feature flags via KV for staged rollouts (search chips, OG images, offline save)
- [ ] Content ops: slug rules, redirect map, 404/410 handling, and CSV/JSON import validator before writes
- [ ] Internationalization readiness: hreflang scaffolding if English added; split sitemaps by locale
- [ ] Monitoring: uptime ping, wrangler tail dashboards, alert on 5xx/search error rate >1%
