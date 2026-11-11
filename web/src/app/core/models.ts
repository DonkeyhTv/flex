/** The shapes the Flex API returns. */

export type Team = 'design' | 'produit' | 'tech' | 'ventes' | 'ops';
export type Zone = Exclude<Team, 'ops'> | 'calme';
export type Role = 'member' | 'admin';
export type Equipment = 'double_screen' | 'standing' | 'window';
export type Slot = 'day' | 'am' | 'pm';
export type RoomKind = 'meeting' | 'kitchen' | 'stairs' | 'phone' | 'lounge';
/** `YYYY-MM-DD`, a day in Brussels. */
export type IsoDate = string;

export interface Member {
  id: string;
  email: string;
  name: string;
  team: Team;
  role: Role;
}

export interface Desk {
  id: string;
  code: string;
  floorId: string;
  zone: Zone;
  x: number;
  y: number;
  facing: 'north' | 'south';
  equipment: Equipment[];
  active: boolean;
  disabledReason: string | null;
}

export interface Room {
  id: string;
  kind: RoomKind;
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
  desks: Desk[];
}

export interface Office {
  width: number;
  height: number;
  desk: { width: number; height: number };
  floors: Floor[];
}

export interface Reservation {
  id: string;
  deskId: string;
  deskCode: string;
  floorId: string;
  date: IsoDate;
  slot: Slot;
  user: { id: string; name: string; team: Team };
}

export interface TeamWeek {
  team: Team;
  teams: Team[];
  days: IsoDate[];
  members: { id: string; name: string; isMe: boolean; bookings: Reservation[] }[];
}

export interface Stats {
  from: IsoDate;
  to: IsoDate;
  rate: number;
  outOfService: number;
  days: { date: IsoDate; capacity: number; am: number; pm: number; rate: number }[];
  zones: { zone: Zone; desks: number; rate: number }[];
  teams: { team: Team; perDay: number }[];
  popular: { code: string; zone: Zone; halfDays: number }[];
}

export interface DemoAccounts {
  password: string;
  accounts: Member[];
}

/** The `code` of a refusal from the API, when it has one. */
export type ErrorCode =
  | 'invalid_credentials'
  | 'invalid_date'
  | 'past_date'
  | 'beyond_window'
  | 'weekend'
  | 'desk_not_found'
  | 'desk_inactive'
  | 'desk_taken'
  | 'already_booked'
  | 'reservation_not_found'
  | 'admin_only';
