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
import { analyseForActions, getBetterResponse, runAction } from '~/plugins';
import { getChatHistory } from '~/helpers/chat_context';
import {
  getCurrentActionFlow,
  updateActionFlow,
} from '~/models/memory/action.server';
import { ActionStatus } from '@prisma/client';

export async function processChatMessage({
  message,
  user,
}: {
  message: WhatsappTextMessageContent;
  user: UserWithProfile;
}) {
  if (!message || !message?.id) return null;
  const phoneNumber = message.from;

  const currentAction = await getCurrentActionFlow(user);
  const { chatHistory } = await getChatHistory({
    user,
    message,
    currentAction,
  });
  const baseResponse = await getChatCompletion({
    messages: chatHistory,
  });

  const actionAnalysis = await analyseForActions({
    message: message.text.body,
  });

  if (actionAnalysis[0] === 'Run chat') {
    console.log('run chat');
    return await sendWhatsappMessage({
      to: phoneNumber,
      text: baseResponse.content,
      actionId: currentAction?.id,
      userId: user.id,
    });
  }

  if (actionAnalysis[0] === 'Refine chat') {
    // construct refine message and send to user
  }

  if (actionAnalysis[0] === 'Cancel') {
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
    console.log('run action');
    const { message: actionMessage, toolDisplayName } = await runAction({
      user,
      message: action,
      chatHistory,
      currentAction,
    });

    console.log('action message', actionMessage);
    actionResponses.push({ message: actionMessage, toolDisplayName });
  }

  const processedActionResponses = actionResponses
    .map((actionResponse) => {
      const { toolDisplayName, message: actionMessage } = actionResponse;
      return `${toolDisplayName}: ${actionMessage}`;
    })
    .join('\n');

  const betterResponse = await getBetterResponse({
    message: message.text.body,
    baseResponse: baseResponse.content,
    processedActionResponses,
  });

  return await sendWhatsappMessage({
    actionId: currentAction?.id,
    userId: user.id,
    text: betterResponse ? processedActionResponses : baseResponse.content,
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
