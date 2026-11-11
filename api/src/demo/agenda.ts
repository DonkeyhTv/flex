import type { IsoDate } from '../calendar/calendar.js';
import { weekday } from '../calendar/calendar.js';
import type { Desk, Team } from '../database/schema.js';

export interface AgendaPerson {
  id: string;
  team: Team;
}

export interface AgendaBooking {
  userId: string;
  deskId: string;
  date: IsoDate;
  am: boolean;
  pm: boolean;
}

/** A small seeded generator: the same day always gets the same agenda. */
export function random(seed: string): () => number {
  // FNV-1a over the UTF-16 code units: the seed is an ASCII date.
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  }
  state >>>= 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tuesdays and Thursdays are the busy days, as in most hybrid offices. */
const PRESENCE: Record<number, number> = {
  1: 0.45,
  2: 0.78,
  3: 0.55,
  4: 0.75,
  5: 0.3,
};

const preferredZone = (team: Team) => (team === 'ops' ? 'calme' : team);

/**
 * Who comes in on a day, and where they sit: people take a desk in their
 * team's area when one is free, then in the quiet zone, then anywhere.
 */
export function agendaFor(
  date: IsoDate,
  people: AgendaPerson[],
  desks: Desk[],
): AgendaBooking[] {
  const next = random(date);
  const taken = new Map<string, { am: boolean; pm: boolean }>();
  const bookings: AgendaBooking[] = [];
  const free = (desk: Desk, am: boolean, pm: boolean) => {
    const used = taken.get(desk.id);
    return desk.active && !(used && ((am && used.am) || (pm && used.pm)));
  };

  for (const person of people) {
    if (next() > (PRESENCE[weekday(date)] ?? 0)) {
      continue;
    }
    const half = next();
    const am = half > 0.08;
    const pm = half < 0.08 || half > 0.16;
    const shuffled = [...desks].sort(() => next() - 0.5);
    const desk =
      shuffled.find(
        (d) => d.zone === preferredZone(person.team) && free(d, am, pm),
      ) ??
      shuffled.find((d) => d.zone === 'calme' && free(d, am, pm)) ??
      shuffled.find((d) => free(d, am, pm));
    if (!desk) {
      continue;
    }
    const used = taken.get(desk.id) ?? { am: false, pm: false };
    taken.set(desk.id, { am: used.am || am, pm: used.pm || pm });
    bookings.push({ userId: person.id, deskId: desk.id, date, am, pm });
  }
  return bookings;
}
