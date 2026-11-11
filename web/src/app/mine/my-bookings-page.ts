import { ChangeDetectionStrategy, Component, inject, LOCALE_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, ApiError } from '../core/api';
import { formatDay } from '../core/dates';
import { errorMessage, SLOT_LABELS } from '../core/labels';
import type { Reservation } from '../core/models';
import { OfficeEvents } from '../core/office-events';
import { Toasts } from '../core/toasts';

@Component({
  selector: 'app-my-bookings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './my-bookings-page.html',
  styleUrl: './my-bookings-page.scss',
})
export class MyBookingsPage {
  private readonly api = inject(Api);
  private readonly toasts = inject(Toasts);
  private readonly locale = inject(LOCALE_ID);

  protected readonly bookings = signal<Reservation[] | null>(null);
  protected readonly failed = signal(false);
  /** The booking whose cancellation waits for a second click. */
  protected readonly confirming = signal<string | null>(null);
  protected readonly slotLabels = SLOT_LABELS;

  constructor() {
    void this.load();
    inject(OfficeEvents).listen((event) => event.type === 'reservations' && void this.load());
  }

  protected day(date: string): string {
    return formatDay(date, this.locale, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  protected level(reservation: Reservation): string {
    return reservation.floorId.replace('f', '');
  }

  protected async cancel(reservation: Reservation): Promise<void> {
    if (this.confirming() !== reservation.id) {
      this.confirming.set(reservation.id);
      return;
    }
    this.confirming.set(null);
    try {
      await this.api.cancel(reservation.id);
      this.toasts.success(
        $localize`:@@toast.cancelled:Réservation du bureau ${reservation.deskCode}:code: annulée.`,
      );
    } catch (error) {
      this.toasts.error(errorMessage(ApiError.from(error)));
    }
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.bookings.set(await this.api.myReservations());
      this.failed.set(false);
    } catch {
      this.failed.set(true);
    }
  }
}
