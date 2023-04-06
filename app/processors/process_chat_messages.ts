// TODO: Hash messages to prevent duplicates

import type { WhatsappTextMessageContent } from '~/types';
import { CHAT_ACTION, FETCH_REMINDERS, REFINE_ACTION } from '~/config/actions';

import { processActionFlow } from '~/flows/action';
import { processChatFlow } from '~/flows/chat';

import { getUserProfile } from '~/models/memory/user.server';
import { analysePossibleActions } from '~/models/reasoning/chat.server';

import sendWhatsappMessage from '../helpers/send_whatsapp_message';
import processReminderFlow from '~/flows/reminder';

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

  const actionAnalysis = await analysePossibleActions({
    message: newMessage,
    user,
  });

  const messageBody = {
    to: userNumber,
    humanText: newMessage,
    userId: user.id,
  };

  if (!actionAnalysis) {
    await sendWhatsappMessage({
      ...messageBody,
      text: `I'm sorry, I don't understand what you mean.`,
    });
    return true;
  }

  switch (actionAnalysis.action) {
    case REFINE_ACTION:
      await processActionFlow({
        user,
        messageData: messageBody,
        action: actionAnalysis.action,
        actionFlowId: actionAnalysis.actionFlowId,
        args: actionAnalysis.args,
      });
      break;

    case CHAT_ACTION:
      await processChatFlow({ user, messages });
      break;

    case FETCH_REMINDERS:
      await processReminderFlow({
        user,
        args: actionAnalysis.args,
        action: actionAnalysis.action,
        actionFlowId: actionAnalysis.actionFlowId,
      });
      break;

    default:
      await sendWhatsappMessage({
        ...messageBody,
        text: `I'm sorry, I don't understand what you mean.`,
      });
  }

  return true;
}
