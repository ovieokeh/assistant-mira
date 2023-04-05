import type { UnformattedMessage, UserWithProfile } from '~/types';
import type { Message } from '@prisma/client';
import { Role } from '@prisma/client';
import { CHAT_PRIMER } from '../../config/prompts';
import { getUserMessages } from '~/models/memory/user.server';

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
      content: `
      ${CHAT_PRIMER}
      This is the info of the person you're chatting with:
      name: ${user.name}
      bio: ${profileData}`,
    },
  ];
  chatContext.push(...messageHistory);
  chatContext.push({ role: Role.user, content: newMessages[0].text.body });

  return chatContext;
}
