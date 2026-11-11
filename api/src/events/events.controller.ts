import { Controller, Header, type MessageEvent, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { interval, map, merge, type Observable } from 'rxjs';
import { EventsService } from './events.service.js';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Server-sent events for the signed-in plan: a booking somewhere else shows
   * up without reloading. The comment every 25 seconds keeps proxies from
   * closing an idle connection.
   */
  @Sse()
  // Tells nginx not to buffer the stream.
  @Header('X-Accel-Buffering', 'no')
  stream(): Observable<MessageEvent> {
    return merge(
      this.eventsService.events$.pipe(
        map((event) => ({ type: event.type, data: event })),
      ),
      interval(25_000).pipe(map(() => ({ comment: 'keep-alive' }))),
    );
  }
}
