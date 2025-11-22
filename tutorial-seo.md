# SEO & Discoverability Playbook (LirikRohani.com)

Atomic, implementation-ready checklist for Astro + Cloudflare Pages/Workers. Use it before every deploy and during weekly QA.

## 0) One-time setup
- [ ] Set `SITE_URL=https://lirikrohani.com` in hosting env vars; confirm `astro.config.mjs` `site` matches.
- [ ] Enable HTTPS + HSTS (include subdomains, preload) in Cloudflare → Security > HTTP Strict Transport Security.
- [ ] Verify domain property (TXT) in Google Search Console + Bing Webmaster; submit sitemap URL.
- [ ] Add `www → apex` and `http → https` 301 rules in Cloudflare Rules; test with `curl -I http://www.lirikrohani.com`.
- [ ] Disable/relax Bot Fight/Managed Challenge for main site paths to avoid blocking crawlers.
- [ ] Default HTML `lang="id"` + `charset="utf-8"`; staging/protected envs behind basic auth + `x-robots-tag: noindex` header.

## 1) Crawlability
- [ ] `robots.txt` allows `/` and points to `https://lirikrohani.com/sitemap.xml`; keep JS/CSS allowed.
- [ ] `_routes.json` funnels unknown paths to worker so 404 page returns real 404 status (no soft redirects).
- [ ] Use 410 for deleted lyrics; avoid redirecting 404s to home.
- [ ] Public pages stay `index,follow`; only `/admin` and staging use `noindex` via headers.
- [ ] Quick check (replace SLUG):
  ```bash
  curl -I https://lirikrohani.com/
  curl -I https://lirikrohani.com/song/SLUG
  curl -I https://lirikrohani.com/robots.txt
  curl -I https://lirikrohani.com/sitemap.xml
  ```

## 2) Sitemaps
- [ ] `/sitemap.xml` lists homepage + latest 500 songs with `<lastmod>` ISO-8601 from `updated_at`.
- [ ] URLs are absolute HTTPS, match canonical slugs, exclude admin/noindex routes.
- [ ] After each content publish, ping Google: `curl https://www.google.com/ping?sitemap=https://lirikrohani.com/sitemap.xml`.
- [ ] If >50k URLs, split per language and add sitemap index.
- [ ] Validate: `npx sitemap-validator https://lirikrohani.com/sitemap.xml` (optional dev tool).

## 3) Metadata & structured data
- [ ] Every page: `<title>` (intent + brand) + `<meta name="description">` in Bahasa; `<html lang="id">`.
- [ ] Canonical tag on all templates (BaseLayout) derived from `astro.config.site` + pathname.
- [ ] Home: JSON-LD `WebSite` + `SearchAction` (kept up to date with live domain).
- [ ] Song pages: `MusicRecording` JSON-LD with `name`, `byArtist`, `inLanguage`, `datePublished`, `dateModified`, `keywords` (chorus terms), plus `BreadcrumbList`.
- [ ] Open Graph/Twitter: `og:title`, `og:description`, `og:type`, `og:url`, `twitter:card=summary_large_image`.
- [ ] Fallback `og:image`/`twitter:image` 1200x630 WebP/PNG <512KB stored in `public/og-default.webp`; set `theme-color` and touch icons.
- [ ] Admin/staging: add `x-robots-tag: noindex, nofollow` via Cloudflare rule or route guard.
- [ ] Spot-check rendered head:
  ```bash
  curl -s https://lirikrohani.com/song/SLUG | sed -n '1,80p'
  ```

## 4) Performance (affects SEO)
- [ ] LCP image: preload or `fetchpriority="high"`; serve AVIF/WebP in correct sizes (Astro assets).
- [ ] Fonts: self-host, `preconnect` to font origin, `font-display: swap`; cap weights to used styles.
- [ ] Cloudflare: caching with `stale-while-revalidate`; edge cache static assets; keep API responses short-lived but cacheable.
- [ ] Client JS: keep islands minimal; no blocking third-party scripts; defer analytics.
- [ ] Tailwind purge/treeshake CSS; lazy-load non-critical images.
- [ ] Targets (mobile 4G): LCP <1.8s, CLS <0.1, TBT <150ms. Recheck via PSI/Lighthouse after UI changes.

## 5) Content quality
- [ ] Unique title/artist/slug per lyric; clean stanza formatting (line breaks preserved).
- [ ] Optional 1–2 sentence intro/context per song to improve relevance.
- [ ] Internal links: search results → songs; "Terbaru" list; consider related songs by artist/theme.
- [ ] Bahasa-first copy; include English title in metadata when relevant.
- [ ] Alt text on hero/OG images; avoid keyword stuffing—mention key chorus terms once naturally.
- [ ] Maintain About/Contact page for E-E-A-T; include editor credit and update cadence.
- [ ] QA sample pages monthly for typos/duplicate verses.

## 6) Logs & monitoring
- [ ] Track search errors/5xx via Cloudflare Logs; alert if spike >1%.
- [ ] Re-run Lighthouse weekly; log LCP/CLS/TBT and fix regressions.
- [ ] Monitor Search Console: coverage (404/soft 404/blocked), enhancements, Core Web Vitals.
- [ ] Uptime ping + synthetic: fetch `/song/SLUG`, assert non-empty lyrics + 200 status; alert on failures.
- [ ] Tail KV cache hit rate and D1 latency; keep P99 <75ms warm.

## 7) AI/LLM friendliness
- [ ] `robots.txt` allows crawl (no AI-specific disallow) unless policy changes.
- [ ] Keep content server-rendered HTML; avoid JS gating or text-in-images.
- [ ] Semantic headings (`h1` song title, `h2` sections), ordered verses, ARIA landmarks.
- [ ] JSON-LD present; sitemap accessible without auth.
- [ ] No copy-protection overlays; lyrics remain selectable plain text.

## 8) Deployment checklist
- [ ] Run `npm run build`; ensure `dist/` has no missing assets.
- [ ] Deploy to Cloudflare Pages; purge `/`, `/sitemap.xml`, `/robots.txt`, hero/OG assets.
- [ ] Verify bindings on prod: `/api/health`, `/api/search?q=kasih`, `/api/stats`.
- [ ] Manually hit a missing path (`/tidak-ada`) → custom 404 with 404 status (not 200/302).
- [ ] Re-fetch `/robots.txt` and `/sitemap.xml` post-deploy to confirm canonical host + cache headers.

## 9) Future enhancements
- [ ] Dynamic OG images per song (Satori/ResVG in Worker) once stable.
- [ ] Add `hreflang` if English corpus grows; split sitemaps by locale.
- [ ] Add `manifest.webmanifest` + icons for PWA hints.
- [ ] Add structured FAQ for top search queries (FAQPage schema on `/faq`).
- [ ] Add `web-vitals` client logger feeding KV/Analytics for real-user CWV data.
