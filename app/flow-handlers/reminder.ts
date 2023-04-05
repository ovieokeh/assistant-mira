import type { ChatActionArgs } from '~/types';
import { listEvents } from '~/lib/processors/process_reminder_actions';

export default async function processReminderFlow({
  userId,
  args,
}: {
  userId: number;
  args: ChatActionArgs;
}) {
  const reminders = await listEvents({ userId });
  console.log({ args, reminders });
}
