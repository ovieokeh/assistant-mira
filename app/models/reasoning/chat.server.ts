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

export async function getHTMLSummary(html: string): Promise<string> {
  const htmlSummary = await getChatCompletion({
    messages: [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: `
          - You are an information extraction agent.
          - You are parsing a website's content and extracting the most important information.
          - You are to respond with a summary of the important information.
          - Only include the most relevant content.
          - You are analysing the following text.

          text: ${html}
          `,
      },
    ],
    temperature: 0.9,
  });

  const htmlSummaryMessage = htmlSummary.content;
  return htmlSummaryMessage;
}

export async function cleanHTMLSummary(html: string): Promise<string> {
  const summary = await getChatCompletion({
    messages: [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: `
          - You are a text summariser agent.
          - You are summarising the following text.

          text: ${html}
          `,
      },
    ],
    temperature: 0.9,
  });

  const summaryMessage = summary.content;
  return summaryMessage;
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
        You are analyzing a response to the query: ${prompt}
        Response: ${output}
        
        Follow instructions below:
        - If the response is not a reasonable response to the query, respond with only "NO"
        - Otherwise, extract and summarise the relevant answer to the query: ${prompt} from the response.

        Expected response format:
        - NO
        - your summary
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
        
        Instructions:
        - If the response fully or partialy answers the query, respond with "yes".
        - If the response does not answer the query, respond with "no".

        Expected response format:
        - yes
        - no
      `,
    },
  ];

  const data = await getChatCompletion({
    messages,
    temperature: 0,
  });

  return data.content === 'yes';
}

export async function extractActions({
  message,
  chatHistory,
}: {
  message: string;
  chatHistory: string;
}) {
  const messages = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: GET_TOOL_FROM_MESSAGE_PROMPT(chatHistory),
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
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content:
        'Ensure to format the summary using punctuation, linebreaks, and capitalisation.',
    },
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
