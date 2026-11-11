import {
  ConflictException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { DateRefusal } from '../calendar/calendar.js';

/**
 * Every refusal carries a stable `code`: the web app shows its own message,
 * in the visitor's language, for each one.
 */
export type ReservationErrorCode =
  | DateRefusal
  | 'desk_not_found'
  | 'desk_inactive'
  | 'desk_taken'
  | 'already_booked'
  | 'reservation_not_found';

const messages: Record<ReservationErrorCode, string> = {
  invalid_date: 'The date is not a valid YYYY-MM-DD date',
  past_date: 'The date has passed',
  beyond_window: 'Desks can be booked two weeks ahead at most',
  weekend: 'The office is closed at weekends',
  desk_not_found: 'No such desk',
  desk_inactive: 'This desk is out of service',
  desk_taken: 'Someone has already booked this desk for that time',
  already_booked: 'You already have a desk for that time',
  reservation_not_found: 'No such reservation',
};

export function reservationError(code: ReservationErrorCode): HttpException {
  const body = { code, message: messages[code] };
  switch (code) {
    case 'desk_not_found':
    case 'reservation_not_found':
      return new NotFoundException(body);
    case 'desk_inactive':
    case 'desk_taken':
    case 'already_booked':
      return new ConflictException(body);
    default:
      return new UnprocessableEntityException(body);
  }
}
