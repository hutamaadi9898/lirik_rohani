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
