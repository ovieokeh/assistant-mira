import type { User } from '@prisma/client';

export type ElementType<T extends ReadonlyArray<unknown>> =
  T extends ReadonlyArray<infer ElementType> ? ElementType : never;

export type UserWithProfile = User & {
  profile: {
    data: string | null;
  } | null;
};

export type UnformattedMessage = {
  text: {
    body: string;
  };
};

export type MessageType = 'text' | 'audio';

export type WhatsappTextMessageContent = {
  from: string;
  id: string;
  timestamp: string;
  text: {
    body: string;
  };
  type: MessageType;
};

export type WhatsappAudioMessageContent = {
  from: string;
  id: string;
  timestamp: string;
  audio: {
    id: string;
    sha: string;
    mime_type: string;
    voice: boolean;
  };
  url?: string;
  type: MessageType;
};

export type MessageContent =
  | WhatsappTextMessageContent
  | WhatsappAudioMessageContent;

export type RawWhatsappWebhookEntry = {
  id: string;
  changes: {
    field: string;
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts: {
        profile: {
          name: string;
        };
        wa_id: string;
      }[];
      messages: MessageContent[];
    };
  }[];
};

export type WhatsappMessage = {
  to: string;
  text: string;
  humanText: string;
  userId: number;
  actionId: number | null;
};

export type ChatActionArgs = Record<
  string,
  {
    id: string;
    value: any;
    isValid: boolean;
  }
>;
