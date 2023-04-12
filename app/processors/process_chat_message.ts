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
import {
  extractActions,
  getChatCompletion,
} from '~/models/reasoning/chat.server';
import {
  checkIfActionsResponseIsValid,
  getToolNameAndArgs,
  runAction,
} from '~/plugins';
import { getChatHistory } from '~/helpers/chat_context';
import {
  getCurrentActionFlow,
  updateActionFlow,
} from '~/models/memory/action.server';
import { ActionStatus } from '@prisma/client';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import { PROMPTS, buildPrompt } from '~/config/prompts';

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
  let currentAction = await getCurrentActionFlow(user);
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
        content: buildPrompt({
          type: PROMPTS.DEFAULT_CHAT_PROMPT.name,
          args: {
            name: user.name,
            bio: user.profile?.data,
          },
        }),
      },
      ...chatHistory,
    ],
  });

  console.info('Analysing message for actions');
  const actionAnalysis = await extractActions({
    message: message.text.body,
    chatHistory: chatHistory
      .map((chat) => `${chat.role}: ${chat.content}`)
      .join('\n'),
  });

  console.log({ actionAnalysis });

  if (actionAnalysis.action === 'chat') {
    console.log('run chat');
    return await sendWhatsappMessage({
      to: phoneNumber,
      text: baseResponse.content,
      humanText: message.text.body,
      actionId: currentAction?.id,
      userId: user.id,
    });
  }

  if (actionAnalysis.action === 'refine') {
    console.info('Refining current action flow');
    // construct refine message and send to user
  }

  const {
    name,
    args: parameters,
    info,
  } = getToolNameAndArgs(
    actionAnalysis.tool.name,
    actionAnalysis.tool.parameters
  );
  if (!name || !info?.name || !info?.displayName)
    return await sendWhatsappMessage({
      to: phoneNumber,
      text: baseResponse.content,
      humanText: message.text.body,
      actionId: currentAction?.id,
      userId: user.id,
    });

  if (!currentAction?.id) {
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

  await sendWhatsappMessage({
    to: phoneNumber,
    text: `Give me a moment while I'm thinking about your request...`,
    humanText: message.text.body,
    actionId: currentAction?.id,
    userId: user.id,
  });

  console.log(
    `Running action ${info?.displayName} with this input ${parameters.join(
      ' '
    )}`
  );

  const { message: actionMessage } = await runAction({
    user,
    message: message.text.body,
    action: {
      name,
      parameters,
      info,
    },
    chatHistory,
    currentAction,
  });

  const betterResponse = await checkIfActionsResponseIsValid({
    message: message.text.body,
    processedActionResponses: actionMessage,
  });

  return await sendWhatsappMessage({
    actionId: currentAction?.id,
    userId: user.id,
    text: betterResponse ? actionMessage : baseResponse.content,
    humanText: actionMessage.length ? undefined : message.text.body,
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
