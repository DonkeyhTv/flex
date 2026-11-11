import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EQUIPMENT_LABELS, FLOOR_LABELS, ZONE_LABELS } from '../core/labels';
import type { Equipment } from '../core/models';
import { OfficeEvents } from '../core/office-events';
import { BookingStore } from './booking.store';
import { DateStrip } from './date-strip';
import { deskAvailability } from './desk-label';
import { DeskPanel } from './desk-panel';
import { FloorPlan } from './floor-plan';

@Component({
  selector: 'app-booking-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DateStrip, FloorPlan, DeskPanel],
  providers: [BookingStore],
  templateUrl: './booking-page.html',
  styleUrl: './booking-page.scss',
})
export class BookingPage {
  protected readonly store = inject(BookingStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly announcer = inject(LiveAnnouncer);

  protected readonly equipment: Equipment[] = ['double_screen', 'standing', 'window'];
  protected readonly equipmentLabels = EQUIPMENT_LABELS;
  protected readonly floorLabels = FLOOR_LABELS;
  protected readonly zoneLabels = ZONE_LABELS;
  protected readonly availability = deskAvailability;

  constructor() {
    const query = this.route.snapshot.queryParamMap;
    void this.store.init(query.get('date'), query.get('desk'));

    // The address follows the day and the desk, so a link to it opens the same
    // view. Only the address bar changes: a navigation here would cancel the
    // one that is opening this page.
    effect(() => {
      const queryParams = { date: this.store.date(), desk: this.store.selectedDeskId() };
      untracked(() =>
        this.location.replaceState(
          this.router.serializeUrl(
            this.router.createUrlTree([], { relativeTo: this.route, queryParams }),
          ),
        ),
      );
    });

    // Someone else books or cancels: the plan changes under your eyes.
    inject(OfficeEvents).listen((event) => {
      if (event.type === 'desks') {
        void this.store.reloadOffice();
      }
      void this.store.refresh(event.type === 'reservations' ? event.dates : undefined);
    });
  }

  protected pick(deskId: string): void {
    this.store.select(deskId);
    const selected = this.store.selected();
    if (selected) {
      void this.announcer.announce(
        $localize`:@@plan.selected:Bureau ${selected.desk.code}:code: sélectionné, ${deskAvailability(selected)}:availability:.`,
      );
    }
  }
}
