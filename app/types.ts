import type { Action, Message, User } from '@prisma/client';
import type { ChatCompletionRequestMessageRoleEnum } from 'openai';

export type ElementType<T extends ReadonlyArray<unknown>> =
  T extends ReadonlyArray<infer ElementType> ? ElementType : never;

export type UserWithProfile = User & {
  profile: {
    data: string;
  };
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
  humanText?: string;
  userId: number | null;
  actionId?: number;
  hash?: number | null;
};

export type ConversationMessage = {
  userId: number | null;
  actionId?: number | null;
  hash?: number | null;
  content: string;
  role: ChatCompletionRequestMessageRoleEnum;
};

export type ChatActionArgs = Record<
  string,
  {
    id: string;
    value: any;
    isValid: boolean;
  }
>;

export type PluginDetail = {
  name?: string;
  displayName?: string;
  description?: string;
  usage?: string;
};

export type ActionWithMessages = Action & {
  messages: Message[];
};

export type ChatHistoryMessage = {
  role: ChatCompletionRequestMessageRoleEnum;
  content: string;
  actionId: number | null;
  userId: number | null;
};
