import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, gte, lte } from 'drizzle-orm';
import { bookableDays, type IsoDate } from '../calendar/calendar.js';
import type { Database } from '../database/database.js';
import { desks, reservations, users } from '../database/schema.js';

export interface DayOccupancy {
  date: IsoDate;
  capacity: number;
  am: number;
  pm: number;
  /** Booked half-days over available half-days, from 0 to 1. */
  rate: number;
}

const rate = (booked: number, capacity: number) =>
  capacity === 0 ? 0 : Math.round((booked / capacity) * 1000) / 1000;

/** Occupancy over the booking window, for the office manager. */
@Injectable()
export class StatsService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async overview() {
    const days = bookableDays();
    const [allDesks, booked] = await Promise.all([
      this.db
        .select({
          id: desks.id,
          code: desks.code,
          zone: desks.zone,
          active: desks.active,
        })
        .from(desks),
      this.db
        .select({
          deskId: reservations.deskId,
          date: reservations.date,
          am: reservations.am,
          pm: reservations.pm,
          team: users.team,
        })
        .from(reservations)
        .innerJoin(users, eq(users.id, reservations.userId))
        .where(
          and(
            gte(reservations.date, days[0]),
            lte(reservations.date, days.at(-1)!),
          ),
        ),
    ]);
    const active = allDesks.filter((desk) => desk.active);
    const halves = (rows: typeof booked) =>
      rows.reduce((sum, row) => sum + Number(row.am) + Number(row.pm), 0);

    const byDay: DayOccupancy[] = days.map((date) => {
      const rows = booked.filter((row) => row.date === date);
      const am = rows.filter((row) => row.am).length;
      const pm = rows.filter((row) => row.pm).length;
      return {
        date,
        capacity: active.length,
        am,
        pm,
        rate: rate(am + pm, active.length * 2),
      };
    });

    const zones = [...new Set(allDesks.map((desk) => desk.zone))].map(
      (zone) => {
        const ids = new Set(
          active.filter((desk) => desk.zone === zone).map((desk) => desk.id),
        );
        const rows = booked.filter((row) => ids.has(row.deskId));
        return {
          zone,
          desks: ids.size,
          rate: rate(halves(rows), ids.size * days.length * 2),
        };
      },
    );

    const teams = [...new Set(booked.map((row) => row.team))]
      .sort()
      .map((team) => ({
        team,
        // Average number of people of the team at the office per day.
        perDay:
          Math.round(
            (booked.filter((row) => row.team === team).length / days.length) *
              10,
          ) / 10,
      }));

    const popular = allDesks
      .map((desk) => ({
        code: desk.code,
        zone: desk.zone,
        halfDays: halves(booked.filter((row) => row.deskId === desk.id)),
      }))
      .sort((a, b) => b.halfDays - a.halfDays || a.code.localeCompare(b.code))
      .slice(0, 5);

    return {
      from: days[0],
      to: days.at(-1),
      rate: rate(halves(booked), active.length * days.length * 2),
      outOfService: allDesks.length - active.length,
      days: byDay,
      zones,
      teams,
      popular,
    };
  }
}
