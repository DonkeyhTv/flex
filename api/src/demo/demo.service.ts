import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Cron } from '@nestjs/schedule';
import { count, gte } from 'drizzle-orm';
import { bookableDays, today } from '../calendar/calendar.js';
import type { Database } from '../database/database.js';
import { desks, reservations, users } from '../database/schema.js';
import { EventsService } from '../events/events.service.js';
import { officeDesks } from '../office/layout.js';
import { agendaFor } from './agenda.js';
import { DEMO_PASSWORD, PEOPLE } from './people.js';

/**
 * Fills the office with the staff of Lumen and their bookings, and puts the
 * demo back as new every night, whatever visitors did during the day.
 */
@Injectable()
export class DemoService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly passwordHasher: PasswordHasher,
    private readonly events: EventsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.DEMO_SEED === 'false') {
      return;
    }
    const [{ people }] = await this.db.select({ people: count() }).from(users);
    if (people === 0) {
      await this.seedOffice();
    }
    const [{ upcoming }] = await this.db
      .select({ upcoming: count() })
      .from(reservations)
      .where(gte(reservations.date, today()));
    if (upcoming === 0) {
      await this.reset();
    }
  }

  async seedOffice(): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(DEMO_PASSWORD);
    await this.db.insert(users).values(
      PEOPLE.map((person) => ({
        ...person,
        passwordHash: person.demo ? passwordHash : null,
      })),
    );
    await this.db.insert(desks).values(officeDesks());
    this.logger.log(`Seeded ${PEOPLE.length} people and the office`);
  }

  /** Every bookable day gets its agenda back; desks return to service. */
  @Cron('0 3 * * *', { timeZone: 'Europe/Brussels' })
  async reset(): Promise<void> {
    const days = bookableDays();
    const [people, office] = await Promise.all([
      this.db
        .select({ id: users.id, team: users.team, demo: users.demo })
        .from(users),
      this.db
        .update(desks)
        .set({ active: true, disabledReason: null })
        .returning(),
    ]);
    const colleagues = people.filter((person) => !person.demo);
    const bookings = days.flatMap((date) =>
      agendaFor(date, colleagues, office),
    );

    // The demo member has two days already booked, so "My bookings" isn't empty.
    const demoMember = people.find(
      (person) => person.demo && person.team === 'design',
    );
    if (demoMember) {
      for (const date of [days[1], days[3]].filter(Boolean)) {
        const takenThatDay = new Set(
          bookings.filter((b) => b.date === date).map((b) => b.deskId),
        );
        const desk = office.find(
          (d) => d.zone === 'design' && !takenThatDay.has(d.id),
        );
        if (desk) {
          bookings.push({
            userId: demoMember.id,
            deskId: desk.id,
            date,
            am: true,
            pm: true,
          });
        }
      }
    }

    await this.db.transaction(async (tx) => {
      await tx.delete(reservations);
      await tx.insert(reservations).values(bookings);
    });
    this.logger.log(
      `Demo reset: ${bookings.length} bookings over ${days.length} days`,
    );
    this.events.desksChanged();
    this.events.reservationsChanged(...days);
  }
}
