import type { Desk, Equipment, Reservation, Slot } from '../core/models';

export type DeskStatus = 'free' | 'partial' | 'full' | 'mine' | 'inactive';

/** A desk on a given day: who has each half, and what that means for the plan. */
export interface DeskState {
  desk: Desk;
  am: Reservation | null;
  pm: Reservation | null;
  status: DeskStatus;
  /** Whether the desk has every piece of equipment the filters ask for. */
  matches: boolean;
}

export function deskStates(
  desks: Desk[],
  reservations: Reservation[],
  meId: string | null,
  filters: Equipment[],
): DeskState[] {
  const byDesk = new Map<string, Reservation[]>();
  for (const reservation of reservations) {
    byDesk.set(reservation.deskId, [...(byDesk.get(reservation.deskId) ?? []), reservation]);
  }
  return desks.map((desk) => {
    const bookings = byDesk.get(desk.id) ?? [];
    const am = bookings.find((r) => r.slot !== 'pm') ?? null;
    const pm = bookings.find((r) => r.slot !== 'am') ?? null;
    const status: DeskStatus = !desk.active
      ? 'inactive'
      : bookings.some((r) => r.user.id === meId)
        ? 'mine'
        : am && pm
          ? 'full'
          : am || pm
            ? 'partial'
            : 'free';
    return {
      desk,
      am,
      pm,
      status,
      matches: filters.every((item) => desk.equipment.includes(item)),
    };
  });
}

/** The half-days of a desk that are still free, as the slots one can book. */
export function freeSlots(state: DeskState): Slot[] {
  if (!state.desk.active) {
    return [];
  }
  const slots: Slot[] = [];
  if (!state.am && !state.pm) {
    slots.push('day');
  }
  if (!state.am) {
    slots.push('am');
  }
  if (!state.pm) {
    slots.push('pm');
  }
  return slots;
}

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter((part) => /^\p{Lu}/u.test(part))
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
