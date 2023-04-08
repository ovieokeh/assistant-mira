import type {
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
} from 'openai';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import { GET_TOOL_FROM_MESSAGE_PROMPT } from '~/config/prompts';

import { gpt } from '~/services/gpt.server';

export async function compareOutputWithPrompt(
  prompt: string,
  output: string
): Promise<boolean> {
  const messages = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: `
        You are a digital assistant.
        You are analyzing a query response and comparing it to the query.
        
        Query: ${prompt}
        Response: ${output}
        
        If the response answers the query, respond yes if it does, and no if it does not.
        Your response should be a single word.
      `,
    },
  ];

  const data = await getChatCompletion({
    messages,
    temperature: 0.2,
  });

  console.log('Compare output with prompt:', data);

  return data.content === 'yes';
}

export async function extractAction({ message }: { message: string }) {
  const messages = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: GET_TOOL_FROM_MESSAGE_PROMPT('CHAT'),
    },
    {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message,
    },
  ];

  const data = await getChatCompletion({
    messages,
    temperature: 0.2,
  });

  return data.content;
}

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

  // console.log('Prompt:', prompt);

  const { data } = await gpt.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: prompt,
    temperature,
  });

  const response = data.choices[0].message;

  if (!response) {
    throw new Error('No response from GPT-3');
  }

  return response;
}
