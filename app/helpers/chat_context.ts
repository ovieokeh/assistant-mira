import type {
  ActionWithMessages,
  ChatHistoryMessage,
  UnformattedMessage,
  UserWithProfile,
} from '~/types';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import { Role } from '@prisma/client';
import { getUserMessages } from '~/models/memory/user.server';

export async function getChatHistory({
  user,
  message,
  currentAction,
}: {
  user: UserWithProfile;
  message: UnformattedMessage;
  currentAction: null | ActionWithMessages;
}) {
  const messageHistory = await getUserMessages({ userId: user.id });
  let chatHistory: ChatHistoryMessage[] = messageHistory.map((message) => ({
    role: message.role,
    content: message.content,
    actionId: message.actionId,
    userId: message.userId,
    hash: message.hash,
  }));
  const newMessage: ChatHistoryMessage = {
    role: Role.user,
    content: message.text.body,
    actionId: null,
    userId: user.id,
  };

  chatHistory.push(newMessage);
  return { chatHistory };
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
