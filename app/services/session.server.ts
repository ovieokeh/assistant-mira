import type { User } from '@prisma/client';
import { createCookieSessionStorage, redirect } from '@remix-run/node';
import invariant from 'tiny-invariant';

import { getUserProfile } from '../models/memory/user.server';

invariant(process.env.SESSION_SECRET, 'SESSION_SECRET must be set');

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === 'production',
  },
});

const USER_SESSION_ID_KEY = 'userId';

export async function getSession(request: Request) {
  const cookie = request.headers.get('Cookie');
  return sessionStorage.getSession(cookie);
}

export async function getUserIdFromSession(request: Request) {
  const session = await getSession(request);
  const userId = session.get(USER_SESSION_ID_KEY);
  return userId;
}

export async function getUser(request: Request): Promise<User | null> {
  const userId = await getUserIdFromSession(request);

  if (!userId) return null;

  const userData = await getUserProfile({ id: userId });
  return userData;
}

export async function requireUser(request: Request, redirectTo?: string) {
  const user = await getUser(request);
  if (user) return user;

  throw await logout(request, redirectTo || `/login`);
}

export async function createUserSession({
  request,
  userId,
  remember,
  redirectTo,
}: {
  request: Request;
  userId: number;
  remember: boolean;
  redirectTo: string;
}) {
  const session = await getSession(request);
  session.set(USER_SESSION_ID_KEY, userId);

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session, {
        maxAge: remember
          ? 60 * 60 * 24 * 7 // 7 days
          : undefined,
      }),
    },
  });
}

export async function logout(request: Request, redirectTo: string = '/') {
  const session = await getSession(request);
  session.unset(USER_SESSION_ID_KEY);

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}
