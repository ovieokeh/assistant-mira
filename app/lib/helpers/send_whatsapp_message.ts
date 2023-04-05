import type { WhatsappMessage } from '~/types';
import axios from 'axios';

import { saveConversation } from '~/models/memory/conversation.server';
import { Role } from '@prisma/client';

export default async function sendWhatsappMessage(message: WhatsappMessage) {
  const url = 'https://graph.facebook.com/v16.0/127038643650780/messages';
  const headers = {
    Authorization: `Bearer ${process.env.CLOUD_API_PERMANENT_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const body = {
    messaging_product: 'whatsapp',
    to: message.to,
    type: 'text',
    text: {
      preview_url: false,
      body: message.text,
    },
  };

  await axios.post(url, body, { headers }).catch((error) => {
    console.error('send message error', error.response.data);
  });

  const conversationToSave = [
    {
      userId: message.userId,
      content: message.humanText,
      role: Role.user,
      actionId: message.actionId,
    },
    {
      userId: message.userId,
      content: message.text,
      role: Role.assistant,
      actionId: message.actionId,
    },
  ];

  return await saveConversation(conversationToSave);
}
