/**
 * Process message flow
 *
 * Receive new message
 * Format into a Message object
 * Retrieve user from database
 * Retrieve previous messages from database
 * Generate base response
 *
 * Run action analysis to determine whether to use plugins
 * If message requires one or more plugins
 *
 * For each plugin
 * - Start a new action flow
 *
 * - If action can be run
 * - - run it
 * - - compare results to base response
 * - - send better response to user
 * - - update action flow to completed
 * - - save messages to database (new message, action response)
 *
 * - If action requires more information
 * - - Update the action flow to refine
 * - - Send a message to the user asking for more information
 * - - Save messages to database (new message, refine request
 *
 * If message does not require a plugin
 * - Send base response to the user
 * - Save messages to database (new message, response)
 *
 * End of message processing
 */

import type { UserWithProfile, WhatsappTextMessageContent } from '~/types';
import sendWhatsappMessage from '~/helpers/send_whatsapp_message';
import { getChatCompletion } from '~/models/reasoning/chat.server';
import {
  analyseForActions,
  getBetterResponse,
  getToolNameAndArgs,
  runAction,
} from '~/plugins';
import { getChatHistory } from '~/helpers/chat_context';
import {
  getCurrentActionFlow,
  updateActionFlow,
} from '~/models/memory/action.server';
import { ActionStatus } from '@prisma/client';
import { DEFAULT_CHAT_PROMPT } from '~/config/prompts';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';

export async function processChatMessage({
  message,
  user,
}: {
  message: WhatsappTextMessageContent;
  user: UserWithProfile;
}) {
  if (!message || !message?.id) return null;
  const phoneNumber = message.from;

  console.info('Getting current action flow');
  const currentAction = await getCurrentActionFlow(user);
  console.info('Getting chat history');
  const { chatHistory } = await getChatHistory({
    user,
    message,
    currentAction,
  });
  console.info('Getting base response');
  const baseResponse = await getChatCompletion({
    messages: [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: DEFAULT_CHAT_PROMPT({
          name: user.name,
          bio: user.profile?.data,
        }),
      },
      ...chatHistory,
    ],
  });

  console.info('Analysing message for actions');
  const actionAnalysis = await analyseForActions({
    message: message.text.body,
    chatHistory,
  });

  if (actionAnalysis[0] === 'Run chat') {
    console.log('run chat');
    return await sendWhatsappMessage({
      to: phoneNumber,
      text: baseResponse.content,
      humanText: message.text.body,
      actionId: currentAction?.id,
      userId: user.id,
    });
  }

  if (actionAnalysis[0] === 'Refine chat') {
    console.info('Refining current action flow');
    // construct refine message and send to user
  }

  if (actionAnalysis[0] === 'Cancel') {
    console.info('Cancelling current action flow');
    await updateActionFlow({
      user,
      action: {
        ...currentAction,
        tool: currentAction?.tool || 'none',
        status: ActionStatus.CANCELLED,
      },
    });

    // send message to user
  }

  const actionResponses = [];
  for (const action of actionAnalysis) {
    const { toolName, toolArgs, toolInfo } = getToolNameAndArgs(action);
    if (!toolName || !toolInfo?.name || !toolInfo?.displayName) continue;

    console.log(`Running ${toolInfo?.displayName} with this input ${toolArgs}`);

    await sendWhatsappMessage({
      to: phoneNumber,
      text: `Give me a moment while I'm thinking about your request...`,
      humanText: message.text.body,
      actionId: currentAction?.id,
      userId: user.id,
    });

    const { message: actionMessage, toolDisplayName } = await runAction({
      user,
      message: action,
      actionInvocation: {
        name: toolName,
        args: toolArgs,
        info: toolInfo,
      },
      chatHistory,
      currentAction,
    });

    actionResponses.push({ message: actionMessage, toolDisplayName });
  }

  const processedActionResponses = actionResponses
    .map((actionResponse) => {
      const { message: actionMessage } = actionResponse;
      return actionMessage;
    })
    .join('\n');

  console.info('Generating final response');
  const betterResponse = await getBetterResponse({
    message: message.text.body,
    processedActionResponses,
  });

  return await sendWhatsappMessage({
    actionId: currentAction?.id,
    userId: user.id,
    text: betterResponse ? processedActionResponses : baseResponse.content,
    humanText: actionResponses.length ? undefined : message.text.body,
    to: user.phone,
  });
}

/**
 * Run plugin flow
 * 
 * Take plugin name, arguments, and user query
 * If plugin does not exist or cannot be run
 * - Return error message
 * 
 * If plugin can be run
 * - Run plugin
 * - Summarise results if necessary
 * - Check if results partially/fully satisfy user query
 * - If yes
 * - - Return results
 * - If no
 * - - Try to find a better plugin and restart flow
 * - - If no better plugin can be found
 * - - - Return results
 * 
 * End of plugin flow

 */
