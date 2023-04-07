import type { User } from '@prisma/client';
import type { PluginDetail } from '~/types';
import { getCalendarClient } from '~/services/google.server';

export const pluginDescription: PluginDetail = {
  name: 'calendar',
  displayName: 'Google Calendar API',
  description: `
    Provides access to the next 10 events on your calendar.

    Example:
    \`\`\`
    > calendar()
    <json array of events>
    \`\`\`
  `,
  usage: 'calendar(query)',
};

export default async function calendar({ user }: { user: User }, ...args: any) {
  const calendar = await getCalendarClient({ user });

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items;
  if (!events || events.length === 0) {
    return 'No upcoming events found.';
  }

  return events;
}
