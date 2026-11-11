import type { Desk, Reservation } from '../core/models';
import { deskStates, freeSlots, initials } from './desk-state';
import { nearest } from './floor-plan';

const desk = (id: string, x: number, y: number, extra: Partial<Desk> = {}): Desk => ({
  id,
  code: id,
  floorId: 'f1',
  zone: 'design',
  x,
  y,
  facing: 'north',
  equipment: [],
  active: true,
  disabledReason: null,
  ...extra,
});

const booking = (
  deskId: string,
  slot: Reservation['slot'],
  userId: string,
  name = 'Emma Claes',
): Reservation => ({
  id: `${deskId}-${slot}-${userId}`,
  deskId,
  deskCode: deskId,
  floorId: 'f1',
  date: '2026-11-12',
  slot,
  user: { id: userId, name, team: 'design' },
});

describe('desk states', () => {
  const desks = [
    desk('a', 0, 0),
    desk('b', 100, 0),
    desk('c', 200, 0, { equipment: ['standing'] }),
    desk('d', 300, 0, { active: false }),
  ];

  it('says who has each half, and what the plan shows', () => {
    const states = deskStates(
      desks,
      [booking('a', 'day', 'emma'), booking('b', 'am', 'emma'), booking('c', 'pm', 'me')],
      'me',
      [],
    );
    expect(states.map((s) => s.status)).toEqual(['full', 'partial', 'mine', 'inactive']);
    expect(states[1].am?.user.name).toBe('Emma Claes');
    expect(states[1].pm).toBeNull();
  });

  it('keeps every desk, and marks the ones without the equipment asked for', () => {
    const states = deskStates(desks, [], null, ['standing']);
    expect(states.map((s) => s.matches)).toEqual([false, false, true, false]);
  });

  it('offers only the halves that are free', () => {
    const [free, morningTaken, , outOfService] = deskStates(
      desks,
      [booking('b', 'am', 'emma')],
      'me',
      [],
    );
    expect(freeSlots(free)).toEqual(['day', 'am', 'pm']);
    expect(freeSlots(morningTaken)).toEqual(['pm']);
    expect(freeSlots(outOfService)).toEqual([]);
  });

  it('shows initials, particles left out', () => {
    expect(initials('Thomas De Smet')).toBe('TD');
    expect(initials('Lars van Damme')).toBe('LD');
    expect(initials('Chloé Dupont')).toBe('CD');
  });
});

describe('arrow keys on the plan', () => {
  // Two rows of three desks, and a desk further right, a little lower.
  const states = deskStates(
    [
      desk('a1', 0, 0),
      desk('a2', 70, 0),
      desk('a3', 140, 0),
      desk('b1', 0, 40),
      desk('b2', 70, 40),
      desk('far', 400, 30),
    ],
    [],
    null,
    [],
  );
  const at = (id: string) => states.find((s) => s.desk.id === id)!;

  it('moves to the nearest desk straight ahead', () => {
    expect(nearest(at('a1'), states, 'right')?.desk.id).toBe('a2');
    expect(nearest(at('a1'), states, 'down')?.desk.id).toBe('b1');
    expect(nearest(at('b2'), states, 'up')?.desk.id).toBe('a2');
    expect(nearest(at('a3'), states, 'right')?.desk.id).toBe('far');
  });

  it('stays put at the edge', () => {
    expect(nearest(at('a1'), states, 'left')).toBeUndefined();
    expect(nearest(at('a1'), states, 'up')).toBeUndefined();
  });
});
