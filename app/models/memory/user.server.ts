import type { MessagingState, User } from '@prisma/client';
import { prisma } from '~/db.server';

export const getUserProfile = async ({
  id,
  phone,
}: {
  id?: User['id'];
  phone: User['phone'];
}) => {
  let user = await prisma.user.findFirst({
    where: { OR: [{ id }, { phone }] },
    include: {
      profile: true,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Unknown',
        phone,
        profile: {
          create: {
            data: 'No information about this person yet',
          },
        },
      },
      include: {
        profile: true,
      },
    });
  }

  return user;
};

export const getUserMessages = async (userId: User['id']) => {
  if (!userId) {
    return [];
  }

  const messages = await prisma.message.findMany({
    where: {
      id: userId,
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
