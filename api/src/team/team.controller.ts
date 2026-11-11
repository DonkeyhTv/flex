import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { UsersRepository, type Member } from '../auth/users.repository.js';
import { addDays, ISO_DATE, mondayOf, today } from '../calendar/calendar.js';
import { TEAMS } from '../database/schema.js';
import { ReservationsService } from '../reservations/reservations.service.js';

const weekQuery = z.object({
  team: z.enum(TEAMS).optional(),
  week: z.string().regex(ISO_DATE).optional(),
});

@ApiTags('team')
@Controller('team')
export class TeamController {
  constructor(
    private readonly users: UsersRepository,
    private readonly reservations: ReservationsService,
  ) {}

  /** Who of a team is at the office on each day of a week: your own team by default. */
  @Get()
  async week(
    @CurrentUser() member: Member,
    @Query({ schema: weekQuery }) query: z.infer<typeof weekQuery>,
  ) {
    const team = query.team ?? member.team;
    const monday = mondayOf(query.week ?? today());
    const days = [0, 1, 2, 3, 4].map((offset) => addDays(monday, offset));
    const members = await this.users.team(team);
    const bookings = await this.reservations.between(
      members.map(({ id }) => id),
      days[0],
      days[4],
    );
    return {
      team,
      teams: TEAMS,
      days,
      members: members.map(({ id, name }) => ({
        id,
        name,
        isMe: id === member.id,
        bookings: bookings.filter((booking) => booking.user.id === id),
      })),
    };
  }
}
