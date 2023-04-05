import type { User } from '@prisma/client';
import { ActionStatus } from '@prisma/client';

import { prisma } from '~/services/db.server';

export const getCurrentActionFlow = async (user: User) => {
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
