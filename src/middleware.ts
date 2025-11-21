import type { MiddlewareHandler } from 'astro';

const PROTECTED_PREFIXES = ['/admin', '/api/admin'];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);

  if (PROTECTED_PREFIXES.some((path) => url.pathname.startsWith(path))) {
    const token = context.request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      url.searchParams.get('token') ||
      context.cookies.get('admin_token')?.value;

    const expected = context.locals.runtime?.env?.ADMIN_TOKEN;
    if (!expected || token !== expected) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  return next();
};
