export const prerender = false;

type Env = { LYRICS_DB?: D1Database };

export async function GET({ locals }: { locals: any }) {
  const env = locals.runtime?.env as Env | undefined;
  const site = (process.env.SITE_URL ?? 'https://lirikrohani.com').replace(/\/$/, '');
  const origin = site;

  let rows:
    | { slug: string; updated_at: number | null }[]
    | undefined;

  if (env?.LYRICS_DB) {
    const res = await env.LYRICS_DB.prepare(
      'SELECT slug, updated_at FROM songs ORDER BY updated_at DESC LIMIT 500;',
    ).all();
    rows = res.results as typeof rows;
  }

  const urls = [
    { loc: `${origin}/`, lastmod: new Date().toISOString() },
    ...(rows?.map((row) => ({
      loc: `${origin}/song/${row.slug}`,
      lastmod: row.updated_at
        ? new Date(row.updated_at * 1000).toISOString()
        : undefined,
    })) ?? []),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `<url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`,
  )
  .join('')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
