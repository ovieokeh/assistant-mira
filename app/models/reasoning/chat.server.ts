import type {
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
} from 'openai';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import { PROMPTS, buildPrompt } from '~/config/prompts';

import { gpt } from '~/services/gpt.server';

export async function summariseToolResult(
  userQuery: string,
  toolDisplayName: string,
  toolResult: string
): Promise<{
  summary: string;
  sources: string;
}> {
  const toolResponseMessage = {
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: buildPrompt({
      type: PROMPTS.CREATE_TOOL_RESULT_SUMMARY_PROMPT.name,
      args: {
        userQuery,
        toolDisplayName,
        toolResult,
      },
    }),
  };

  const toolResponseSummary = await getChatCompletion({
    messages: [toolResponseMessage],
    temperature: 0.1,
  });

  let toolResponseSummaryMessage = toolResponseSummary.content;
  toolResponseSummaryMessage = toolResponseSummaryMessage.replace(
    'Response: ',
    ''
  );

  return JSON.parse(toolResponseSummaryMessage);
}

export async function getHTMLSummary(html: string): Promise<string> {
  const htmlSummary = await getChatCompletion({
    messages: [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: buildPrompt({
          type: PROMPTS.EXTRACT_FROM_WEBPAGE_PROMPT.name,
          args: html,
        }),
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
        content: buildPrompt({
          type: PROMPTS.TEXT_SUMMARISER_PROMPT.name,
          args: html,
        }),
      },
    ],
    temperature: 0.9,
  });

  const summaryMessage = summary.content;
  return summaryMessage;
}

export async function compareHTMLOutputWithPrompt(
  query: string,
  output: string
): Promise<{
  satisfiesQuery?: false;
  message?: string;
}> {
  const messages = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: buildPrompt({
        type: PROMPTS.VALIDATE_AND_SUMMARISE_HTML_OUTPUT_PROMPT.name,
        args: {
          query,
          output,
        },
      }),
    },
  ];

  const data = await getChatCompletion({
    messages,
    temperature: 0,
  });

  const content = data.content;
  const cleanedJSON = JSON.parse(content.replace('Response: ', ''));
  return cleanedJSON;
}

export async function checkIfToolOutputIsValid(
  prompt: string,
  output: string,
  previousOutputs: string,
  toolDisplayName: string
): Promise<{
  satisfiesQuery: false;
  message: string;
}> {
  const messages = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: buildPrompt({
        type: PROMPTS.CHECK_IF_TOOL_RESULT_SATISFIES_PROMPT.name,
        args: {
          query: prompt,
          previousOutputs,
          currentResponse: output,
          toolDisplayName,
        },
      }),
    },
  ];

  const data = await getChatCompletion({
    messages,
    temperature: 0.1,
    stop: '/end',
  });

  const regexToReplaceResponseToolChat = /Response: |Tool|Chat/g;

  const cleanedJSON = data.content.replace(regexToReplaceResponseToolChat, '');
  return JSON.parse(cleanedJSON);
}

export async function extractActions({
  message,
  chatHistory,
}: {
  message: string;
  chatHistory: string;
}): Promise<
  | {
      action: 'chat';
    }
  | {
      action: 'tool';
      tool: {
        name: string;
        parameters: string[];
      };
    }
  | {
      action: 'refine';
      tool: {
        name: string;
        message: string;
        parameters: string[];
      };
    }
> {
  const messages = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: buildPrompt({
        type: PROMPTS.GET_TOOL_FROM_MESSAGE_PROMPT.name,
        args: chatHistory,
      }),
    },
    {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: `
      Follow instructions below:
      - Respond with the appropriate action for the user message - "${message}"
      - If it is a chat message, return { "action": "chat" }
      - If you need to use a tool, return the following response like so (only use one tool at a time) — {
        "action": "tool",
        "tool": {
          "name": "<tool name>",
          "parameters": [<tool parameters>]
        }
      }
      - If you need to use a tool but don't have the required information for it, respond  {
        "action": "refine",
        "tool": {
          "name": "<tool name>",
          "message": "<missing information>"
          "parameters": [<tool parameters>]
        }
      }
      - If the message is a request that requires knowledge of current date/events, you will prefer to run a tool instead of your existing knowledge because you don't have access to current events.
      - Response must be valid JSON that can be parsed by the JSON.parse() function (don't add apologies, confirmations, explanations, instructions, or any other text etc. Just raw JSON)

      Example:
      message: "What is the current price of bitcoin?"
      response: {
        "action": "tool",
        "tool": [
          {
            "name": "search",
            "parameters": ["current price of bitcoin"]
          }
        ]
      }/end
      message: "Hi there"
      response: {
        "action": "chat",
      }/end
      message: "Do you know the muffin man?"
      response: {
        "action": "chat",
      }/end
      message: "Do you know the children of time book?"
      response: {
        "action": "chat",
      }/end

      message: ${message}
      response:
      `,
    },
  ];

  const data = await getChatCompletion({
    messages,
    temperature: 0.1,
    stop: '/end',
  });

  let cleanedJSON: any = {
    action: 'chat',
  };
  try {
    cleanedJSON = JSON.parse(data.content.replace('Response: ', ''));
  } catch (error) {}

  return cleanedJSON;
}

export async function getChatCompletion({
  messages,
  temperature = 0.1,
  stop = '',
}: {
  messages: ChatCompletionRequestMessage[];
  temperature?: number;
  stop?: string;
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
        'Important: Ensure to format the summary using punctuation, linebreaks, and capitalisation.',
    },
  ];

  const { data } = await gpt.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: prompt,
    temperature,
    stop,
  });

  const response = data.choices[0].message;

  if (!response) {
    throw new Error('No response from GPT-3');
  }

  return response;
}
