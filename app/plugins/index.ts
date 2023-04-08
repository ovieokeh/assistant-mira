import type { Action, User } from '@prisma/client';
import { ActionStatus } from '@prisma/client';
import type { ChatCompletionRequestMessage } from 'openai';
import type { PluginDetail, UserWithProfile } from '~/types';
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
import {
  getCurrentActionFlow,
  updateActionFlow,
} from '~/models/memory/action.server';
import sendWhatsappMessage from '~/helpers/send_whatsapp_message';

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

export const PLUGIN_DISPLAY_NAME_MAP: {
  [key: string]: PluginDetail;
} = {
  calendar: calendarPluginDescription,
  search: searchPluginDescription,
  repl: replPluginDescription,
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
  currentAction,
  user,
}: {
  message: string;
  previousMessages: ChatCompletionRequestMessage[];
  currentAction?: Action;
  user: User;
}): Promise<any> {
  previousMessages.unshift(defaultPluginsPrimer);
  const [, toolInvocation] = message.split('Run tool:');

  const endOfToolName = toolInvocation?.indexOf('(');
  let toolName = toolInvocation?.slice(0, endOfToolName);
  toolName = toolName?.trim();

  const checkResponse = await getChatCompletion({
    messages: [...previousMessages],
    temperature: 0.2,
  });

  switch (checkResponse.content) {
    case 'Cancel':
      if (currentAction) {
        await updateActionFlow({
          user,
          action: {
            ...currentAction,
            tool: toolName,
            status: ActionStatus.CANCELLED,
          },
        });
      }
      break;

    default:
      const shouldRunTool = checkResponse.content.includes('Run tool:');
      const shouldRefineResponse = checkResponse.content.includes('Refine:');
      const shouldChat = checkResponse.content.includes('Chat');

      return {
        message: checkResponse.content,

        action: shouldRunTool
          ? 'runPlugin'
          : shouldRefineResponse
          ? 'refineResponse'
          : shouldChat
          ? 'chat'
          : null,
        isRefineAction: shouldRefineResponse,
      };
  }
}

