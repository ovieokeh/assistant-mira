import type { Action, User } from '@prisma/client';
import { Role } from '@prisma/client';
import { ActionStatus } from '@prisma/client';
import type { ChatCompletionRequestMessage } from 'openai';
import type { PluginDetail, UserWithProfile } from '~/types';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';

import search, { pluginDescription as searchPluginDescription } from './search';
import repl, { pluginDescription as replPluginDescription } from './repl';
import {
  compareOutputWithPrompt,
  extractAction,
  summariseToolResult,
} from '~/models/reasoning/chat.server';
import { REFINE_TOOL_ARGUMENTS_PROMPT } from '~/config/prompts';
import {
  getCurrentActionFlow,
  updateActionFlow,
} from '~/models/memory/action.server';
import sendWhatsappMessage from '~/helpers/send_whatsapp_message';
import { prepareActionFlow } from '~/helpers/chat_context';

export const PLUGIN_REGISTRY = [searchPluginDescription, replPluginDescription];
const PLUGIN_MAP: {
  [key: string]: any;
} = {
  search,
  repl,
};

export const PLUGIN_DISPLAY_NAME_MAP: {
  [key: string]: PluginDetail;
} = {
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
  const actionExtract = await extractAction({
    message,
  });

  switch (actionExtract) {
    case 'Cancel':
      if (currentAction) {
        await updateActionFlow({
          user,
          action: {
            ...currentAction,
            tool: currentAction.tool || 'none',
            status: ActionStatus.CANCELLED,
          },
        });
      }
      break;

    default:
      const shouldRunTool = actionExtract.includes('Run tool');
      const shouldRefineResponse = actionExtract.includes('Refine');
      const shouldChat = actionExtract.includes('Chat');

      return {
        message: actionExtract,

        action: shouldRunTool
          ? 'runPlugin'
          : shouldRefineResponse
          ? 'refineResponse'
          : shouldChat
          ? 'chat'
          : null,
      };
  }
}

let runningArguments: {
  role: string;
  content: string;
}[] = [];
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

  const originalMessages = [...previousMessages];

  const endOfToolName = toolInvocation.indexOf('(');
  let toolName = toolInvocation.slice(0, endOfToolName);
  let toolArgs = toolInvocation.slice(endOfToolName + 2, -2);
  toolName = toolName.trim();

  if (!toolName) throw new Error('No tool name specified');
  const tool = PLUGIN_MAP[toolName];
  const toolDisplayName = PLUGIN_DISPLAY_NAME_MAP[toolName]?.displayName;

  console.log('toolName', toolName);
  console.log('toolArgs', toolArgs);

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
  } else if (previousAction && toolInfo?.name) {
    const actionContext = previousMessages.filter(
      (message) => message?.actionId === previousAction?.id
    );

    const actionFlow = prepareActionFlow({
      messages: previousMessages,
      runningArguments,
    });

    previousMessages.push(
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: REFINE_TOOL_ARGUMENTS_PROMPT({
          userQuery,
          actionFlow,
          runningArguments: runningArguments
            .map((arg) => `${arg.role}: ${arg.content}`)
            .join('\n'),
          toolInfo: {
            name: toolInfo.name,
            displayName: toolInfo.displayName,
            arguments: runningArguments
              .filter((arg) => arg.role === Role.user)
              .map((arg) => arg.content)
              .join(', '),
          },
        }),
        actionId: previousAction.id,
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

  const toolResponseSummaryMessage = await summariseToolResult(
    userQuery,
    toolName,
    toolDisplayName,
    toolResult
  );
  console.log('toolResponseSummaryMessage', toolResponseSummaryMessage);

  USED_TOOLS_RESULTS_MAPPING.push({
    name: toolDisplayName,
    result: toolResponseSummaryMessage,
  });

  const previouslyUsedTools = USED_TOOLS_RESULTS_MAPPING.map(
    (tool) => `${tool.name}: ${tool.result}`
  ).join('\n');

  const shouldRunAgain = await compareOutputWithPrompt(
    userQuery,
    toolResponseSummaryMessage
  );

  console.log({ shouldRunAgain });

  if (shouldRunAgain) {
    return await runPlugin({
      user,
      userQuery,
      message,
      currentAction: previousAction,
      previousMessages: [...originalMessages],
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
