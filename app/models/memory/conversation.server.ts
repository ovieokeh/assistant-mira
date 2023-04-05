import type { Message } from '@prisma/client';
import { prisma } from '~/services/db.server';

export const saveConversation = async (
  conversation: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>[]
) => {
  return await prisma.message.createMany({
    data: conversation,
  });
};
