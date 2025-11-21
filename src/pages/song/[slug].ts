import type { APIRoute } from 'astro';

type Env = {
  LYRICS_DB: D1Database;
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

export const GET: APIRoute = async ({ params, locals }) => {
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: titleText,
    inLanguage: languageText,
    byArtist: artistText ? { '@type': 'MusicGroup', name: artistText } : undefined,
    url: `/song/${slug}`,
    datePublished: new Date((row.created_at ?? 0) * 1000).toISOString(),
    dateModified: new Date((row.updated_at ?? row.created_at ?? 0) * 1000).toISOString(),
  };

  const html = `<!doctype html>
<html lang="id" style="background:#0b1224;color:#e2e8f0;">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${titleText} — Lirik Rohani</title>
  <meta name="description" content="${artistText ? `Lirik "${titleText}" oleh ${artistText}` : `Lirik "${titleText}"`}">
  <meta property="og:title" content="${titleText} — Lirik Rohani" />
  <meta property="og:description" content="${artistText ? `Lirik "${titleText}" oleh ${artistText}` : `Lirik "${titleText}"`}" />
  <meta property="og:type" content="website" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>
    body { font-family: Inter, system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; }
    .card { max-width: 720px; margin: 0 auto; padding: 24px; background: rgba(15,23,42,0.75); border:1px solid #1e293b; border-radius: 16px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p.meta { margin: 0 0 16px; color: #94a3b8; }
    pre { white-space: pre-wrap; line-height: 1.6; font-size: 16px; }
  </style>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <article class="card">
    <p class="meta">Lirik Lagu Rohani ${languageText}</p>
    <h1>${titleText}</h1>
    ${artistText ? `<p class="meta">oleh ${artistText}</p>` : ''}
    <pre>${bodyText || 'Lirik belum tersedia.'}</pre>
  </article>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};
