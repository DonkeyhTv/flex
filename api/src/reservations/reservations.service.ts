import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import type { Member } from '../auth/users.repository.js';
import {
  halves,
  refuseDate,
  slotOf,
  today,
  type IsoDate,
  type Slot,
} from '../calendar/calendar.js';
import { uniqueViolation, type Database } from '../database/database.js';
import {
  desks,
  reservations,
  users,
  type Reservation,
} from '../database/schema.js';
import { EventsService } from '../events/events.service.js';
import { reservationError } from './reservation.errors.js';

export interface ReservationView {
  id: string;
  deskId: string;
  deskCode: string;
  floorId: string;
  date: IsoDate;
  slot: Slot;
  user: { id: string; name: string; team: Member['team'] };
}

export interface BookingRequest {
  deskId: string;
  date: IsoDate;
  slot: Slot;
}

export interface MoveRequest {
  date?: IsoDate;
  deskId?: string;
  slot?: Slot;
}

const viewColumns = {
  id: reservations.id,
  deskId: reservations.deskId,
  deskCode: desks.code,
  floorId: desks.floorId,
  date: reservations.date,
  am: reservations.am,
  pm: reservations.pm,
  userId: users.id,
  userName: users.name,
  userTeam: users.team,
};

type ViewRow = {
  [K in keyof typeof viewColumns]: (typeof viewColumns)[K]['_']['data'];
};

const toView = ({
  am,
  pm,
  userId,
  userName,
  userTeam,
  ...row
}: ViewRow): ReservationView => ({
  ...row,
  slot: slotOf({ am, pm }),
  user: { id: userId, name: userName, team: userTeam },
});

@Injectable()
export class ReservationsService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  /** Everyone's bookings on a day: the plan shows who sits where. */
  async onDate(date: IsoDate): Promise<ReservationView[]> {
    if (refuseDate(date, date) === 'invalid_date') {
      throw reservationError('invalid_date');
    }
    return this.select()
      .where(eq(reservations.date, date))
      .orderBy(asc(desks.code))
      .then((rows) => rows.map(toView));
  }

  async upcoming(member: Member): Promise<ReservationView[]> {
    const rows = await this.select()
      .where(
        and(
          eq(reservations.userId, member.id),
          gte(reservations.date, today()),
        ),
      )
      .orderBy(asc(reservations.date));
    return rows.map(toView);
  }

  async between(
    userIds: string[],
    from: IsoDate,
    to: IsoDate,
  ): Promise<ReservationView[]> {
    if (userIds.length === 0) {
      return [];
    }
    const rows = await this.select().where(
      and(
        inArray(reservations.userId, userIds),
        gte(reservations.date, from),
        lte(reservations.date, to),
      ),
    );
    return rows.map(toView);
  }

  async book(
    member: Member,
    request: BookingRequest,
  ): Promise<ReservationView> {
    this.assertBookable(request.date);
    await this.assertDeskInService(request.deskId);
    const [created] = await this.write(() =>
      this.db
        .insert(reservations)
        .values({
          deskId: request.deskId,
          userId: member.id,
          date: request.date,
          ...halves(request.slot),
        })
        .returning({ id: reservations.id }),
    );
    this.events.reservationsChanged(request.date);
    return this.find(created.id);
  }

  /** Moves a booking to another day, desk or half-day: the drag and drop of the team planning. */
  async move(
    member: Member,
    id: string,
    request: MoveRequest,
  ): Promise<ReservationView> {
    const current = await this.ownReservation(member, id);
    const date = request.date ?? current.date;
    const deskId = request.deskId ?? current.deskId;
    this.assertBookable(date);
    if (deskId !== current.deskId) {
      await this.assertDeskInService(deskId);
    }
    await this.write(() =>
      this.db
        .update(reservations)
        .set({ date, deskId, ...halves(request.slot ?? slotOf(current)) })
        .where(eq(reservations.id, id)),
    );
    this.events.reservationsChanged(current.date, date);
    return this.find(id);
  }

  async cancel(member: Member, id: string): Promise<void> {
    const current = await this.ownReservation(member, id);
    await this.db.delete(reservations).where(eq(reservations.id, id));
    this.events.reservationsChanged(current.date);
  }

  private select() {
    return this.db
      .select(viewColumns)
      .from(reservations)
      .innerJoin(desks, eq(desks.id, reservations.deskId))
      .innerJoin(users, eq(users.id, reservations.userId))
      .$dynamic();
  }

  private async find(id: string): Promise<ReservationView> {
    const [row] = await this.select().where(eq(reservations.id, id));
    return toView(row);
  }

  /** A member's own booking; an office manager may change anyone's. */
  private async ownReservation(
    member: Member,
    id: string,
  ): Promise<Reservation> {
    const [reservation] = await this.db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id));
    if (
      !reservation ||
      (reservation.userId !== member.id && member.role !== 'admin')
    ) {
      // Someone else's booking is "not found", not "forbidden": its id says nothing.
      throw reservationError('reservation_not_found');
    }
    return reservation;
  }

  private assertBookable(date: IsoDate): void {
    const refusal = refuseDate(date);
    if (refusal) {
      throw reservationError(refusal);
    }
  }

  private async assertDeskInService(deskId: string): Promise<void> {
    const [desk] = await this.db
      .select({ active: desks.active })
      .from(desks)
      .where(eq(desks.id, deskId));
    if (!desk) {
      throw reservationError('desk_not_found');
    }
    if (!desk.active) {
      throw reservationError('desk_inactive');
    }
  }

  /** The unique indexes decide conflicts, so two people clicking at once can't both win. */
  private async write<T>(query: () => Promise<T>): Promise<T> {
    try {
      return await query();
    } catch (error) {
      const constraint = uniqueViolation(error);
      if (constraint?.startsWith('reservations_desk_')) {
        throw reservationError('desk_taken');
      }
      if (constraint?.startsWith('reservations_user_')) {
        throw reservationError('already_booked');
      }
      throw error;
    }
  }
}
