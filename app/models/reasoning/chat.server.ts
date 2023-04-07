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
  const prompt = [
    ...messages.map((message) => {
      return {
        role: message.role,
        content: message.content,
      };
    }),
  ];

  const { data } = await gpt.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: prompt,
    temperature,
    user: Math.random().toString(36).substring(7),
  });

  const response = data.choices[0].message;

  if (!response) {
    throw new Error('No response from GPT-3');
  }

  return response;
}
