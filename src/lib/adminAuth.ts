// Shared helpers for admin token authentication.

type AdminEnv = {
  ADMIN_TOKEN?: string;
};

const clean = (value: string | null | undefined) => value?.trim() ?? '';

const parseCookie = (cookieHeader: string | null, key: string) => {
  if (!cookieHeader) return null;
  return (
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${key}=`))
      ?.split('=')[1] ?? null
  );
};

export const readBearer = (request: Request) =>
  request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;

export const readAdminCookie = (request: Request) => parseCookie(request.headers.get('cookie'), 'admin_token');

/**
 * Returns true when the provided ADMIN_TOKEN matches either a Bearer token
 * header or the `admin_token` HttpOnly cookie. Locals flag is checked first
 * so downstream routes can trust middleware decisions.
 */
export const isAdminAuthorized = (
  request: Request,
  env: AdminEnv,
  locals?: { isAdmin?: boolean },
): boolean => {
  if (locals?.isAdmin) return true;
  const expected = clean(env.ADMIN_TOKEN);
  if (!expected) return false;
  const token = clean(readBearer(request)) || clean(readAdminCookie(request));
  return Boolean(token) && token === expected;
};
