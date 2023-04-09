import type { Action } from '@prisma/client';
import { Role } from '@prisma/client';
import { ActionStatus } from '@prisma/client';
import type {
  ChatHistoryMessage,
  PluginDetail,
  UserWithProfile,
} from '~/types';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';

import search, { pluginDescription as searchPluginDescription } from './search';
import repl, { pluginDescription as replPluginDescription } from './repl';
import {
  compareOutputWithPrompt,
  extractActions,
  getChatCompletion,
  summariseToolResult,
} from '~/models/reasoning/chat.server';
import { REFINE_TOOL_ARGUMENTS_PROMPT } from '~/config/prompts';
import { updateActionFlow } from '~/models/memory/action.server';
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

export async function analyseForActions({
  message,
}: {
  message: string;
}): Promise<string[]> {
  const actionsExtract = await extractActions({
    message,
  });

  return actionsExtract.split('\n');
}

const getToolNameAndArgs = (toolInvocation: string) => {
  const endOfToolName = toolInvocation.indexOf('(');
  let toolName = toolInvocation.slice(0, endOfToolName);
  let toolArgs = toolInvocation.slice(endOfToolName + 2, -2);
  toolName = toolName.trim();
  toolArgs = toolArgs.trim();

  return {
    toolName,
    toolArgs,
  };
};

let runningActionArguments: {
  role: string;
  content: string;
}[] = [];
export async function runAction({
  user,
  message,
  chatHistory,
  currentAction,
}: {
  user: UserWithProfile;
  message: string;
  chatHistory: ChatHistoryMessage[];
  currentAction: Action | null;
}): Promise<any> {
  const [, toolInvocation] = message.split('Run tool:');

  if (!toolInvocation) return 'No tool specified';

  const { toolName, toolArgs } = getToolNameAndArgs(toolInvocation);
  if (!toolName) throw new Error('No tool name specified');

  const tool = PLUGIN_MAP[toolName];
  const toolInfo = currentAction?.tool
    ? PLUGIN_DISPLAY_NAME_MAP[currentAction.tool]
    : PLUGIN_DISPLAY_NAME_MAP[toolName];

  if (!currentAction) {
    currentAction = await updateActionFlow({
      user,
      action: {
        name: 'Run tool',
        tool: toolName,
        status: ActionStatus.PENDING,
      },
    });
  }

  const originalMessages: any = [...chatHistory].filter(
    (message) => message.actionId === currentAction?.id
  );

  // If currently refining a tool invocation arguments
  if (currentAction && toolInfo?.name) {
    const actionFlow = prepareActionFlow({
      messages: originalMessages,
      runningArguments: runningActionArguments,
    });

    originalMessages.push({
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: REFINE_TOOL_ARGUMENTS_PROMPT({
        userQuery: message,
        actionFlow,
        runningArguments: runningActionArguments
          .map((arg) => `${arg.role}: ${arg.content}`)
          .join('\n'),
        toolInfo: {
          name: tool.name,
          displayName: tool.displayName,
          arguments: runningActionArguments
            .filter((arg) => arg.role === Role.user)
            .map((arg) => arg.content)
            .join(', '),
        },
      }),
      actionId: currentAction?.id,
    });
  }

  let toolResult;
  try {
    toolResult = await tool({ user }, toolArgs);
  } catch (error) {
    console.error('Error running tool:', error);
    return 'Error running tool' + toolName;
  }

  const summarisedResult = await summariseToolResult(
    message,
    toolName,
    toolInfo.displayName,
    toolResult
  );
  console.log('toolResponseSummaryMessage', summarisedResult);

  USED_TOOLS_RESULTS_MAPPING.push({
    name: toolInfo.displayName,
    result: summarisedResult,
  });

  // const previouslyUsedTools = USED_TOOLS_RESULTS_MAPPING.map(
  //   (tool) => `${tool.name}: ${tool.result}`
  // ).join('\n');

  const satisfiesPrompt =
    toolResult?.satisfiesQuery ||
    (await compareOutputWithPrompt(message, summarisedResult));

  if (!satisfiesPrompt) {
    return await runAction({
      user,
      message,
      currentAction,
      chatHistory: originalMessages,
    });
  }

  await updateActionFlow({
    user,
    action: {
      ...currentAction,
      status: ActionStatus.COMPLETED,
    },
  });

  return {
    message: summarisedResult,
    result: toolResult,
    action: currentAction,
    toolDisplayName: toolInfo.displayName,
  };
}

export async function getBetterResponse({
  message,
  baseResponse,
  processedActionResponses,
}: {
  message: string;
  baseResponse: string;
  processedActionResponses: string;
}) {
  const response = await getChatCompletion({
    messages: [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: `
          Does this reasonably answer the following? ${message}

          \`\`\`
          ${processedActionResponses}
          \`\`\`

          Response format
          - yes
          - no
        `,
      },
    ],
  });

  console.log({
    message,
    baseResponse,
    processedActionResponses,
    new: response.content,
  });

  return response.content === 'yes';
}
