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
import summarise, {
  pluginDescription as summarisePluginDescription,
} from './summarise';
import {
  compareOutputWithPrompt,
  extractActions,
  getChatCompletion,
  summariseToolResult,
} from '~/models/reasoning/chat.server';
import { REFINE_TOOL_ARGUMENTS_PROMPT } from '~/config/prompts';
import { updateActionFlow } from '~/models/memory/action.server';
import { prepareActionFlow } from '~/helpers/chat_context';

export const PLUGIN_REGISTRY = [
  searchPluginDescription,
  summarisePluginDescription,
  replPluginDescription,
];
const PLUGIN_MAP: {
  [key: string]: any;
} = {
  summarise,
  search,
  repl,
};

export const PLUGIN_DISPLAY_NAME_MAP: {
  [key: string]: PluginDetail;
} = {
  search: searchPluginDescription,
  summarise: summarisePluginDescription,
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
  chatHistory,
}: {
  message: string;
  chatHistory: ChatHistoryMessage[];
}): Promise<string[]> {
  const actionsExtract = await extractActions({
    message,
    chatHistory: chatHistory
      .map((chat) => `${chat.role}: ${chat.content}`)
      .join('\n'),
  });

  return actionsExtract.split('\n');
}

export const getToolNameAndArgs = (message: string) => {
  const [, toolInvocation] = message.split('Run tool:');
  if (!toolInvocation)
    return {
      toolName: '',
      toolArgs: '',
      toolInfo: {
        name: '',
        displayName: '',
        description: '',
      },
    };

  const endOfToolName = toolInvocation.indexOf('(');
  let toolName = toolInvocation.slice(0, endOfToolName);
  let toolArgs = toolInvocation.slice(endOfToolName + 1, -1);
  toolName = toolName.trim();
  toolArgs = toolArgs.trim();

  const toolInfo = toolName
    ? PLUGIN_DISPLAY_NAME_MAP[toolName]
    : {
        name: '',
        displayName: '',
        description: '',
      };

  return {
    toolName,
    toolArgs,
    toolInfo,
  };
};

let numOfRefinements = 0;
const MAX_REFINEMENTS = 3;
let runningActionArguments: {
  role: string;
  content: string;
}[] = [];
export async function runAction({
  user,
  actionInvocation,
  message,
  chatHistory,
  currentAction,
}: {
  user: UserWithProfile;
  message: string;
  actionInvocation: {
    name: string;
    args: string;
    info: PluginDetail;
  };
  chatHistory: ChatHistoryMessage[];
  currentAction: Action | null;
}): Promise<any> {
  const { name, args, info: tool } = actionInvocation;

  if (!name || !tool?.name || !tool?.displayName) return 'No tool found';

  if (!currentAction) {
    console.info('Creating new action flow');
    currentAction = await updateActionFlow({
      user,
      action: {
        name: 'Run tool',
        tool: name,
        status: ActionStatus.PENDING,
      },
    });
  }

  const originalMessages: any = [...chatHistory].filter(
    (message) => message.actionId === currentAction?.id
  );

  // If currently refining a tool invocation arguments
  if (currentAction && tool?.name) {
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

  const toolFn = PLUGIN_MAP[tool?.name];
  let toolResult;
  try {
    console.info('Running tool:', tool?.name);
    toolResult = await toolFn({ user }, args);
  } catch (error) {
    console.error('Error running tool:', error);
    return 'Error running tool' + name;
  }

  console.info('Summarising tool result');
  const summarisedResult = await summariseToolResult(
    message,
    name,
    tool.displayName,
    toolResult
  );

  const response = {
    message: summarisedResult,
    result: toolResult,
    action: currentAction,
    toolDisplayName: tool.displayName,
  };

  USED_TOOLS_RESULTS_MAPPING.push({
    name: tool.displayName,
    result: summarisedResult,
  });

  // const previouslyUsedTools = USED_TOOLS_RESULTS_MAPPING.map(
  //   (tool) => `${tool.name}: ${tool.result}`
  // ).join('\n');

  console.info('Comparing tool result with prompt');
  const satisfiesPrompt =
    toolResult?.satisfiesQuery ||
    (await compareOutputWithPrompt(message, summarisedResult));

  if (!satisfiesPrompt) {
    numOfRefinements++;
    if (numOfRefinements > MAX_REFINEMENTS) {
      console.info('Max number of refinements reached');
      numOfRefinements = 0;
      await updateActionFlow({
        user,
        action: {
          ...currentAction,
          status: ActionStatus.FAILED,
        },
      });

      return response;
    }

    return await runAction({
      user,
      message,
      currentAction,
      chatHistory: originalMessages,
      actionInvocation,
    });
  }

  console.info('Tool result satisfies prompt');
  await updateActionFlow({
    user,
    action: {
      ...currentAction,
      status: ActionStatus.COMPLETED,
    },
  });

  return response;
}

export async function getBetterResponse({
  message,
  processedActionResponses,
}: {
  message: string;
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

  return response.content === 'yes';
}
