import { User } from '@prisma/client';
import type { LoaderArgs } from '@remix-run/server-runtime';
import { redirect } from '@remix-run/server-runtime';
import { json } from '@remix-run/server-runtime';

import { saveUserGoogleOAuthTokens } from '~/models/memory/user.server';
import { saveGoogleOAuthTokens } from '~/services/google.server';
import { requireUser } from '~/services/session.server';

export async function loader({ request }: LoaderArgs) {
  try {
    // read google oauth code from query params
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code) {
      return json({ error: 'no code' }, { status: 400 });
    }

    const user = (await requireUser(request, request.url)) as User;

    //update user with google oauth code
    await saveUserGoogleOAuthTokens({
      userId: user.id,
      tokens: {
        authCode: code,
      },
    });

    await saveGoogleOAuthTokens({ userId: user.id });

    return redirect('/dashboard');
  } catch (error) {
    console.error(error);
    return json({ error: 'server error' }, { status: 500 });
  }
}
