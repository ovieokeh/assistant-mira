import type { User } from '@prisma/client';
import type { ChatCompletionRequestMessage } from 'openai';
import type { PluginDetail } from '~/types';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';

import calendar, {
  pluginDescription as calendarPluginDescription,
} from './calendar';
import search, { pluginDescription as searchPluginDescription } from './search';
import repl, { pluginDescription as replPluginDescription } from './repl';
import { getChatCompletion } from '~/models/reasoning/chat.server';
import {
  CHECK_IF_BETTER_TOOL_PROMPT,
  GET_TOOL_FROM_MESSAGE_PROMPT,
  CREATE_TOOL_RESULT_SUMMARY,
} from '~/config/prompts';

export const PLUGIN_REGISTRY = [
  calendarPluginDescription,
  searchPluginDescription,
  replPluginDescription,
];
const PLUGIN_MAP: {
  [key: string]: any;
} = {
  calendar,
  search,
  repl,
};

const PLUGIN_DISPLAY_NAME_MAP: {
  [key: string]: string;
} = {
  calendar: calendarPluginDescription.displayName,
  search: searchPluginDescription.displayName,
  repl: replPluginDescription.displayName,
};

export const getAvailablePlugins = () =>
  PLUGIN_REGISTRY.map((tool, index) => {
    return `:
      ${getPluginDetail(tool)}
      ---
  `;
  });

export function getPluginDetail(detail: PluginDetail) {
  return `
      Plugin name: ${detail.name}
      Plugin display name: ${detail.displayName}
      Plugin description: ${detail.description}
      Plugin usage example: ${detail.usage}
    `;
}

const USED_TOOLS_RESULTS_MAPPING: {
  name: string;
  result: string;
}[] = [];

const defaultPluginsPrimer = {
  role: ChatCompletionRequestMessageRoleEnum.System,
  content: GET_TOOL_FROM_MESSAGE_PROMPT(),
};

export async function checkForActions({
  message,
  previousMessages,
}: {
  message: string;
  previousMessages: ChatCompletionRequestMessage[];
}): Promise<any> {
  previousMessages.unshift(defaultPluginsPrimer);

  const checkResponse = await getChatCompletion({
    messages: [...previousMessages],
  });

  console.log('Checking for actions with message:', message, checkResponse);
  const shouldRunTool = checkResponse.content.includes('Run tool:');
  return shouldRunTool ? checkResponse.content : null;
}

export async function runPlugin({
  user,
  userQuery,
  message,
  previousMessages,
}: {
  user: User;
  userQuery: string;
  message: string;
  previousMessages: ChatCompletionRequestMessage[];
}): Promise<any> {
  previousMessages.unshift(defaultPluginsPrimer);

  console.log('Running plugin:', message);
  // console.log("Previous messages:", previousMessages);

  const [, toolInvocation] = message.split('Run tool:');

  const endOfToolName = toolInvocation.indexOf('(');
  let toolName = toolInvocation.slice(0, endOfToolName);
  let toolArgs = toolInvocation.slice(endOfToolName + 2, -2);
  toolName = toolName.trim();
  console.log(toolInvocation, 'Running', toolName, 'with args:', toolArgs);

  let toolResult;
  const tool = PLUGIN_MAP[toolName];
  const toolDisplayName = PLUGIN_DISPLAY_NAME_MAP[toolName];
  try {
    toolResult = await tool({ user }, toolArgs);
  } catch (error) {
    console.error('Error running tool:', error);
    toolResult =
      'An error occurred running the tool. Please request for different input or try a different tool.';
  }

  console.log('Tool result:', toolResult);

  const toolResponseMessage = {
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: CREATE_TOOL_RESULT_SUMMARY({
      userQuery,
      toolName,
      toolDisplayName,
      toolResult,
    }),
  };

  // console.log(toolName, "result", toolResult);
  const toolResponseSummary = await getChatCompletion({
    messages: [...previousMessages, toolResponseMessage],
  });

  const toolResponseSummaryMessage = toolResponseSummary.content;

  console.log('Tool response summary:', toolResponseSummaryMessage);

  USED_TOOLS_RESULTS_MAPPING.push({
    name: toolDisplayName,
    result: toolResponseSummaryMessage,
  });

  const previouslyUsedTools = USED_TOOLS_RESULTS_MAPPING.map(
    (tool) => `${tool.name}: ${tool.result}`
  ).join('\n');

  const toolResponseCheckMessage = {
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: CHECK_IF_BETTER_TOOL_PROMPT({
      userQuery,
      previouslyUsedTools,
      currentResponse: toolResponseSummaryMessage,
    }),
  };

  const toolResponseCheckSummary = await getChatCompletion({
    messages: [...previousMessages, toolResponseCheckMessage],
  });

  const checkResponseMessage = toolResponseCheckSummary.content;
  const shouldRunTool = checkResponseMessage.includes('Run tool:');
  console.log('Check tool result response message:', checkResponseMessage);

  if (shouldRunTool) {
    return await runPlugin({
      user,
      userQuery,
      message: checkResponseMessage,
      previousMessages: [...previousMessages, toolResponseMessage],
    });
  }

  return { message: toolResponseSummaryMessage, result: toolResult };
}
