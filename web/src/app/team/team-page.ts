import {
  CdkDrag,
  CdkDragPlaceholder,
  type CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  LOCALE_ID,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, ApiError } from '../core/api';
import { addDays, bookableDays, formatDay, mondayOf, today } from '../core/dates';
import { errorMessage, SLOT_LABELS, TEAM_LABELS } from '../core/labels';
import type { IsoDate, Reservation, Team, TeamWeek } from '../core/models';
import { OfficeEvents } from '../core/office-events';
import { Session } from '../core/session';
import { Toasts } from '../core/toasts';

@Component({
  selector: 'app-team-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
  ],
  templateUrl: './team-page.html',
  styleUrl: './team-page.scss',
})
export class TeamPage {
  private readonly api = inject(Api);
  private readonly toasts = inject(Toasts);
  private readonly locale = inject(LOCALE_ID);
  private readonly session = inject(Session);

  protected readonly week = signal<IsoDate>(mondayOf(today()));
  protected readonly team = signal<Team>(this.session.member()?.team ?? 'design');
  protected readonly data = signal<TeamWeek | null>(null);
  protected readonly moving = signal(false);

  protected readonly teamLabels = TEAM_LABELS;
  protected readonly slotLabels = SLOT_LABELS;
  private readonly bookable = computed(() => new Set(bookableDays()));

  protected readonly title = computed(
    () =>
      $localize`:@@team.week:Semaine du ${formatDay(this.week(), this.locale, { day: 'numeric', month: 'long' })}:date:`,
  );
  protected readonly isThisWeek = computed(() => this.week() === mondayOf(today()));
  protected readonly canGoForward = computed(
    () => addDays(this.week(), 7) <= bookableDays().at(-1)!,
  );
  protected readonly isMyTeam = computed(() => this.team() === this.session.member()?.team);

  protected readonly days = computed(() =>
    (this.data()?.days ?? []).map((date) => ({
      date,
      weekday: formatDay(date, this.locale, { weekday: 'long' }),
      short: formatDay(date, this.locale, { weekday: 'short', day: 'numeric' }),
      bookable: this.bookable().has(date),
      present: this.data()!.members.filter((member) => member.bookings.some((b) => b.date === date))
        .length,
    })),
  );

  /** My row first, then the others by name. */
  protected readonly members = computed(() => {
    const members = this.data()?.members ?? [];
    return [...members.filter((m) => m.isMe), ...members.filter((m) => !m.isMe)];
  });

  constructor() {
    void this.load();
    inject(OfficeEvents).listen((event) => {
      if (
        event.type === 'reservations' &&
        event.dates.some((date) => date >= this.week() && date < addDays(this.week(), 7))
      ) {
        void this.load();
      }
    });
  }

  protected moveLabel(weekday: string): string {
    return $localize`:@@team.moveLabel:Déplacer la réservation du ${weekday}:day:`;
  }

  protected bookLabel(weekday: string): string {
    return $localize`:@@team.bookDay:Réserver un bureau le ${weekday}:day:`;
  }

  protected bookingOn(bookings: Reservation[], date: IsoDate): Reservation | undefined {
    return bookings.find((booking) => booking.date === date);
  }

  /** The days my booking can move to: bookable, and free of another booking of mine. */
  protected targetsFor(booking: Reservation, bookings: Reservation[]) {
    return this.days().filter(
      (day) => day.bookable && day.date !== booking.date && !this.bookingOn(bookings, day.date),
    );
  }

  /** Drops only onto a bookable day where I have nothing yet. */
  protected readonly canDrop = (
    drag: CdkDrag<Reservation>,
    drop: CdkDropList<IsoDate>,
  ): boolean => {
    const mine = this.members().find((member) => member.isMe)?.bookings ?? [];
    return (
      this.bookable().has(drop.data) &&
      !this.bookingOn(mine, drop.data) &&
      drag.data.date !== drop.data
    );
  };

  protected async dropped(event: CdkDragDrop<IsoDate, IsoDate, Reservation>): Promise<void> {
    if (event.container !== event.previousContainer) {
      await this.move(event.item.data, event.container.data);
    }
  }

  protected async move(booking: Reservation, date: IsoDate): Promise<void> {
    this.moving.set(true);
    try {
      const moved = await this.api.move(booking.id, { date });
      this.toasts.success(
        $localize`:@@toast.movedDay:Réservation déplacée au ${formatDay(moved.date, this.locale, { weekday: 'long', day: 'numeric' })}:date:, bureau ${moved.deskCode}:code:.`,
      );
    } catch (error) {
      const apiError = ApiError.from(error);
      this.toasts.error(
        apiError.code === 'desk_taken'
          ? $localize`:@@team.deskTakenThatDay:Votre bureau ${booking.deskCode}:code: est déjà pris ce jour-là. Choisissez-en un autre sur le plan.`
          : errorMessage(apiError),
      );
    } finally {
      this.moving.set(false);
      await this.load();
    }
  }

  protected selectTeam(team: string): void {
    this.team.set(team as Team);
    void this.load();
  }

  protected goToWeek(offset: number): void {
    this.week.set(offset === 0 ? mondayOf(today()) : addDays(this.week(), offset * 7));
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.data.set(await this.api.teamWeek(this.week(), this.team()));
    } catch (error) {
      this.toasts.error(errorMessage(ApiError.from(error)));
    }
  }
}
