import type {
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
} from 'openai';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import {
  CREATE_TOOL_RESULT_SUMMARY,
  GET_TOOL_FROM_MESSAGE_PROMPT,
} from '~/config/prompts';

import { gpt } from '~/services/gpt.server';

export async function summariseToolResult(
  userQuery: string,
  toolName: string,
  toolDisplayName: string,
  toolResult: string
): Promise<string> {
  const toolResponseMessage = {
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: CREATE_TOOL_RESULT_SUMMARY({
      userQuery,
      toolName,
      toolDisplayName,
      toolResult,
    }),
  };

  const toolResponseSummary = await getChatCompletion({
    messages: [toolResponseMessage],
    temperature: 0.9,
  });

  const toolResponseSummaryMessage = toolResponseSummary.content;
  return toolResponseSummaryMessage;
}

export async function compareHTMLOutputWithPrompt(
  prompt: string,
  output: string
): Promise<string> {
  const messages = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: `
        You are a digital assistant.
        You are analyzing an HTML web page and summarise the relevant content for the query: ${prompt}
        Response: ${output}
        
        Follow instructions below:
        - If the extracted summary is a reasonable response to the query, respond with only the extracted summary.
        - Otherwise, respond with only "NO".
      `,
    },
  ];

  const data = await getChatCompletion({
    messages,
    temperature: 0,
  });

  return data.content;
}

export async function compareOutputWithPrompt(
  prompt: string,
  output: string
): Promise<boolean> {
  const messages = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: `
        You are a digital assistant.
        You are analyzing a query response.
        
        Query: ${prompt}
        Response: ${output}
        
        Follow instructions below:
        - If the response fully or partialy answers the query, respond with "yes".
        - If the response does not answer the query, respond with "no".
        - Your response should be a single word.
        - Do NOT add any additional text to your response.
      `,
    },
  ];

  const data = await getChatCompletion({
    messages,
    temperature: 0,
  });

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
