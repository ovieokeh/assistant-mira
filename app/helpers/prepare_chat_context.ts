import type { UnformattedMessage, UserWithProfile } from '~/types';
import type { Message } from '@prisma/client';
import { Role } from '@prisma/client';
import { getUserMessages } from '~/models/memory/user.server';
import { DEFAULT_CHAT_PROMPT } from '~/config/prompts';

export default async function prepareChatContext({
  user,
  newMessages,
}: {
  user: UserWithProfile;
  newMessages: UnformattedMessage[];
}) {
  const profileData = user.profile?.data || 'No profile data';
  const messageHistory = await getUserMessages({ userId: user.id });
  const chatContext: Pick<Message, 'role' | 'content'>[] = [
    {
      role: Role.system,
      content: DEFAULT_CHAT_PROMPT({
        name: user.name,
        bio: profileData,
      }),
    },
  ];
  chatContext.push(
    ...messageHistory.map((message) => ({
      role: message.role,
      content: message.content,
    }))
  );
  chatContext.push({ role: Role.user, content: newMessages[0].text.body });

  return chatContext;
}