let hasSuppliedDefaultPluginsPrimerPrompt = false;
let hasSuppliedResponseSummaryPrimerPrompt = false;
let hasSuppliedBetterToolPrompt = false;
export async function runPlugin({
  user,
  userQuery,
  message,
  previousMessages,
  currentAction,
}: {
  user: UserWithProfile;
  userQuery: string;
  message: string;
  previousMessages: any[];
  currentAction?: Action;
}): Promise<any> {
  let previousAction: any = currentAction || (await getCurrentActionFlow(user));
  const [, toolInvocation] = message.split('Run tool:');

  if (!toolInvocation) {
    return { message: 'No tool specified' };
  }

  const endOfToolName = toolInvocation.indexOf('(');
  let toolName = toolInvocation.slice(0, endOfToolName);
  let toolArgs = toolInvocation.slice(endOfToolName + 2, -2);
  toolName = toolName.trim();
  const tool = PLUGIN_MAP[toolName];
  const toolDisplayName = PLUGIN_DISPLAY_NAME_MAP[toolName].displayName;

  console.log('toolName', toolName);
  console.log('toolArgs', toolArgs);

  if (!hasSuppliedDefaultPluginsPrimerPrompt) {
    previousMessages.unshift(defaultPluginsPrimer);
    hasSuppliedDefaultPluginsPrimerPrompt = true;
  }

  const toolInfo = PLUGIN_DISPLAY_NAME_MAP[previousAction?.tool];
  if (!previousAction) {
    previousAction = await updateActionFlow({
      user,
      action: {
        name: 'Run tool',
        tool: toolName,
        status: ActionStatus.PENDING,
      },
    });
  } else if (toolInfo) {
    const actionContext = previousMessages.filter(
      (message) => message?.actionId === previousAction?.id
    );
    let runningArguments: {
      role: string;
      content: string;
    }[] = [];
    const toolInfo = PLUGIN_DISPLAY_NAME_MAP[previousAction.tool];
    const actionFlow = previousMessages
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

    previousMessages.push(
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: `
            You are currently running the ${toolInfo.displayName} tool.
            Here are your available tools:
            ${getAvailablePlugins()}
    
            You have run the following steps:
            ${actionFlow}
    
            You have the following responses to the tool's arguments from the user:
            ${runningArguments
              .map((arg) => `${arg.role}: ${arg.content}`)
              .join('\n')}
            
            - Is the user passing arguments to the tool?
            - - If yes and you have enough information to run the tool
            - - - Respond with Run tool: ${
              toolInfo.name
            }(${runningArguments.join(', ')})
            - - If no
            - - - Respond with Refine:<missing information>
            - If no and they have changed topics/tools or want to cancel the current action
            - - Respond with Cancel
          `,
      },
      ...actionContext.map((message) => ({
        role: message.role,
        content: message.content,
        actionId: message.actionId,
      }))
    );
  }

  let toolResult;
  try {
    toolResult = await tool({ user }, toolArgs);
  } catch (error) {
    console.error('Error running tool:', error);

    return await sendWhatsappMessage({
      userId: null,
      to: user.phone,
      text: `Error running tool: ${error}`,
    });
  }

  // console.log('toolResult', toolResult);

  const toolResponseMessage = {
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: CREATE_TOOL_RESULT_SUMMARY({
      userQuery,
      toolName,
      toolDisplayName,
      toolResult,
    }),
  };

  let messagesWithCreateToolResultSummaryPrompt = [...previousMessages];
  if (!hasSuppliedResponseSummaryPrimerPrompt) {
    messagesWithCreateToolResultSummaryPrompt = [
      ...messagesWithCreateToolResultSummaryPrompt,
      toolResponseMessage,
    ];
    hasSuppliedResponseSummaryPrimerPrompt = true;
  }

  const toolResponseSummary = await getChatCompletion({
    messages: messagesWithCreateToolResultSummaryPrompt,
    temperature: 0.9,
  });

  const toolResponseSummaryMessage = toolResponseSummary.content;

  USED_TOOLS_RESULTS_MAPPING.push({
    name: toolDisplayName,
    result: toolResponseSummaryMessage,
  });

  const previouslyUsedTools = USED_TOOLS_RESULTS_MAPPING.map(
    (tool) => `${tool.name}: ${tool.result}`
  ).join('\n');

  // const toolResponseCheckMessage = {
  //   role: ChatCompletionRequestMessageRoleEnum.System,
  //   content: CHECK_IF_BETTER_TOOL_PROMPT({
  //     userQuery,
  //     userBio: user.profile.data,
  //     previouslyUsedTools,
  //     currentResponse: toolResponseSummaryMessage,
  //   }),
  // };

  let messagesWithCheckIfBetterToolPrompt = [...previousMessages];
  // if (!hasSuppliedBetterToolPrompt && !hasSuppliedDefaultPluginsPrimerPrompt) {
  //   messagesWithCheckIfBetterToolPrompt = [
  //     ...messagesWithCheckIfBetterToolPrompt,
  //     toolResponseCheckMessage,
  //   ];
  //   hasSuppliedBetterToolPrompt = true;
  //   hasSuppliedDefaultPluginsPrimerPrompt = true;
  // }

  const toolResponseCheckSummary = await getChatCompletion({
    messages: messagesWithCheckIfBetterToolPrompt,
  });

  const checkResponseMessage = toolResponseCheckSummary.content;
  const shouldRunTool = checkResponseMessage.includes('Run tool:');

  if (shouldRunTool) {
    return await runPlugin({
      user,
      userQuery,
      message: checkResponseMessage,
      currentAction: previousAction,
      previousMessages: [...previousMessages, toolResponseMessage],
    });
  }

  await updateActionFlow({
    user,
    action: {
      ...previousAction,
      status: ActionStatus.COMPLETED,
    },
  });

  return {
    message: toolResponseSummaryMessage,
    result: toolResult,
    action: previousAction,
  };
}
