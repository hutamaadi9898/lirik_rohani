export const prerender = true;

export async function GET() {
  const site = process.env.SITE_URL ?? 'https://lirikrohani.com';
  const sitemap = `${site.replace(/\/$/, '')}/sitemap.xml`;
  const body = `User-agent: *
Allow: /
Disallow: /admin
Sitemap: ${sitemap}
`;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
