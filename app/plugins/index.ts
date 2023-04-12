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
  checkIfToolOutputIsValid,
  getChatCompletion,
  summariseToolResult,
} from '~/models/reasoning/chat.server';
import { updateActionFlow } from '~/models/memory/action.server';
import { prepareActionFlow } from '~/helpers/chat_context';
import { PROMPTS, buildPrompt } from '~/config/prompts';

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

export const getToolNameAndArgs = (name: string, args: any[]) => {
  const info = name
    ? PLUGIN_DISPLAY_NAME_MAP[name]
    : {
        name: '',
        displayName: '',
        description: '',
      };

  return {
    name,
    args,
    info,
  };
};

export async function runAction({
  user,
  action,
  message,
  chatHistory,
  currentAction,
}: {
  user: UserWithProfile;
  message: string;
  action: {
    name: string;
    parameters: string[];
    info: PluginDetail;
  };
  chatHistory: ChatHistoryMessage[];
  currentAction: Action | null;
}): Promise<{
  createdAction?: Action;
  satisfiesQuery: boolean;
  message: string;
}> {
  const { name, parameters, info } = action;
  if (!name || !info?.name || !info?.displayName)
    return {
      satisfiesQuery: false,
      message: 'No tool found',
    };

  const userQuery = message;

  let runningActionArguments: {
    role: string;
    content: string;
  }[] = []; // TODO: Get from DB

  const originalMessages: any = [...chatHistory].filter(
    (message) => message.actionId === currentAction?.id
  );

  // If currently refining a tool invocation arguments
  if (currentAction && info.name) {
    const actionFlow = prepareActionFlow({
      messages: originalMessages,
      runningArguments: runningActionArguments,
    });

    originalMessages.push({
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: buildPrompt({
        type: PROMPTS.REFINE_TOOL_PARAMETERS_PROMPT.name,
        args: {
          userQuery,
          actionFlow,
          runningParameters: runningActionArguments
            .map((arg) => `${arg.role}: ${arg.content}`)
            .join('\n'),
          toolInfo: {
            name: info.name,
            displayName: info.displayName,
            parameters: runningActionArguments
              .filter((arg) => arg.role === Role.user)
              .map((arg) => arg.content)
              .join(', '),
          },
        },
      }),
      actionId: currentAction?.id,
    });
  }

  let parsedParameters = parameters;
  try {
    parsedParameters = JSON.parse(parameters.join(', '));
  } catch (error) {
    console.error('Error parsing parameters:', parameters);
  }

  const toolFn = PLUGIN_MAP[info.name];
  let toolResult;
  try {
    console.info('Running tool:', info.name);
    toolResult = await toolFn({ user }, parsedParameters);
  } catch (error) {
    console.error('Error running tool:', error);
    return {
      satisfiesQuery: false,
      message: 'Error running tool',
    };
  }

  const stringifiedResult = Object.entries(toolResult)
    .filter(([key]) => key !== 'satisfiesQuery')
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const summaryWithInfo = toolResult.summary
    ? `${info.displayName} result: \n ${toolResult.summary}`
    : '';

  const summarisedResult =
    summaryWithInfo ||
    (await summariseToolResult(userQuery, info.displayName, stringifiedResult));

  const previousResults = runningActionArguments.length
    ? runningActionArguments.map((t) => `${t.role}: ${t.content}`).join('\n')
    : '';

  const finalSummary =
    typeof summarisedResult === 'string'
      ? summarisedResult
      : summarisedResult.summary;
  const actionResult = await checkIfToolOutputIsValid(
    userQuery,
    finalSummary,
    previousResults,
    info.displayName
  );

  await updateActionFlow({
    user,
    action: {
      id: currentAction?.id,
      status: actionResult.satisfiesQuery
        ? ActionStatus.COMPLETED
        : ActionStatus.FAILED,
    },
  });

  return {
    ...actionResult,
    message: finalSummary,
  };
}

export async function checkIfActionsResponseIsValid({
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
          Does the following message reasonably answer "${message}"?

          message: ${processedActionResponses}

          - Only return a valid JSON object with no explanations, instructions, apologies, or any other text

          Response format (Valid JSON object) —
          {
            "satisfiesQuery": true | false,
          }/end
        `,
      },
    ],
  });

  const regexToReplaceResponseToolChat = /Response: |Tool|Chat|\n/g;

  let cleanedJSON: any = response.content.replace(
    regexToReplaceResponseToolChat,
    ''
  );
  cleanedJSON = JSON.parse(cleanedJSON) as { satisfiesQuery: boolean };
  return cleanedJSON.satisfiesQuery;
}
