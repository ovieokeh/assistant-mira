import type { MessagingState, Password, User } from '@prisma/client';
import type { UserWithProfile } from '~/types';
import { compare, hash } from 'bcryptjs';
import { prisma } from '~/services/db.server';

export const createUser = async ({
  name,
  phone,
  password,
  profile,
}: {
  name: string;
  phone: string;
  password: string;
  profile?: string;
}) => {
  const hashedPassword = await hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      profile: {
        create: {
          data: profile || 'No information about this person yet',
        },
      },
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });

  return user;
};

export async function verifyLogin({
  phone,
  password,
}: {
  phone: User['phone'];
  password: Password['hash'];
}) {
  const userWithPassword = await prisma.user.findUnique({
    where: { phone },
    include: {
      password: true,
    },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await compare(password, userWithPassword.password.hash);
  if (!isValid) return null;

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}

export const getUserProfile = async ({
  id,
  phone,
}: {
  id?: User['id'];
  phone?: User['phone'];
}) => {
  let user = await prisma.user.findFirst({
    where: { OR: [{ id }, { phone }] },
    include: {
      profile: true,
    },
  });

  if (!user) return null;

  let { ...unknownUser } = user as User;
  return unknownUser as UserWithProfile;
};

export const getUserMessages = async ({ userId }: { userId: User['id'] }) => {
  if (!userId) {
    return [];
  }

  const messages = await prisma.message.findMany({
    where: {
      userId: userId,
    },
  });

  return messages;
};

export const setUserMessagingState = async ({
  phone,
  state,
}: {
  phone: string;
  state: MessagingState;
}) => {
  const data = await prisma.user.update({
    where: {
      phone,
    },
    data: {
      currentState: state,
    },
  });

  return data;
};

export const saveUserGoogleOAuthTokens = async ({
  tokens,
  userId,
}: {
  userId: number;
  tokens: {
    authCode?: string | null;
    token?: string;
    refreshToken?: string;
  };
}) => {
  const data = await prisma.userToGoogleOAuthCode.upsert({
    where: {
      userId,
    },
    create: {
      user: {
        connect: {
          id: userId,
        },
      },
      authCode: tokens.authCode || '',
      token: '',
      refreshToken: '',
    },
    update: {
      ...tokens,
    },
  });

  return data;
};
