import type { RawWhatsappWebhookEntry } from '~/types';

export default function formatWhatsappMessages(
  rawWebhookData: RawWhatsappWebhookEntry[]
) {
  const chatMessages = [];
  const audioMessages = [];

  for (const entry of rawWebhookData) {
    const changesWithMessages = entry.changes?.filter(
      (change) => change.field === 'messages'
    );

    const messagesWithTypeAudio = changesWithMessages.map((message) =>
      message.value.messages?.filter((value) => value.type === 'audio')
    );
    const messagesWithTypeText = changesWithMessages.map((message) =>
      message.value.messages?.filter((value) => value.type === 'text')
    );

    chatMessages.push(...messagesWithTypeText.flat());
    audioMessages.push(...messagesWithTypeAudio.flat());
  }

  const sanitisedChatMessages = chatMessages.filter(Boolean);
  const sanitisedAudioMessages = audioMessages.filter(Boolean);

  return {
    chatMessages: sanitisedChatMessages,
    audioMessages: sanitisedAudioMessages,
  };
}
