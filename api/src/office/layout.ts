import type { Desk, Equipment, Team } from '../database/schema.js';

/**
 * The office of Lumen, a fictional agency in Brussels: two floors drawn in a
 * 940 × 580 coordinate space. Desks live in the database, so that an office
 * manager can take one out of service; the walls and rooms live here.
 */
export const FLOOR_WIDTH = 940;
export const FLOOR_HEIGHT = 580;
export const DESK_WIDTH = 66;
export const DESK_HEIGHT = 40;

export type Zone = Exclude<Team, 'ops'> | 'calme';
export type RoomKind = 'meeting' | 'kitchen' | 'stairs' | 'phone' | 'lounge';

export interface Room {
  id: string;
  kind: RoomKind;
  /** Proper name of a meeting room; other rooms are named by their kind. */
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  seats?: number;
}

export interface Floor {
  id: string;
  level: number;
  rooms: Room[];
}

export const FLOORS: Floor[] = [
  {
    id: 'f1',
    level: 1,
    rooms: [
      {
        id: 'f1-lounge',
        kind: 'lounge',
        x: 740,
        y: 70,
        width: 160,
        height: 130,
      },
      {
        id: 'f1-sablon',
        kind: 'meeting',
        name: 'Sablon',
        x: 470,
        y: 290,
        width: 210,
        height: 130,
        seats: 8,
      },
      {
        id: 'f1-marolles',
        kind: 'meeting',
        name: 'Marolles',
        x: 700,
        y: 290,
        width: 200,
        height: 130,
        seats: 6,
      },
      {
        id: 'f1-kitchen',
        kind: 'kitchen',
        x: 470,
        y: 440,
        width: 260,
        height: 110,
      },
      {
        id: 'f1-phone',
        kind: 'phone',
        x: 750,
        y: 440,
        width: 150,
        height: 110,
      },
      {
        id: 'f1-stairs',
        kind: 'stairs',
        x: 60,
        y: 450,
        width: 130,
        height: 100,
      },
    ],
  },
  {
    id: 'f2',
    level: 2,
    rooms: [
      {
        id: 'f2-senne',
        kind: 'meeting',
        name: 'Senne',
        x: 470,
        y: 290,
        width: 210,
        height: 130,
        seats: 10,
      },
      {
        id: 'f2-phone',
        kind: 'phone',
        x: 700,
        y: 290,
        width: 200,
        height: 130,
      },
      {
        id: 'f2-lounge',
        kind: 'lounge',
        x: 470,
        y: 440,
        width: 260,
        height: 110,
      },
      {
        id: 'f2-kitchen',
        kind: 'kitchen',
        x: 750,
        y: 440,
        width: 150,
        height: 110,
      },
      {
        id: 'f2-stairs',
        kind: 'stairs',
        x: 60,
        y: 450,
        width: 130,
        height: 100,
      },
    ],
  },
];

/** Two rows of desks facing each other, the first row along the windows when `y` is at the top. */
function island(
  floor: Floor,
  zone: Zone,
  x: number,
  y: number,
  columns: number,
  equipment: (column: number) => Equipment[],
): Omit<Desk, 'id' | 'code'>[] {
  const desks: Omit<Desk, 'id' | 'code'>[] = [];
  for (const [row, facing] of [
    [0, 'north'],
    [1, 'south'],
  ] as const) {
    for (let column = 0; column < columns; column += 1) {
      const extras = equipment(column);
      desks.push({
        floorId: floor.id,
        zone,
        x: x + column * (DESK_WIDTH + 6),
        y: y + row * DESK_HEIGHT,
        facing,
        // The windows run along the top wall.
        equipment: row === 0 && y < 150 ? [...extras, 'window'] : extras,
        active: true,
        disabledReason: null,
      });
    }
  }
  return desks;
}

const dualScreens = (): Equipment[] => ['double_screen'];
const everyThirdStanding = (column: number): Equipment[] =>
  column % 3 === 2 ? ['standing'] : [];
const screensAndStanding = (column: number): Equipment[] => [
  'double_screen',
  ...everyThirdStanding(column),
];

export function officeDesks(): Desk[] {
  const [first, second] = FLOORS;
  const byFloor = [
    [
      ...island(first, 'produit', 80, 100, 4, everyThirdStanding),
      ...island(first, 'calme', 470, 100, 3, everyThirdStanding),
      ...island(first, 'design', 80, 300, 3, screensAndStanding),
    ],
    [
      ...island(second, 'tech', 80, 100, 4, screensAndStanding),
      ...island(second, 'tech', 80, 300, 2, dualScreens),
      ...island(second, 'ventes', 470, 100, 3, everyThirdStanding),
      ...island(second, 'calme', 744, 100, 2, () => []),
    ],
  ];
  return byFloor.flatMap((desks, floorIndex) =>
    desks.map((desk, index) => {
      const code = `${floorIndex + 1}.${String(index + 1).padStart(2, '0')}`;
      return { ...desk, id: `desk-${code.replace('.', '-')}`, code };
    }),
  );
}
