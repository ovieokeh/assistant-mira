import type { Action, User } from '@prisma/client';
import { MessagingState } from '@prisma/client';
import { ActionStatus } from '@prisma/client';

import { prisma } from '~/services/db.server';
import type { ActionWithMessages } from '~/types';
import { setUserMessagingState } from './user.server';

export const getCurrentActionFlow = async (
  user: User
): Promise<null | ActionWithMessages> => {
  const actionFlow = await prisma.action.findFirst({
    where: {
      userId: user.id,
      status: ActionStatus.PENDING,
    },
    include: {
      messages: true,
    },
  });

  return actionFlow;
};

export const updateActionFlow = async ({
  user,
  action,
}: {
  user: User;
  action: Partial<Pick<Action, 'id' | 'name' | 'status' | 'tool'>>;
}) => {
  if (!action.id) {
    return await prisma.action.create({
      data: {
        user: {
          connect: {
            id: user.id,
          },
        },
        name: action.name as string,
        status: action.status || ActionStatus.PENDING,
        tool: action.tool as string,
      },
      include: {
        messages: true,
      },
    });
  }

  const updatedActionFlow = await prisma.action.update({
    where: {
      id: action.id,
    },
    data: {
      status: action.status,
    },
    include: {
      messages: true,
    },
  });

  if (action.id && action.status !== ActionStatus.COMPLETED) {
    setUserMessagingState({
      phone: user.phone,
      state: MessagingState.ACTION,
    });
  }

  if (action.id && action.status === ActionStatus.COMPLETED) {
    setUserMessagingState({
      phone: user.phone,
      state: MessagingState.CHAT,
    });
  }

  return updatedActionFlow;
};
