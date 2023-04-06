import type { ChatActionArgs } from '~/types';
import type { User } from '@prisma/client';
import { listEvents } from '~/processors/process_reminder_actions';
import { createSummary } from '~/models/reasoning/actions.server';
import sendWhatsappMessage from '~/helpers/send_whatsapp_message';
import { ActionStatus } from '@prisma/client';
import { updateActionFlow } from '~/models/memory/action.server';

export default async function processReminderFlow({
  user,
  args,
  action,
  actionFlowId,
}: {
  user: User;
  args: ChatActionArgs;
  action: any;
  actionFlowId?: number;
}) {
  try {
    const reminders = await listEvents({ user });
    const processedReminders = reminders.map((reminder) => reminder);

    const remindersSummary = await createSummary({
      dataType: 'calendar',
      jsonData: JSON.stringify(processedReminders),
    });

    if (!remindersSummary) {
      return await sendWhatsappMessage({
        userId: user.id,
        to: user.phone,
        text: 'Unable to fetch your schedule',
        actionId: actionFlowId,
      });
    }
    await updateActionFlow({
      user,
      action: {
        id: actionFlowId,
        name: action.name,
        status: ActionStatus.COMPLETED,
      },
    });

    return await sendWhatsappMessage({
      userId: user.id,
      to: user.phone,
      text: remindersSummary,
      actionId: actionFlowId,
    });
  } catch (error) {
    console.error(error);
  }
}
