import type { IsoDate } from './models';

/** Days are counted in Brussels, as the API counts them. */
export const OFFICE_TIME_ZONE = 'Europe/Brussels';
export const BOOKING_WINDOW_DAYS = 14;

export function today(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: OFFICE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Noon UTC: no time zone can move it to another day. */
export const toDate = (date: IsoDate): Date => new Date(`${date}T12:00:00Z`);

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 for Monday … 7 for Sunday. */
export function weekday(date: IsoDate): number {
  const day = toDate(date).getUTCDay();
  return day === 0 ? 7 : day;
}

export const isWorkday = (date: IsoDate): boolean => weekday(date) <= 5;

export const mondayOf = (date: IsoDate): IsoDate => addDays(date, 1 - weekday(date));

export function bookableDays(from: IsoDate = today()): IsoDate[] {
  const days: IsoDate[] = [];
  for (let offset = 0; offset < BOOKING_WINDOW_DAYS; offset += 1) {
    const date = addDays(from, offset);
    if (isWorkday(date)) {
      days.push(date);
    }
  }
  return days;
}

export const isIsoDate = (value: unknown): value is IsoDate =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;

/** Formats a day in the page's language, e.g. "mar. 12 nov.". */
export function formatDay(
  date: IsoDate,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(toDate(date));
}
