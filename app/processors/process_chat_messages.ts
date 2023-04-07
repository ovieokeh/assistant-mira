// TODO: Hash messages to prevent duplicates

import type { WhatsappTextMessageContent } from '~/types';

import { getUserProfile } from '~/models/memory/user.server';
import sendWhatsappMessage from '../helpers/send_whatsapp_message';
import prepareChatContext from '~/helpers/prepare_chat_context';
import { checkForActions, runPlugin } from '~/plugins';
import { getChatCompletion } from '~/models/reasoning/chat.server';

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
  try {
    const chatContext = await prepareChatContext({
      user,
      newMessages: messages,
    });

    const messageBody = {
      to: userNumber,
      humanText: newMessage,
      userId: user.id,
    };

    const action = await checkForActions({
      message: newMessage,
      previousMessages: chatContext,
    });

    if (action) {
      const { isRefineAction, message } = await runPlugin({
        userQuery: newMessage,
        user,
        message: action,
        previousMessages: chatContext,
      });

      if (isRefineAction) {
        await sendWhatsappMessage({
          ...messageBody,
          text: `I'm sorry, I don't understand what you mean.`,
        });
      }

      await sendWhatsappMessage({
        to: userNumber,
        humanText: messages[0].text.body,
        text: message,
        userId: user.id,
      });
      return true;
    }

    const baseResponse = await getChatCompletion({
      messages: chatContext,
    });

    await sendWhatsappMessage({
      to: userNumber,
      humanText: messages[0].text.body,
      text: baseResponse.content,
      userId: user.id,
    });

    return true;
  } catch (error) {
    console.error('Error processing chat messages:', error);
    await sendWhatsappMessage({
      to: userNumber,
      humanText: messages[0].text.body,
      text: 'Sorry, I had an error processing your message. Please try again.',
      userId: user.id,
    });
    return false;
  }
}
