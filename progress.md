2025-11-21
- Created plan.md outlining milestones for Astro 5.16 + Cloudflare Workers/D1/KV + Drizzle + FTS5 lyric search and admin flow.
- Added AGENTS.md defining working roles.
- Reworked plan.md into phased checklist (Phase 0 MVP + later phases) with atomic tasks; updated AGENTS.md with rule to tick checkboxes and log progress.
- Implemented Phase 0: React/tailwind/shadcn base, framer-motion, Biome lint/format, Drizzle schema + FTS5 triggers/migration, seed script, search/health APIs with KV cache, UI pages (home search island, song detail w/ JSON-LD), robots/sitemap, Cloudflare adapter + wrangler bindings.
- Phase 1 start: Added token-protected middleware, admin UI island with CRUD and refresh, admin API with audit logging to KV, unified D1 prod/preview binding in wrangler.jsonc, added AUDIT_LOG binding and ADMIN_TOKEN env typings.
