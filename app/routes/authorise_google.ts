import type { LoaderArgs } from '@remix-run/server-runtime';
import { json } from '@remix-run/server-runtime';
import { saveUserGoogleOAuthTokens } from '~/models/memory/user.server';
import { saveGoogleOAuthTokens } from '~/services/google.server';
import { getUserId, requireUserId } from '~/services/session.server';

export async function loader({ request }: LoaderArgs) {
  try {
    await requireUserId(request);

    // read google oauth code from query params
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code) {
      return json({ error: 'no code' }, { status: 400 });
    }

    // get user id from session
    const userId = await getUserId(request);
    if (!userId) {
      return json({ error: 'no user' }, { status: 400 });
    }

    //update user with google oauth code
    await saveUserGoogleOAuthTokens({
      userId,
      tokens: {
        authCode: code,
      },
    });

    await saveGoogleOAuthTokens({ userId });

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: 'server error' }, { status: 500 });
  }
}
