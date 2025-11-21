import type { MiddlewareHandler } from 'astro';

const PROTECTED_PREFIXES = ['/admin', '/api/admin'];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);

  const needsAuth = PROTECTED_PREFIXES.some((path) => url.pathname.startsWith(path));

  if (needsAuth) {
    const expected = context.locals.runtime?.env?.ADMIN_TOKEN;
    const bearer = context.request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const queryToken = url.searchParams.get('token');
    const cookieToken = context.cookies.get('admin_token')?.value;
    const token = bearer || queryToken || cookieToken;

    const valid = expected && token === expected;

    // If token passed via query and valid, set cookie then redirect to clean URL (hiding token).
    if (!valid && queryToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (valid && queryToken) {
      const redirectUrl = new URL(url.href);
      redirectUrl.searchParams.delete('token');
      const res = Response.redirect(redirectUrl.toString(), 302);
      res.headers.append(
        'Set-Cookie',
        `admin_token=${queryToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 12}`,
      );
      return res;
    }

    if (!valid) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  return next();
};
