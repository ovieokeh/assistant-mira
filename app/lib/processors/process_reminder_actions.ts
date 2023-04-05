import { getCalendarClient } from '~/services/google.server';

/**
 * Lists the next 10 events on the user's primary calendar.
 */
export async function listEvents({ userId }: { userId: number }) {
  const calendar = await getCalendarClient({ userId });

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
