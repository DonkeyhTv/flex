import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Api, ApiError } from '../core/api';
import { bookableDays, isIsoDate, today } from '../core/dates';
import { errorMessage, SLOT_LABELS } from '../core/labels';
import type { Equipment, IsoDate, Office, Reservation, Slot } from '../core/models';
import { Session } from '../core/session';
import { Toasts } from '../core/toasts';
import { deskStates } from './desk-state';

interface BookingState {
  office: Office | null;
  date: IsoDate;
  floorId: string;
  reservations: Reservation[];
  filters: Equipment[];
  selectedDeskId: string | null;
  view: 'plan' | 'list';
  loading: boolean;
  /** A booking or cancellation is on its way: buttons wait. */
  busy: boolean;
  failed: boolean;
}

/** Everything the booking page shows: one day, one floor, one desk in focus. */
export const BookingStore = signalStore(
  withState<BookingState>({
    office: null,
    date: today(),
    floorId: 'f1',
    reservations: [],
    filters: [],
    selectedDeskId: null,
    view: 'plan',
    loading: true,
    busy: false,
    failed: false,
  }),
  withComputed((store, session = inject(Session)) => {
    const meId = computed(() => session.member()?.id ?? null);
    const states = computed(() =>
      deskStates(
        store.office()?.floors.flatMap((floor) => floor.desks) ?? [],
        store.reservations(),
        meId(),
        store.filters(),
      ),
    );
    const myBooking = computed(
      () => store.reservations().find((r) => r.user.id === meId()) ?? null,
    );
    return {
      days: computed(() => bookableDays()),
      floor: computed(
        () => store.office()?.floors.find((floor) => floor.id === store.floorId()) ?? null,
      ),
      states,
      floorStates: computed(() =>
        states().filter((state) => state.desk.floorId === store.floorId()),
      ),
      selected: computed(
        () => states().find((state) => state.desk.id === store.selectedDeskId()) ?? null,
      ),
      myBooking,
      myDesk: computed(
        () => states().find((state) => state.desk.id === myBooking()?.deskId) ?? null,
      ),
      /** Desks with both halves free, per floor. */
      freeByFloor: computed(() => {
        const free: Record<string, number> = {};
        for (const state of states()) {
          free[state.desk.floorId] =
            (free[state.desk.floorId] ?? 0) + (state.status === 'free' ? 1 : 0);
        }
        return free;
      }),
      teammates: computed(() => {
        const team = session.member()?.team;
        return store.reservations().filter((r) => r.user.team === team && r.user.id !== meId());
      }),
    };
  }),
  withMethods((store, api = inject(Api), toasts = inject(Toasts)) => {
    async function loadDay(): Promise<void> {
      const date = store.date();
      try {
        const reservations = await api.reservationsOn(date);
        // A slower answer for a day the visitor already left is dropped.
        if (date === store.date()) {
          patchState(store, { reservations, loading: false, failed: false });
        }
      } catch {
        patchState(store, { loading: false, failed: true });
      }
    }

    async function act(action: () => Promise<string>): Promise<boolean> {
      patchState(store, { busy: true });
      try {
        toasts.success(await action());
        return true;
      } catch (error) {
        toasts.error(errorMessage(ApiError.from(error)));
        return false;
      } finally {
        await loadDay();
        patchState(store, { busy: false });
      }
    }

    return {
      async init(date: unknown, deskId: unknown): Promise<void> {
        const days = bookableDays();
        patchState(store, { date: isIsoDate(date) && days.includes(date) ? date : days[0] });
        try {
          const office = await api.office();
          patchState(store, { office });
          const desk = office.floors.flatMap((floor) => floor.desks).find((d) => d.id === deskId);
          if (desk) {
            patchState(store, { floorId: desk.floorId, selectedDeskId: desk.id });
          }
        } catch {
          patchState(store, { loading: false, failed: true });
          return;
        }
        await loadDay();
        // Open the floor of my desk that day, if I have one and nothing else was asked for.
        const mine = store.myBooking();
        if (mine && !store.selectedDeskId()) {
          patchState(store, { floorId: mine.floorId });
        }
      },

      async selectDate(date: IsoDate): Promise<void> {
        if (date !== store.date()) {
          patchState(store, { date, loading: true });
          await loadDay();
        }
      },

      selectFloor(floorId: string): void {
        patchState(store, { floorId, selectedDeskId: null });
      },

      select(deskId: string | null): void {
        const desk = store.states().find((state) => state.desk.id === deskId)?.desk;
        patchState(
          store,
          desk ? { selectedDeskId: desk.id, floorId: desk.floorId } : { selectedDeskId: null },
        );
      },

      toggleFilter(item: Equipment): void {
        const filters = store.filters();
        patchState(store, {
          filters: filters.includes(item) ? filters.filter((f) => f !== item) : [...filters, item],
        });
      },

      setView(view: 'plan' | 'list'): void {
        patchState(store, { view });
      },

      /** Another tab, or another person, changed bookings on these days. */
      async refresh(dates?: IsoDate[]): Promise<void> {
        if (!dates || dates.includes(store.date())) {
          await loadDay();
        }
      },

      async reloadOffice(): Promise<void> {
        patchState(store, { office: await api.office() });
      },

      book(slot: Slot): Promise<boolean> {
        const state = store.selected();
        return act(async () => {
          const booking = await api.book(state!.desk.id, store.date(), slot);
          return $localize`:@@toast.booked:Bureau ${booking.deskCode}:code: réservé (${SLOT_LABELS[booking.slot].toLowerCase()}:slot:).`;
        });
      },

      /** Moves my booking of the day to the selected desk. */
      moveHere(): Promise<boolean> {
        const mine = store.myBooking();
        const state = store.selected();
        return act(async () => {
          const moved = await api.move(mine!.id, { deskId: state!.desk.id });
          return $localize`:@@toast.moved:Vous êtes maintenant au bureau ${moved.deskCode}:code:.`;
        });
      },

      cancel(reservation: Reservation): Promise<boolean> {
        return act(async () => {
          await api.cancel(reservation.id);
          return $localize`:@@toast.cancelled:Réservation du bureau ${reservation.deskCode}:code: annulée.`;
        });
      },
    };
  }),
);
