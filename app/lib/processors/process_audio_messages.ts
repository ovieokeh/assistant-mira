import type { WhatsappAudioMessageContent } from '~/types';
import axios from 'axios';

import getAudioUrl from '../helpers/get_whatsapp_audio_url';

export default async function processAudioMessages(
  messages: WhatsappAudioMessageContent[]
) {
  if (!messages.length) return null;

  const messagesWithUrl = [...messages];

  for (const audioMessage of messagesWithUrl) {
    const urlData = await getAudioUrl(audioMessage);
    audioMessage.url = urlData.url;
  }

  await axios.post('https://vntranscriber.com/2_convert', messagesWithUrl);
  return true;
}
