2025-11-21
- Created plan.md outlining milestones for Astro 5.16 + Cloudflare Workers/D1/KV + Drizzle + FTS5 lyric search and admin flow.
- Added AGENTS.md defining working roles.
- Reworked plan.md into phased checklist (Phase 0 MVP + later phases) with atomic tasks; updated AGENTS.md with rule to tick checkboxes and log progress.
- Implemented Phase 0: React/tailwind/shadcn base, framer-motion, Biome lint/format, Drizzle schema + FTS5 triggers/migration, seed script, search/health APIs with KV cache, UI pages (home search island, song detail w/ JSON-LD), robots/sitemap, Cloudflare adapter + wrangler bindings.
- Phase 1 start: Added token-protected middleware, admin UI island with CRUD and refresh, admin API with audit logging to KV, unified D1 prod/preview binding in wrangler.jsonc, added AUDIT_LOG binding and ADMIN_TOKEN env typings.
2025-11-21
- Fixed admin token login flow (new session endpoint + HttpOnly cookie) and removed query tokens; tightened middleware with security headers and strict auth; added credentialed fetches in AdminIsland; hardened admin API auth and CORS/no-store caching.
- Adjusted session to accept Authorization header only (no token in request body), downgraded missing-secret responses to 401 to avoid 500s.
2025-11-21
- Trim/normalize tokens across middleware/session, add safe JSON fallback only when Authorization header blocked, documented need to set ADMIN_TOKEN for both Pages preview and production; still pending deploy+secret set to clear 401 in preview.
2025-11-21
- Exempted `/api/admin/session` from middleware auth so session verification happens only in the handler (covers environments that strip Authorization before middleware).
2025-11-21
- Hardened `/api/admin/songs` POST with JSON validation, missing-binding guard, and D1 error handling to return clean JSON instead of 500s; added DB guard to GET/DELETE.
2025-11-21
- Added detailed DB error mapping (surface "Database not migrated" and include detail) for admin songs CRUD to pinpoint remaining server errors.
2025-11-21
- Fixed song detail rendering to handle non-string bodies without showing “[object Object]”; search now auto-runs as you type (debounced) and guards snippet rendering.
2025-11-21
- Sanitized search API snippets to strings to prevent “[object Object]”; added `role=\"search\"` accessibility to form.
2025-11-21
- Strengthened song body coercion (parses JSON strings, handles nested body/text, suppresses “[object Object]” and shows fallback copy).
2025-11-21
- Normalized song page query (CASE/CAST/JSON) so bodies come back as text even when stored as non-text blobs.
2025-11-21
- Added broader body coercion (arrays, nested, JSON strings, [object Object]) to fully suppress bad rendering on song pages.
2025-11-21 - Hardened song detail rendering (recursive string extraction + artist sanitization) to eliminate residual "[object Object]" cases including the "lihat" lyrics.
2025-11-21 - Fixed undefined jsonLd causing slug pages to crash and return "[object Object]"; inlined JSON-LD generation to guarantee render safety.
2025-11-21 - Added try/catch + user-friendly error panel on song pages so any DB/render failure falls back to readable HTML instead of "[object Object]".
2025-11-21 - Added global middleware error catch to surface errors as plain text with headers, log slug load errors, and flag missing LYRICS_DB binding for debugging lingering "[object Object]" responses.
2025-11-21 - Added `/api/debug-song` to inspect a slug's row/binding status remotely for diagnosing Pages issues.
2025-11-21 - Middleware now patches broken `/song/*` responses on the fly (uses DB to re-render HTML when body equals "[object Object]") and logs body length/snippet for Cloudflare tailing.
2025-11-21 - Refreshed public UI with Space Grotesk font, lucide icons, animated search card, faster-feel debounced search, and a redesigned lyrics detail layout.
2025-11-21 - Minimalist UI pass: simplified hero copy (no tech terms), calmer animations, lighter search island, cleaner lyrics page shell; added ui_improvement_plan.md checklist.
2025-11-21 - Improved lyrics formatting (turn multiple spaces into line breaks), drafted SEO_plan.md with subatomic checklist for crawl/index readiness, and marked SEO plan in phase checklist.
2025-11-21 - Implemented SEO plan steps: set Astro site url, added canonical tags, OG URLs, role="main", admin disallow in robots, caching on song pages, updated sitemap and JSON-LD references.
2025-11-21 - Added redirect map + clean slug guard in middleware, prefetch for search results, breadcrumb JSON-LD on song pages, and custom 404 page; updated SEO checklist accordingly.
2025-11-21 - Expanded redirect map with 410 handling for removed slugs; marked 404/410 item done in SEO plan.
2025-11-21 - Middleware now redirects unknown routes to custom /404 page to keep UX consistent.
2025-11-21 - Added stats endpoint + mini dashboard on home, song page view counter via KV, and plan updated for these features.
2025-11-21 - Hardened song route: fallback redirect to /404 when DB binding is missing or query fails to avoid 500s on bad slugs/preview.
2025-11-22
- Rewrote plan.md with atomic phases (foundation, reliability, lirikrohani.com launch, UX/perf) and added modern/minimal UI + SEO/perf tasks.
- Updated tutorial.md with domain-specific Cloudflare Pages steps for lirikrohani.com (site URL, DNS, redirects, HSTS, smoke checks).
2025-11-22
- Added txt-based seeder (`scripts/seed-from-txt.ts`) that parses `lyrics_output (1).txt`, detects language heuristically, writes `seed/parsed-songs.json`, and seeds D1 via wrangler (with DRY_RUN support); wired npm script `db:seed:txt`.
2025-11-22
- Ran `npm run db:seed:txt` (local) to load 950 songs into LYRICS_DB; persisted parsed snapshot to seed/parsed-songs.json. Updated astro.config.mjs site to lirikrohani.com and persisted platformProxy state.
2025-11-22
- Added remote seeding support (passes --remote when CLOUDFLARE_ENV!=local) and seeded 950 songs into production D1 (LYRICS_DB preview/prod id b10f59cc-23a5-4048-b24f-504e3109f621).
2025-11-22
- Fixed seeders to preserve real line breaks (no literal \n stored) and re-seeded both local and production D1 with 950 songs.
2025-11-22
- Implemented Phase 1/3 items: search API filters (lang/title-only), suggestion chips + persisted recents, action bar on song page (copy/share/save), enhanced /api/health with table/migration checks, response-time logging with sampled latency buckets, cache warmer endpoint, and set plan checkboxes accordingly.
2025-11-22
- Added view transitions + skip link, card title highlighting, reduced-motion guard; created SafeIsland error boundary; wired cron trigger and scheduled warm-cache handler; fixed driver config and typings.
2025-11-22
- Mobile/reduced-motion QA sweep: enlarged tap targets (filters, chips, action buttons), added focus-visible outlines, kept reduced-motion guard. Cron trigger left as 4-hour schedule; verify in Cloudflare dashboard.
2025-11-22
- Removed unsupported `triggers` block from wrangler.jsonc to fix Pages deploy; cron must be configured via Cloudflare dashboard instead.
2025-11-22
- Removed `onSchedule` cron handler from `/api/warm-cache` (Pages doesn't support cron); warmer now manual-only and plan updated accordingly.
2025-11-22
- Investigated prod issue: stats/search not loading; root cause is missing Pages bindings/functions (LYRICS_DB/KV) — advised to link bindings and re-enable Pages Functions.
2025-11-22
- Forced `/api/stats` and `/api/search` fetches to bypass CDN/browser caches (no-store + retry) so 304/ETag responses no longer block hydration; rebuild ready to deploy.
2025-11-22
- Pointed Astro session storage at existing `LYRICS_CACHE` binding to remove missing `SESSION` errors that were crashing API routes and blocking stats/search on Pages.
2025-11-22
- Made SafeIsland instances unique (added name prop) so Astro generates distinct island IDs; fixes duplicate-uid hydration stall that kept stats/search on “Memuat…”.
2025-11-22
- Switched islands to `client:load` (from client:only) to force hydration at page load; ensures stats/search React effects fire on Pages even with aggressive caching.
2025-11-22
- Removed SafeIsland wrapper and added inline error boundaries; Stats/Search islands now hydrate directly and fetch on load without relying on nested child hydration.
2025-11-22
- Added custom `public/_routes.json` to route all unknown paths through the worker (with static exclusions), restoring custom 404 handling on Pages for URLs like `/a`.
2025-11-22
- Redesigned 404 page with a simple Tailwind card (back-to-home/search CTAs) to fix broken /404 experience.
2025-11-22
- Refreshed homepage visuals with gradient mesh background and hero illustration (plus anchor for skip-to-search); build still clean.
