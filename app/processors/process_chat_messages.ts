import type { WhatsappTextMessageContent } from '~/types';
import { Role } from '@prisma/client';

import { getUserProfile } from '~/models/memory/user.server';
import sendWhatsappMessage from '../helpers/send_whatsapp_message';
import { prepareChatContext } from '~/helpers/chat_context';
import { checkForActions, runPlugin } from '~/plugins';
import { getChatCompletion } from '~/models/reasoning/chat.server';
import createHash from '~/helpers/createHash';
import { DEFAULT_CHAT_PROMPT } from '~/config/prompts';
import { updateActionFlow } from '~/models/memory/action.server';

export default async function processChatMessages(
  messages: WhatsappTextMessageContent[]
) {
  if (!messages || !messages.length) return null;

  const userNumber = messages[0].from;
  const newMessage = messages[0].text.body;

  const user = await getUserProfile({ phone: userNumber });

  if (!user) {
    await sendWhatsappMessage({
      to: userNumber,
      text: `I don't know who you are. Please register with me first at https://mira-assistant-staging.fly.dev/join`,
      humanText: newMessage,
      userId: null,
    });
    return true;
  }

  const messageHash = createHash(newMessage);

  try {
    const { chatContext } = await prepareChatContext({
      user,
      newMessages: messages,
      messageHash,
    });

    const messageBody = {
      to: userNumber,
      humanText: newMessage,
      userId: user.id,
    };

    const actionAnalysisResponse = await checkForActions({
      user,
      message: newMessage,
      previousMessages: chatContext,
    });

    if (!actionAnalysisResponse) return;

    console.log('Action analysis:', actionAnalysisResponse);

    const { message: actionAnalysis, action } = actionAnalysisResponse;

    if (action === 'refineResponse') {
      const action = await updateActionFlow({
        user,
        action: {
          name: 'Refine response',
          tool: 'chat',
        },
      });

      return await sendWhatsappMessage({
        ...messageBody,
        text: actionAnalysis,
        actionId: action.id,
      });
    }

    if (action === 'runPlugin') {
      const { message, action: actionInDb } = await runPlugin({
        userQuery: newMessage,
        user,
        message: actionAnalysis,
        previousMessages: chatContext,
      });

      return await sendWhatsappMessage({
        to: userNumber,
        humanText: messages[0].text.body,
        text: message,
        userId: user.id,
        actionId: actionInDb?.id,
      });
    }

    const baseResponse = await getChatCompletion({
      messages: [
        {
          role: Role.system,
          content: DEFAULT_CHAT_PROMPT({
            name: user.name,
            bio: user.profile.data,
          }),
        },
        ...chatContext,
      ],
    });

    return await sendWhatsappMessage({
      to: userNumber,
      humanText: messages[0].text.body,
      text: baseResponse.content,
      userId: user.id,
    });
  } catch (error: any) {
    if (error.response)
      console.error('Error processing chat messages:', error.response.data);
    else console.error('Error processing chat messages:', error);

    await sendWhatsappMessage({
      to: userNumber,
      humanText: messages[0].text.body,
      text: 'Sorry, I had an error processing your message. Please try again.',
      userId: user.id,
    });
  }
}
