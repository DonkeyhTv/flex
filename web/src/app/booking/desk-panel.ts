import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  LOCALE_ID,
  signal,
} from '@angular/core';
import { formatDay } from '../core/dates';
import { EQUIPMENT_LABELS, FLOOR_LABELS, SLOT_LABELS, ZONE_LABELS } from '../core/labels';
import type { Slot } from '../core/models';
import { BookingStore } from './booking.store';
import { freeSlots } from './desk-state';

/** Beside the plan: the day at a glance, or the desk in focus and how to book it. */
@Component({
  selector: 'app-desk-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './desk-panel.html',
  styleUrl: './desk-panel.scss',
})
export class DeskPanel {
  protected readonly store = inject(BookingStore);
  private readonly locale = inject(LOCALE_ID);

  protected readonly zoneLabels = ZONE_LABELS;
  protected readonly equipmentLabels = EQUIPMENT_LABELS;
  protected readonly slotLabels = SLOT_LABELS;
  protected readonly floorLabels = FLOOR_LABELS;

  protected readonly dayTitle = computed(() =>
    formatDay(this.store.date(), this.locale, { weekday: 'long', day: 'numeric', month: 'long' }),
  );

  protected readonly floorLevel = computed(() => {
    const floorId = this.store.selected()?.desk.floorId ?? this.store.myBooking()?.floorId;
    return this.store.office()?.floors.find((floor) => floor.id === floorId)?.level ?? 1;
  });

  protected readonly slots = computed(() => {
    const selected = this.store.selected();
    return selected ? freeSlots(selected) : [];
  });

  /** My booking elsewhere that day fits in the free halves of this desk. */
  protected readonly canMoveHere = computed(() => {
    const mine = this.store.myBooking();
    const selected = this.store.selected();
    return !!mine && !!selected && selected.status !== 'mine' && this.slots().includes(mine.slot);
  });

  protected readonly slot = signal<Slot>('day');

  constructor() {
    // A newly selected desk proposes its first free slot.
    effect(() => {
      const first = this.slots()[0];
      if (first) {
        this.slot.set(first);
      }
    });
  }

  protected async book(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    await this.store.book(this.slot());
  }
}
