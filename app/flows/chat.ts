import invariant from 'tiny-invariant';

import type { UserWithProfile, WhatsappTextMessageContent } from '~/types';

import prepareChatContext from '~/lib/formatters/prepare_chat_context';
import sendWhatsappMessage from '~/lib/helpers/send_whatsapp_message';
import { completeChatMessages } from '~/models/processing/chat.server';

export async function processChatFlow({
  user,
  messages,
}: {
  user: UserWithProfile;
  messages: WhatsappTextMessageContent[];
}) {
  const userNumber = messages[0].from;

  const chatContext = await prepareChatContext({
    user,
    newMessages: messages,
  });

  const chatGPTResponse = await completeChatMessages({
    messages: chatContext,
    phone: userNumber,
  });

  if (!chatGPTResponse) {
    invariant(false, 'No chat response from GPT-3');
  }

  console.log('Mira:', chatGPTResponse);

  await sendWhatsappMessage({
    to: userNumber,
    humanText: messages[0].text.body,
    text: chatGPTResponse,
    userId: user.id,
    actionId: null,
  });
}
