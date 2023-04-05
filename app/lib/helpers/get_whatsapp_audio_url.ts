import type { WhatsappAudioMessageContent } from '~/types';
import axios from 'axios';

export default async function getWhatsappAudioUrl(
  audioMessage: WhatsappAudioMessageContent
) {
  if (!audioMessage.audio) return;

  const urlData = await axios.get(
    `https://graph.facebook.com/v16.0/${audioMessage.audio.id}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLOUD_API_PERMANENT_TOKEN}`,
      },
    }
  );

  return urlData.data;
}
