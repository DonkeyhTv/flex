import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationModule, Public } from '@nestjs/authentication';
import { DrizzleModule } from '@nestjs/drizzle';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { drizzle } from 'drizzle-orm/node-postgres';
import './auth/auth-types.js';
import { AdminGuard } from './auth/admin.guard.js';
import { AuthController } from './auth/auth.controller.js';
import { DrizzleSessionStore } from './auth/drizzle-session.store.js';
import { SessionAuth } from './auth/session-auth.provider.js';
import { UsersRepository } from './auth/users.repository.js';
import { DemoService } from './demo/demo.service.js';
import { EventsController } from './events/events.controller.js';
import { EventsService } from './events/events.service.js';
import { OfficeController } from './office/office.controller.js';
import { OfficeService } from './office/office.service.js';
import { ReservationsController } from './reservations/reservations.controller.js';
import { ReservationsService } from './reservations/reservations.service.js';
import { StatsController } from './stats/stats.controller.js';
import { StatsService } from './stats/stats.service.js';
import { TeamController } from './team/team.controller.js';

@Controller('health')
class HealthController {
  @Public()
  @Get()
  health() {
    return { status: 'ok' };
  }
}

/** Origins other than the API's own whose pages may write with the session cookie. */
export const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? '')
  .split(',')
  .filter(Boolean);

@Module({
  imports: [
    DrizzleModule.forRootAsync({
      useFactory: () => ({ drizzle, connection: process.env.DATABASE_URL! }),
    }),
    AuthenticationModule.forRootAsync({
      useFactory: () => ({
        session: {
          absoluteTtl: '7d',
          idleTtl: '1d',
          trustedOrigins,
          // Plain http on a LAN or in CI: no Secure cookie, so it's named `sid`.
          cookie: { secure: process.env.COOKIE_SECURE !== 'false' },
        },
        // A low cost in tests only: scrypt is slow on purpose.
        password: { logN: Number(process.env.SCRYPT_LOG_N ?? 17) },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    HealthController,
    AuthController,
    OfficeController,
    ReservationsController,
    TeamController,
    StatsController,
    EventsController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    UsersRepository,
    DrizzleSessionStore,
    SessionAuth,
    AdminGuard,
    EventsService,
    ReservationsService,
    OfficeService,
    StatsService,
    DemoService,
  ],
})
export class AppModule {}
