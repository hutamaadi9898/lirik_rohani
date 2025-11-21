import type { APIRoute } from 'astro';

export const prerender = false;

type Env = {
  LYRICS_DB: D1Database;
  LYRICS_CACHE?: KVNamespace;
};

const normalizeBody = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : String(v))).join('\n');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export const GET: APIRoute = async ({ params, locals, request }) => {
  const slug = params.slug ?? '';
  const env = (locals.runtime?.env ?? {}) as Env;

  if (!env.LYRICS_DB) {
    return new Response('Database binding missing', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }

  const row = await env.LYRICS_DB.prepare(
    `SELECT id, slug, title, artist, language, body, created_at, updated_at
     FROM songs
     WHERE slug = ?
     LIMIT 1;`,
  )
    .bind(slug)
    .first();

  if (!row) {
    return Response.redirect('/404', 302);
  }

  const titleText = typeof row.title === 'string' ? row.title : String(row.title ?? '');
  const artistText = typeof row.artist === 'string' ? row.artist : null;
  const languageText = typeof row.language === 'string' && row.language.trim() ? row.language : 'id';
  const bodyText = normalizeBody(row.body);
  const formattedBody = bodyText.replace(/[^\S\r\n]{2,}/g, '\n').trim();
  let views = 0;
  if (env.LYRICS_CACHE) {
    const key = `pv:${slug}`;
    const current = await env.LYRICS_CACHE.get(key);
    views = Number(current ?? 0) || 0;
    const sampleRate = 0.25; // write 25% of requests to reduce KV writes under load
    if (Math.random() < sampleRate) {
      const increment = 1 / sampleRate;
      env.LYRICS_CACHE.put(key, String(views + increment));
      views += increment;
    }
  }
  const requestUrl = new URL(request.url);
  const canonicalUrl = `${requestUrl.origin}/song/${slug}`;
  const updatedHuman = new Date((row.updated_at ?? row.created_at ?? 0) * 1000).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: titleText,
    inLanguage: languageText,
    byArtist: artistText ? { '@type': 'MusicGroup', name: artistText } : undefined,
    url: canonicalUrl,
    datePublished: new Date((row.created_at ?? 0) * 1000).toISOString(),
    dateModified: new Date((row.updated_at ?? row.created_at ?? 0) * 1000).toISOString(),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Beranda',
        item: `${requestUrl.origin}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: titleText,
        item: canonicalUrl,
      },
    ],
  };

  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${titleText} — Lirik Rohani</title>
  <meta name="description" content="${artistText ? `Lirik \"${titleText}\" oleh ${artistText}` : `Lirik \"${titleText}\"`}">
  <meta property="og:title" content="${titleText} — Lirik Rohani" />
  <meta property="og:description" content="${artistText ? `Lirik \"${titleText}\" oleh ${artistText}` : `Lirik \"${titleText}\"`}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: 'Space Grotesk', 'Inter', system-ui, -apple-system, sans-serif;
      color: #e2e8f0;
      background: #070b11;
      display: flex;
      justify-content: center;
    }
    main {
      width: min(820px, 100%);
      padding: 32px 18px 72px;
    }
    a.back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 12px;
      color: #cbd5e1;
      text-decoration: none;
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.04);
      transition: transform 140ms ease, border-color 140ms ease;
    }
    a.back:hover { transform: translateX(-2px); border-color: rgba(103,232,249,0.6); }
    header { margin: 18px 0 12px; }
    h1 {
      margin: 6px 0 0;
      font-size: clamp(30px, 4vw, 40px);
      letter-spacing: -0.02em;
      color: #f8fafc;
    }
    .meta { color: #cbd5e1; margin: 6px 0 0; font-size: 16px; }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      margin: 8px 0;
      border-radius: 12px;
      background: rgba(103, 232, 249, 0.08);
      color: #a5f3fc;
      border: 1px solid rgba(103, 232, 249, 0.3);
      font-weight: 600;
      font-size: 13px;
    }
    article {
      margin-top: 18px;
      padding: 22px 20px 24px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
    }
    pre {
      white-space: pre-wrap;
      line-height: 1.7;
      font-size: 16px;
      margin: 0;
      color: #e2e8f0;
    }
    .subtle { color: #94a3b8; font-size: 14px; margin-top: 6px; }
    @media (max-width: 640px) {
      main { padding: 26px 14px 56px; }
      article { padding: 18px 16px; }
    }
  </style>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
</head>
<body>
  <main>
    <a class="back" href="/" aria-label="Kembali ke pencarian">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" height="16" width="16"><path d="M15 18l-6-6 6-6" /><path d="M9 12h12" /></svg>
      Kembali
    </a>

    <header>
      <div class="pill">Bahasa ${languageText.toUpperCase()}</div>
      <h1>${titleText}</h1>
      ${artistText ? `<p class="meta">${artistText}</p>` : ''}
      <p class="subtle">Diperbarui ${updatedHuman}</p>
    </header>

    <article>
      <p class="subtle">Dilihat ${Math.round(views).toLocaleString('id-ID')} kali</p>
      <pre>${formattedBody || 'Lirik belum tersedia.'}</pre>
    </article>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  });
};
