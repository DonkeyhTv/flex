import { DestroyRef, inject, Injectable } from '@angular/core';
import { Observable, share } from 'rxjs';
import type { IsoDate } from './models';

export type OfficeEvent = { type: 'reservations'; dates: IsoDate[] } | { type: 'desks' };

/**
 * The API's server-sent events, shared by every page that listens: one
 * connection per tab, opened with the first subscriber and closed with the
 * last. EventSource reconnects by itself after a network loss.
 */
@Injectable({ providedIn: 'root' })
export class OfficeEvents {
  readonly events$ = new Observable<OfficeEvent>((subscriber) => {
    if (typeof EventSource === 'undefined') {
      return undefined;
    }
    const source = new EventSource('/api/events');
    const forward = (message: MessageEvent<string>) =>
      subscriber.next(JSON.parse(message.data) as OfficeEvent);
    source.addEventListener('reservations', forward);
    source.addEventListener('desks', forward);
    return () => source.close();
  }).pipe(share());

  /** Calls `handler` for each event until the caller is destroyed. */
  listen(handler: (event: OfficeEvent) => void): void {
    const subscription = this.events$.subscribe(handler);
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }
}
