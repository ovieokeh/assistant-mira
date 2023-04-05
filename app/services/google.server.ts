import type { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { saveUserGoogleOAuthTokens } from '~/models/memory/user.server';
import { prisma } from './db.server';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
/**
 * Load or request or authorization to call APIs.
 *
 */
export async function getAuthorisationUrl({
  client,
}: {
  client: OAuth2Client;
}) {
  const url = client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',
    scope: SCOPES,
  });

  return url;
}

export async function saveGoogleOAuthTokens({
  userId,
}: {
  userId: number;
  userPhone?: string;
}) {
  const newClient = getOAuthClient();
  const savedTokens = await prisma.userToGoogleOAuthCode.findUnique({
    where: {
      userId,
    },
  });

  if (savedTokens?.authCode && savedTokens?.token) {
    throw new Error('auth code missing');
  }

  const { tokens } = await newClient.getToken(savedTokens?.authCode as string);
  if (!tokens || !tokens.access_token || !tokens.refresh_token) {
    throw new Error('no tokens');
  }

  await saveUserGoogleOAuthTokens({
    userId,
    tokens: {
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    },
  });

  return true;
}

function getOAuthClient() {
  const newClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
  );

  return newClient;
}

export async function getCalendarClient({ userId }: { userId: number }) {
  console.info('🔌 setting up google apis client');
  const clientAuth = getOAuthClient();

  const savedTokens = await prisma.userToGoogleOAuthCode.findUnique({
    where: {
      userId,
    },
  });

  if (!savedTokens?.token || !savedTokens?.refreshToken) {
    const authorisationUrl = await getAuthorisationUrl({ client: clientAuth });
    throw new Error(authorisationUrl);
  }

  clientAuth.setCredentials({
    access_token: savedTokens?.token,
    refresh_token: savedTokens?.refreshToken,
  });

  return google.calendar({ version: 'v3', auth: clientAuth });
}
