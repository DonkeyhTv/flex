import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
} from '@angular/core';
import { formatDay, today, weekday } from '../core/dates';
import type { IsoDate } from '../core/models';

/** The bookable days as a row of radio buttons: arrows move between them. */
@Component({
  selector: 'app-date-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="strip" role="radiogroup" i18n-aria-label="@@dates.label" aria-label="Jour">
      @for (day of labelled(); track day.date; let index = $index) {
        @if (day.weekStart && index > 0) {
          <span class="strip__gap" aria-hidden="true"></span>
        }
        <button
          type="button"
          role="radio"
          class="strip__day"
          [class.strip__day--today]="day.isToday"
          [attr.aria-checked]="day.date === selected()"
          [attr.aria-label]="day.full"
          [tabindex]="day.date === selected() ? 0 : -1"
          [attr.data-date]="day.date"
          (click)="pick.emit(day.date)"
          (keydown)="onKeydown($event, index)"
        >
          <span class="strip__weekday">{{ day.weekday }}</span>
          <span class="strip__number">{{ day.number }}</span>
          @if (day.isToday) {
            <span class="strip__today" i18n="@@dates.today">auj.</span>
          }
        </button>
      }
    </div>
  `,
  styleUrl: './date-strip.scss',
})
export class DateStrip {
  readonly days = input.required<IsoDate[]>();
  readonly selected = input.required<IsoDate>();
  readonly pick = output<IsoDate>();
  private readonly locale = inject(LOCALE_ID);

  protected readonly labelled = computed(() =>
    this.days().map((date) => ({
      date,
      weekday: formatDay(date, this.locale, { weekday: 'short' }).replace('.', ''),
      number: formatDay(date, this.locale, { day: 'numeric' }),
      full: formatDay(date, this.locale, { weekday: 'long', day: 'numeric', month: 'long' }),
      isToday: date === today(),
      weekStart: weekday(date) === 1,
    })),
  );

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    const days = this.days();
    const next =
      event.key === 'Home' ? 0 : event.key === 'End' ? days.length - 1 : step ? index + step : -1;
    if (next >= 0 && next < days.length) {
      event.preventDefault();
      this.pick.emit(days[next]);
      // Focus follows the selection, as in any radio group.
      queueMicrotask(() =>
        (event.currentTarget as HTMLElement).parentElement
          ?.querySelector<HTMLElement>(`[data-date="${days[next]}"]`)
          ?.focus(),
      );
    }
  }
}
