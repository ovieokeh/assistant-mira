import type { ConversationMessage, WhatsappMessage } from '~/types';
import { Role } from '@prisma/client';
import axios from 'axios';

import { saveConversation } from '~/models/memory/conversation.server';

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

  const conversationToSave: ConversationMessage[] = [];
  if (message.humanText) {
    conversationToSave.push({
      userId: message.userId,
      role: Role.user,
      content: message.humanText,
      actionId: message.actionId || null,
      hash: message.hash || undefined,
    });
  }

  if (message.text) {
    conversationToSave.push({
      userId: message.userId,
      role: Role.assistant,
      content: message.text,
      actionId: message.actionId || null,
      hash: null,
    });
  }

  return await saveConversation(conversationToSave);
}
