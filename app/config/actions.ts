export const CHAT_ACTION = 'CHAT' as const;
export const CREATE_REMINDER = 'CREATE_REMINDER' as const;
export const FETCH_REMINDERS = 'FETCH_REMINDERS' as const;
export const CREATE_NOTE = 'CREATE_NOTE' as const;
export const FETCH_NOTES = 'FETCH_NOTES' as const;
export const CREATE_CALENDAR_EVENT = 'CREATE_CALENDAR_EVENT' as const;
export const FETCH_CALENDAR_EVENTS = 'FETCH_CALENDAR_EVENTS' as const;
export const TRANSCRIBE_AUDIO = 'TRANSCRIBE_AUDIO' as const;
export const REFINE_ACTION = 'REFINE_ACTION' as const;

export const POSSIBLE_ACTIONS = [
  CHAT_ACTION,
  CREATE_REMINDER,
  FETCH_REMINDERS,
  CREATE_NOTE,
  FETCH_NOTES,
  CREATE_CALENDAR_EVENT,
  FETCH_CALENDAR_EVENTS,
  REFINE_ACTION,
] as const;

export const MESSAGING_STATES = {
  CHAT: 'CHAT',
  ACTION: 'ACTION',
};

export const ACTION_REQUIRED_ARGS: {
  [key: string]: string[] | undefined;
} = {
  CREATE_REMINDER: ['text', 'date', 'time'],
  FETCH_REMINDERS: ['date'],
  CREATE_NOTE: ['text'],
  FETCH_NOTES: ['date'],
  CREATE_CALENDAR_EVENT: ['text', 'date', 'time'],
  FETCH_CALENDAR_EVENTS: ['date'],
  TRANSCRIBE_AUDIO: ['audio_url'],
};

// REGEX TO VALIDATE THE FOLLOWING PATTERN: 24:59 or 12:59
export const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// REGEX TO VALIDATE THE FOLLOWING PATTERN: 2021-12-31
export const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

// REGEX TO VALIDATE THE FOLLOWING PATTERN: 2021-12-31 24:59 or 2021-12-31 12:59
export const DATE_TIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2}) ([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// REGEX TO VALIDATE STRINGS THAT ARE NOT EMPTY
export const TEXT_REGEX = /^.+$/;

export const ACTION_TYPE_DATA_REGEX: {
  [key: string]: RegExp;
} = {
  text: TEXT_REGEX,
  date: DATE_REGEX,
  time: TIME_REGEX,
  audio_url: TEXT_REGEX,
};
