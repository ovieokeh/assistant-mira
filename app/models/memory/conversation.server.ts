import type { ConversationMessage } from '~/types';
import { prisma } from '~/services/db.server';

export const saveConversation = async (conversation: ConversationMessage[]) => {
  const conversationsWithUserId = conversation.filter(
    (message) => message.userId
  );

  if (conversationsWithUserId.length === 0) {
    return;
  }

  const createMessageWithActionConnection = conversationsWithUserId.map(
    (message) => {
      if (message.actionId) {
        return {
          ...message,
          actionId: message.actionId,
        };
      }
      return message;
    }
  );

  return await prisma.message.createMany({
    data: createMessageWithActionConnection,
  });
};

export const getMessageByHash = async (hash: number) => {
  return await prisma.message.findFirst({
    where: {
      hash,
    },
  });
};
