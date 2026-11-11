import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, eq, gte } from 'drizzle-orm';
import { today } from '../calendar/calendar.js';
import type { Database } from '../database/database.js';
import { desks, reservations, type Desk } from '../database/schema.js';
import { EventsService } from '../events/events.service.js';
import { reservationError } from '../reservations/reservation.errors.js';
import {
  DESK_HEIGHT,
  DESK_WIDTH,
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  FLOORS,
} from './layout.js';

export interface DeskChange {
  active: boolean;
  disabledReason?: string | null;
}

@Injectable()
export class OfficeService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  /** The floors with their rooms and desks: everything the plan draws. */
  async plan() {
    const all = await this.db.select().from(desks).orderBy(asc(desks.code));
    return {
      width: FLOOR_WIDTH,
      height: FLOOR_HEIGHT,
      desk: { width: DESK_WIDTH, height: DESK_HEIGHT },
      floors: FLOORS.map((floor) => ({
        ...floor,
        desks: all.filter((desk) => desk.floorId === floor.id),
      })),
    };
  }

  /**
   * Takes a desk out of service, or puts it back. Taking it out cancels its
   * upcoming bookings in the same transaction, and says how many.
   */
  async update(
    id: string,
    change: DeskChange,
  ): Promise<{ desk: Desk; cancelled: number }> {
    const result = await this.db.transaction(async (tx) => {
      const [desk] = await tx
        .update(desks)
        .set({
          active: change.active,
          disabledReason: change.active
            ? null
            : (change.disabledReason ?? null),
        })
        .where(eq(desks.id, id))
        .returning();
      if (!desk) {
        throw reservationError('desk_not_found');
      }
      const cancelled = change.active
        ? []
        : await tx
            .delete(reservations)
            .where(
              and(eq(reservations.deskId, id), gte(reservations.date, today())),
            )
            .returning({ date: reservations.date });
      return { desk, cancelledDates: cancelled.map(({ date }) => date) };
    });
    this.events.desksChanged();
    if (result.cancelledDates.length > 0) {
      this.events.reservationsChanged(...result.cancelledDates);
    }
    return { desk: result.desk, cancelled: result.cancelledDates.length };
  }
}
