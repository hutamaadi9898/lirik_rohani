export const prerender = true;

export async function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Sitemap: /sitemap.xml
`;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
