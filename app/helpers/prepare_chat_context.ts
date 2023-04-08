import type { UnformattedMessage, UserWithProfile } from '~/types';
import type { ChatCompletionRequestMessageRoleEnum } from 'openai';
import { Role } from '@prisma/client';
import { getUserMessages } from '~/models/memory/user.server';

export default async function prepareChatContext({
  user,
  newMessages,
  messageHash,
}: {
  user: UserWithProfile;
  newMessages: UnformattedMessage[];
  messageHash: number;
}) {
  const messageHistory = await getUserMessages({ userId: user.id });
  const chatContext: {
    role: ChatCompletionRequestMessageRoleEnum;
    content: string;
    hash?: number;
  }[] = [];

  chatContext.push(
    ...messageHistory.map((message) => ({
      role: message.role,
      content: message.content,
      actionId: message.actionId,
    }))
  );

  chatContext.push({
    role: Role.user,
    content: newMessages[0].text.body,
    hash: messageHash,
  });

  return { chatContext };
}
