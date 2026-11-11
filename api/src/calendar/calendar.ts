/**
 * Dates are plain `YYYY-MM-DD` strings in the office's time zone. Nobody books
 * a desk at an instant: they book a day, as people in Brussels count days.
 */
export const OFFICE_TIME_ZONE = 'Europe/Brussels';

/** How far ahead a desk can be booked, today included. */
export const BOOKING_WINDOW_DAYS = 14;

export type IsoDate = string;
export type Slot = 'day' | 'am' | 'pm';

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today in Brussels, whatever the server's own time zone. */
export function today(now: Date = new Date()): IsoDate {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: OFFICE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 for Monday … 7 for Sunday. */
export function weekday(date: IsoDate): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isWorkday(date: IsoDate): boolean {
  return weekday(date) <= 5;
}

export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, 1 - weekday(date));
}

/** The last day that can be booked from `from`. */
export function windowEnd(from: IsoDate = today()): IsoDate {
  return addDays(from, BOOKING_WINDOW_DAYS - 1);
}

/** The working days a desk can be booked on, in order. */
export function bookableDays(from: IsoDate = today()): IsoDate[] {
  const days: IsoDate[] = [];
  for (let date = from; date <= windowEnd(from); date = addDays(date, 1)) {
    if (isWorkday(date)) {
      days.push(date);
    }
  }
  return days;
}

export type DateRefusal =
  'invalid_date' | 'past_date' | 'beyond_window' | 'weekend';

/** Why a date can't be booked, or null when it can. */
export function refuseDate(
  date: string,
  from: IsoDate = today(),
): DateRefusal | null {
  if (
    !ISO_DATE.test(date) ||
    Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ||
    addDays(date, 0) !== date
  ) {
    return 'invalid_date';
  }
  if (date < from) {
    return 'past_date';
  }
  if (date > windowEnd(from)) {
    return 'beyond_window';
  }
  if (!isWorkday(date)) {
    return 'weekend';
  }
  return null;
}

export function slotOf({ am, pm }: { am: boolean; pm: boolean }): Slot {
  return am && pm ? 'day' : am ? 'am' : 'pm';
}

export function halves(slot: Slot): { am: boolean; pm: boolean } {
  return { am: slot !== 'pm', pm: slot !== 'am' };
}
