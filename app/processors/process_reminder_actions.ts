import type { User } from '@prisma/client';
import { getCalendarClient } from '~/services/google.server';

/**
 * Lists the next 10 events on the user's primary calendar.
 */
export async function listEvents({ user }: { user: User }) {
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
    return [];
  }

  return events;
}
