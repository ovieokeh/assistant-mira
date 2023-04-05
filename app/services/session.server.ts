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
const USER_SESSION_PHONE_KEY = 'userPhone';

export async function getSession(request: Request) {
  const cookie = request.headers.get('Cookie');
  return sessionStorage.getSession(cookie);
}

export async function getUserId(
  request: Request
): Promise<User['id'] | undefined> {
  const session = await getSession(request);
  const userId = session.get(USER_SESSION_ID_KEY);
  return userId;
}

export async function getUserPhone(
  request: Request
): Promise<User['phone'] | undefined> {
  const session = await getSession(request);
  const userPhone = session.get(USER_SESSION_PHONE_KEY);
  return userPhone;
}

export async function getUser(request: Request) {
  const id = await getUserId(request);
  const phone = await getUserPhone(request);
  if (!phone) return null;

  const user = await getUserProfile({ id, phone });
  if (user) return user;

  throw await logout(request);
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function requireUser(request: Request) {
  const user = await getUser(request);
  if (user) return user;

  throw await logout(request);
}

export async function createUserSession({
  request,
  userId,
  userPhone,
  remember,
  redirectTo,
}: {
  request: Request;
  userId: number;
  userPhone: string;
  remember: boolean;
  redirectTo: string;
}) {
  const session = await getSession(request);
  session.set(USER_SESSION_ID_KEY, userId);
  session.set(USER_SESSION_PHONE_KEY, userPhone);
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

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect('/', {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}