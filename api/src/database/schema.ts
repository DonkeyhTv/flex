import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const at = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' });

export const TEAMS = ['design', 'produit', 'tech', 'ventes', 'ops'] as const;
export type Team = (typeof TEAMS)[number];

export const ROLES = ['member', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const EQUIPMENT = ['double_screen', 'standing', 'window'] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  team: text('team', { enum: TEAMS }).notNull(),
  role: text('role', { enum: ROLES }).notNull().default('member'),
  passwordHash: text('password_hash'),
  /** Demo accounts are listed on the sign-in page. */
  demo: boolean('demo').notNull().default(false),
});

export const desks = pgTable(
  'desks',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    floorId: text('floor_id').notNull(),
    zone: text('zone').notNull(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    /** Which side the chair is on: the desk faces the other way. */
    facing: text('facing', { enum: ['north', 'south'] }).notNull(),
    equipment: text('equipment')
      .$type<Equipment>()
      .array()
      .notNull()
      .default(sql`'{}'`),
    active: boolean('active').notNull().default(true),
    disabledReason: text('disabled_reason'),
  },
  (table) => [index('desks_floor_id_idx').on(table.floorId)],
);

/**
 * One row per booking. A whole day sets both halves. The partial unique
 * indexes make the database itself refuse a desk booked twice for the same
 * half-day, or a person in two places at once, whatever the requests race.
 */
export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deskId: text('desk_id')
      .notNull()
      .references(() => desks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    am: boolean('am').notNull(),
    pm: boolean('pm').notNull(),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('reservations_desk_am_uq')
      .on(table.deskId, table.date)
      .where(sql`${table.am}`),
    uniqueIndex('reservations_desk_pm_uq')
      .on(table.deskId, table.date)
      .where(sql`${table.pm}`),
    uniqueIndex('reservations_user_am_uq')
      .on(table.userId, table.date)
      .where(sql`${table.am}`),
    uniqueIndex('reservations_user_pm_uq')
      .on(table.userId, table.date)
      .where(sql`${table.pm}`),
    index('reservations_date_idx').on(table.date),
    check('reservations_half_day_check', sql`${table.am} or ${table.pm}`),
  ],
);

// Authentication state, kept by DrizzleSessionStore for @nestjs/authentication.
// Session ids are SHA-256 hashes of the cookie tokens.
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    createdAt: at('created_at').notNull(),
    expiresAt: at('expires_at').notNull(),
    lastActiveAt: at('last_active_at').notNull(),
    mfa: text('mfa', { enum: ['pending', 'verified'] }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Desk = typeof desks.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
