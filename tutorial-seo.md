# SEO & Discoverability Playbook (LirikRohani.com)

A practical, atomic checklist to keep the site search-friendly on Google, Bing, and AI-powered experiences.

## 0) One-time setup
- [ ] Set `SITE_URL=https://lirikrohani.com` in hosting env vars; confirm `astro.config.mjs` `site` matches.
- [ ] Turn on HTTPS + HSTS (include subdomains) in Cloudflare.
- [ ] Verify domain property in Google Search Console and Bing Webmaster Tools (DNS TXT). Add sitemap URL.
- [ ] Add `www → apex` and `http → https` 301 rules in Cloudflare.
- [ ] Disable/relax Bot Fight/Managed Challenge for main site paths to avoid blocking crawlers.

## 1) Crawlability
- [ ] Keep `robots.txt` allowing `/` and pointing to `https://lirikrohani.com/sitemap.xml`.
- [ ] Ensure `_routes.json` routes unknown paths to the worker so 404 page returns proper 404 status.
- [ ] Avoid soft-404 redirects; missing pages should return status 404 with helpful HTML.
- [ ] Remove `noindex` from public pages; keep `noindex` only for `/admin` if needed via header/rules.

## 2) Sitemaps
- [ ] `/sitemap.xml` must list homepage + latest 500 songs; confirm lastmod timestamps populate.
- [ ] After each content update, ping: `https://www.google.com/ping?sitemap=https://lirikrohani.com/sitemap.xml` (or let Search Console recrawl).
- [ ] Keep sitemap size <50k URLs; if content grows, split per language and add sitemap index.

## 3) Metadata & structured data
- [ ] Each page has `<title>` (brand + intent) and `<meta name="description">` summarizing content in Bahasa.
- [ ] Home page includes JSON-LD `WebSite` + `SearchAction` (already added).
- [ ] Song pages include `MusicRecording` schema (already present) with `byArtist`, `inLanguage`, `datePublished/Modified`.
- [ ] Add `BreadcrumbList` JSON-LD on song pages (already present).
- [ ] Use canonical URLs on every page (`astro.config site` + BaseLayout canonical).
- [ ] Add `og:title`, `og:description`, `og:type`, `og:url`, `twitter:card=summary_large_image` (already in BaseLayout). Plan: add OG image generation later.

## 4) Performance (affects SEO)
- [ ] LCP image: preload or set `fetchpriority="high"`; serve in modern formats (WebP/AVIF) and right dimensions.
- [ ] Turn on Cloudflare caching with stale-while-revalidate; keep APIs cacheable where safe.
- [ ] Minify HTML/JS/CSS (Astro does); avoid unnecessary client JS—keep islands lean.
- [ ] Measure Core Web Vitals via PageSpeed Insights; aim LCP <1.8s, CLS <0.1, TBT <150ms.

## 5) Content quality
- [ ] Ensure each lyric page has unique title, artist, clean formatting; avoid duplicates.
- [ ] Add short intro/context per song (optional) to improve relevance.
- [ ] Provide internal links: from search results & "Terbaru" list to song pages; consider related songs section.
- [ ] Keep Bahasa-first copy; include English titles where relevant.

## 6) Logs & monitoring
- [ ] Track search errors/5xx via Cloudflare Logs; alert if spike >1%.
- [ ] Re-run Lighthouse weekly; record LCP/CLS/TBT and act on regressions.
- [ ] Monitor Search Console for coverage errors (404, soft 404, blocked by robots).

## 7) AI/LLM friendliness
- [ ] Ensure `robots.txt` allows crawl (no AI-specific blocks) unless policy changes.
- [ ] Keep pages lightweight, structured HTML; avoid heavy JS gating content.
- [ ] JSON-LD + clean semantic headings (`h1` for title, `h2` sections) for easy parsing.
- [ ] Provide sitemap and open access (no paywall) so AI crawlers can ingest.

## 8) Deployment checklist
- [ ] Run `npm run build` locally; confirm no 404 assets in `dist`.
- [ ] Deploy to Cloudflare Pages; purge cache for `/`, `/sitemap.xml`, `/robots.txt`, and `/hero-bible.webp`.
- [ ] Hit `/api/health` and a sample search `/api/search?q=kasih` to ensure bindings work.
- [ ] Manually test 404 (`/tidak-ada`) returns custom page with status 404.

## 9) Future enhancements
- [ ] Dynamic OG images per song (Satori/ResVG in Worker) once stable.
- [ ] Add `hreflang` if English corpus grows; split sitemaps by locale.
- [ ] Add `manifest.webmanifest` + icons for PWA hints.
- [ ] Add structured FAQ for top search queries (create `/faq` page with FAQPage schema).
