import type {
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
} from 'openai';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';

import { gpt } from '~/services/gpt.server';

export async function getChatCompletion({
  messages,
  temperature = 0.1,
}: {
  messages: ChatCompletionRequestMessage[];
  temperature?: number;
}): Promise<ChatCompletionResponseMessage> {
  const { data } = await gpt.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: `
          Please format your response as a chat message.
          Use line breaks to separate long messages.
          Use punctuations and emojis when necessary.
        `,
      },
      ...messages,
    ],
    temperature,
  });

  const response = data.choices[0].message;

  if (!response) {
    throw new Error('No response from GPT-3');
  }

  return response;
}
