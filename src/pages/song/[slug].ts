import type { APIRoute } from 'astro';

export const prerender = false;

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
    url: `/song/${slug}`,
    datePublished: new Date((row.created_at ?? 0) * 1000).toISOString(),
    dateModified: new Date((row.updated_at ?? row.created_at ?? 0) * 1000).toISOString(),
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
      background:
        radial-gradient(circle at 20% -10%, rgba(56, 189, 248, 0.12), transparent 32%),
        radial-gradient(circle at 85% 10%, rgba(94, 234, 212, 0.14), transparent 35%),
        linear-gradient(140deg, #050a12 0%, #060910 45%, #050910 100%);
    }
    .shell {
      position: relative;
      z-index: 1;
      width: min(960px, calc(100% - 32px));
      margin: 0 auto;
      padding: 44px 0 72px;
    }
    .glow {
      position: fixed;
      inset: -20% auto auto 30%;
      height: 320px;
      width: 320px;
      background: radial-gradient(circle, rgba(14,165,233,0.18), transparent 55%);
      filter: blur(48px);
      opacity: 0.9;
      animation: floaty 12s ease-in-out infinite alternate;
    }
    .card {
      margin-top: 18px;
      padding: 28px 26px 30px;
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 22px;
      box-shadow: 0 25px 60px rgba(8, 47, 73, 0.25);
      backdrop-filter: blur(16px);
    }
    .hero {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 999px;
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255,255,255,0.08);
      width: fit-content;
      color: #a5f3fc;
    }
    .eyebrow-dot {
      display: inline-block;
      height: 8px;
      width: 8px;
      border-radius: 999px;
      background: #34d399;
      box-shadow: 0 0 0 8px rgba(52, 211, 153, 0.16);
    }
    h1 {
      margin: 0;
      font-size: clamp(32px, 4vw, 44px);
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: #f8fafc;
    }
    .artist { margin: 0; color: #cbd5e1; font-size: 18px; }
    .meta-line {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 6px;
    }
    .badge {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      padding: 10px 14px;
      border-radius: 14px;
      background: rgba(45, 212, 191, 0.12);
      color: #99f6e4;
      border: 1px solid rgba(45,212,191,0.3);
      font-weight: 600;
      font-size: 13px;
    }
    .badge.secondary {
      background: rgba(148, 163, 184, 0.1);
      color: #e2e8f0;
      border-color: rgba(148, 163, 184, 0.2);
    }
    .badge svg { height: 16px; width: 16px; }
    .meta-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      margin-bottom: 14px;
      border-radius: 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      color: #a5f3fc;
      font-weight: 600;
      font-size: 13px;
    }
    pre {
      white-space: pre-wrap;
      line-height: 1.7;
      font-size: 16px;
      margin: 0;
      color: #e2e8f0;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      margin-bottom: 14px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.05);
      color: #e2e8f0;
      text-decoration: none;
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: transform 120ms ease, border-color 120ms ease;
    }
    .back-link:hover { transform: translateX(-2px); border-color: rgba(103, 232, 249, 0.6); }
    .back-link svg { height: 16px; width: 16px; }
    @media (max-width: 640px) {
      .card { padding: 22px 18px; }
      .shell { padding-top: 34px; }
      .meta-line { gap: 8px; }
      .badge { width: 100%; justify-content: center; }
    }
    @keyframes floaty {
      0% { transform: translateY(0px); opacity: 0.9; }
      100% { transform: translateY(12px); opacity: 0.75; }
    }
    @media (prefers-reduced-motion: reduce) {
      .glow { animation: none; }
      .back-link { transition: none; }
    }
  </style>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <div class="glow" aria-hidden="true"></div>
  <main class="shell">
    <a href="/" class="back-link" aria-label="Kembali ke halaman pencarian">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /><path d="M9 12h12" /></svg>
      <span>Kembali ke pencarian</span>
    </a>

    <header class="hero">
      <span class="eyebrow"><span class="eyebrow-dot"></span> Lirik Lagu Rohani · ${languageText.toUpperCase()}</span>
      <h1>${titleText}</h1>
      ${artistText ? `<p class="artist">oleh ${artistText}</p>` : ''}
      <div class="meta-line">
        <span class="badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l3 3" /></svg>
          Edge render
        </span>
        <span class="badge secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          Diupdate ${updatedHuman}
        </span>
      </div>
    </header>

    <article class="card">
      <div class="meta-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        Bahasa ${languageText.toUpperCase()} · Simpan untuk offline? gunakan simpan halaman.
      </div>
      <pre>${bodyText || 'Lirik belum tersedia.'}</pre>
    </article>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};
