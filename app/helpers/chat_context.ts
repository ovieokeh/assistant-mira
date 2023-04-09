import type { UnformattedMessage, UserWithProfile } from '~/types';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import { Role } from '@prisma/client';
import { getUserMessages } from '~/models/memory/user.server';

export async function prepareChatContext({
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

export function prepareActionFlow({
  messages,
  runningArguments,
}: {
  messages: any[];
  runningArguments: {
    role: string;
    content: string;
  }[];
}) {
  return messages
    .map((message) => {
      const agent =
        message.role === ChatCompletionRequestMessageRoleEnum.User
          ? 'User'
          : 'You';

      runningArguments.push({
        role: agent,
        content: message.content,
      });
      const step = `${agent}: ${message.content}`;
      return step;
    })
    .join('\n');
}
