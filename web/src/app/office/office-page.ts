import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  LOCALE_ID,
  signal,
} from '@angular/core';
import { Api, ApiError } from '../core/api';
import { formatDay } from '../core/dates';
import { EQUIPMENT_LABELS, errorMessage, TEAM_LABELS, ZONE_LABELS } from '../core/labels';
import type { Desk, Office, Stats } from '../core/models';
import { OfficeEvents } from '../core/office-events';
import { Toasts } from '../core/toasts';

/** The office manager's page: how full the office is, and which desks are in service. */
@Component({
  selector: 'app-office-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './office-page.html',
  styleUrl: './office-page.scss',
})
export class OfficePage {
  private readonly api = inject(Api);
  private readonly toasts = inject(Toasts);
  private readonly locale = inject(LOCALE_ID);

  protected readonly stats = httpResource<Stats>(() => '/api/stats');
  protected readonly office = httpResource<Office>(() => '/api/office');

  protected readonly zoneLabels = ZONE_LABELS;
  protected readonly teamLabels = TEAM_LABELS;
  protected readonly equipmentLabels = EQUIPMENT_LABELS;
  protected readonly percent = new Intl.NumberFormat(this.locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  });

  /** The desk whose "out of service" form is open, and the reason typed in it. */
  protected readonly editing = signal<string | null>(null);
  protected readonly reason = signal('');
  protected readonly busy = signal(false);
  protected readonly showTable = signal(false);
  protected readonly hovered = signal<string | null>(null);

  protected readonly days = computed(() =>
    (this.stats.value()?.days ?? []).map((day) => ({
      ...day,
      label: formatDay(day.date, this.locale, { weekday: 'short', day: 'numeric' }),
      full: formatDay(day.date, this.locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    })),
  );

  protected readonly hoveredDay = computed(
    () => this.days().find((day) => day.date === this.hovered()) ?? null,
  );

  protected readonly busiest = computed(
    () => [...this.days()].sort((a, b) => b.rate - a.rate)[0] ?? null,
  );

  protected readonly desks = computed(
    () =>
      this.office
        .value()
        ?.floors.flatMap((floor) => floor.desks.map((desk) => ({ ...desk, level: floor.level }))) ??
      [],
  );

  constructor() {
    inject(OfficeEvents).listen(() => {
      this.stats.reload();
      this.office.reload();
    });
  }

  protected tooltip(day: {
    full: string;
    am: number;
    pm: number;
    capacity: number;
    rate: number;
  }): string {
    return $localize`:@@office.dayTooltip:${day.full}:day: : ${this.percent.format(day.rate)}:rate: — ${day.am}:am: le matin, ${day.pm}:pm: l’après-midi, sur ${day.capacity}:capacity: bureaux`;
  }

  protected edit(desk: Desk): void {
    this.editing.set(desk.id);
    this.reason.set('');
  }

  protected async setActive(desk: Desk, active: boolean): Promise<void> {
    this.busy.set(true);
    try {
      const { cancelled } = await this.api.updateDesk(desk.id, {
        active,
        disabledReason: active ? null : this.reason().trim() || null,
      });
      this.toasts.success(
        active
          ? $localize`:@@office.backInService:Bureau ${desk.code}:code: remis en service.`
          : $localize`:@@office.outOfService:Bureau ${desk.code}:code: hors service. Réservations annulées : ${cancelled}:count:.`,
      );
      this.editing.set(null);
    } catch (error) {
      this.toasts.error(errorMessage(ApiError.from(error)));
    } finally {
      this.busy.set(false);
      this.office.reload();
      this.stats.reload();
    }
  }
}
