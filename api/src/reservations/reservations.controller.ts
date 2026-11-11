import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { Member } from '../auth/users.repository.js';
import { ISO_DATE } from '../calendar/calendar.js';
import {
  ReservationsService,
  type ReservationView,
} from './reservations.service.js';

const isoDate = z.string().regex(ISO_DATE, 'Expected a YYYY-MM-DD date');
const slot = z.enum(['day', 'am', 'pm']);

const bookingSchema = z.strictObject({
  deskId: z.string().min(1).max(64),
  date: isoDate,
  slot: slot.default('day'),
});

const moveSchema = z
  .strictObject({
    deskId: z.string().min(1).max(64).optional(),
    date: isoDate.optional(),
    slot: slot.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nothing to change');

const id = z.uuid();

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  /** Every booking on a day, for the floor plan. */
  @Get()
  onDate(
    @Query('date', { schema: isoDate }) date: string,
  ): Promise<ReservationView[]> {
    return this.reservations.onDate(date);
  }

  @Get('mine')
  mine(@CurrentUser() member: Member): Promise<ReservationView[]> {
    return this.reservations.upcoming(member);
  }

  @Post()
  book(
    @CurrentUser() member: Member,
    @Body({ schema: bookingSchema }) body: z.infer<typeof bookingSchema>,
  ) {
    return this.reservations.book(member, body);
  }

  @Patch(':id')
  move(
    @CurrentUser() member: Member,
    @Param('id', { schema: id }) reservationId: string,
    @Body({ schema: moveSchema }) body: z.infer<typeof moveSchema>,
  ) {
    return this.reservations.move(member, reservationId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  cancel(
    @CurrentUser() member: Member,
    @Param('id', { schema: id }) reservationId: string,
  ): Promise<void> {
    return this.reservations.cancel(member, reservationId);
  }
}
