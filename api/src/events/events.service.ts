import { Injectable } from '@nestjs/common';
import { Subject, type Observable } from 'rxjs';

/** What changed in the office: open plans refetch what they show. */
export type OfficeEvent =
  { type: 'reservations'; dates: string[] } | { type: 'desks' };

@Injectable()
export class EventsService {
  private readonly events = new Subject<OfficeEvent>();

  get events$(): Observable<OfficeEvent> {
    return this.events.asObservable();
  }

  reservationsChanged(...dates: string[]): void {
    this.events.next({ type: 'reservations', dates: [...new Set(dates)] });
  }

  desksChanged(): void {
    this.events.next({ type: 'desks' });
  }
}
