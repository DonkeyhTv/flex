import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FLOOR_LABELS, ROOM_LABELS, ZONE_LABELS } from '../core/labels';
import type { Floor, Office, Zone } from '../core/models';
import { initials, type DeskState } from './desk-state';
import { deskLabel } from './desk-label';

type Direction = 'up' | 'down' | 'left' | 'right';

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/**
 * The plan of one floor, in SVG. The desks are buttons: one tab stop for the
 * whole plan, then the arrow keys move to the nearest desk in that direction,
 * as on a real floor.
 */
@Component({
  selector: 'app-floor-plan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './floor-plan.html',
  styleUrl: './floor-plan.scss',
})
export class FloorPlan {
  readonly office = input.required<Office>();
  readonly floor = input.required<Floor>();
  readonly states = input.required<DeskState[]>();
  readonly selectedId = input<string | null>(null);
  readonly picked = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** The desk that holds the plan's single tab stop. */
  private readonly focusedId = signal<string | null>(null);

  protected readonly title = computed(
    () => $localize`:@@plan.title:Plan du ${FLOOR_LABELS[this.floor().level]}:floor:`,
  );
  protected readonly roomLabels = ROOM_LABELS;
  protected readonly windows = computed(() => {
    const xs: number[] = [];
    for (let x = 70; x + 90 < this.office().width - 30; x += 140) {
      xs.push(x);
    }
    return xs;
  });
  protected readonly deskWidth = computed(() => this.office().desk.width);
  protected readonly deskHeight = computed(() => this.office().desk.height);

  protected readonly tabStop = computed(() => {
    const ids = this.states().map((state) => state.desk.id);
    const preferred = [this.focusedId(), this.selectedId()].find((id) => id && ids.includes(id));
    return preferred ?? ids[0] ?? null;
  });

  /** A tinted area behind each team's desks, with its name. */
  protected readonly zones = computed(() => {
    const areas = new Map<Zone, { x1: number; y1: number; x2: number; y2: number }>();
    const { width, height } = this.office().desk;
    for (const { desk } of this.states()) {
      const area = areas.get(desk.zone);
      areas.set(desk.zone, {
        x1: Math.min(area?.x1 ?? Infinity, desk.x),
        y1: Math.min(area?.y1 ?? Infinity, desk.y),
        x2: Math.max(area?.x2 ?? -Infinity, desk.x + width),
        y2: Math.max(area?.y2 ?? -Infinity, desk.y + height),
      });
    }
    const pad = 22;
    return [...areas].map(([zone, a]) => ({
      zone,
      label: ZONE_LABELS[zone],
      x: a.x1 - pad,
      y: a.y1 - pad - 14,
      width: a.x2 - a.x1 + pad * 2,
      height: a.y2 - a.y1 + pad * 2 + 14,
    }));
  });

  protected text(state: DeskState): string {
    const person = state.am ?? state.pm;
    return (state.status === 'full' || state.status === 'mine') && person
      ? initials(person.user.name)
      : state.desk.code;
  }

  /** Starts with what the desk shows, initials included, so voice control can name it. */
  protected accessibleName(state: DeskState): string {
    const shown = this.text(state);
    return shown === state.desk.code ? deskLabel(state) : `${shown}, ${deskLabel(state)}`;
  }

  protected pick(id: string): void {
    this.focusedId.set(id);
    this.picked.emit(id);
  }

  protected onKeydown(event: KeyboardEvent, from: DeskState): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.pick(from.desk.id);
      return;
    }
    const states = this.states();
    let target: DeskState | undefined;
    if (event.key === 'Home' || event.key === 'End') {
      target = event.key === 'Home' ? states[0] : states.at(-1);
    } else if (KEYS[event.key]) {
      target = nearest(from, states, KEYS[event.key]);
    }
    if (target) {
      event.preventDefault();
      this.focusedId.set(target.desk.id);
      this.host.nativeElement
        .querySelector<SVGGElement>(`[data-desk="${target.desk.id}"]`)
        ?.focus();
    }
  }
}

/** The closest desk in a direction, favouring the ones straight ahead. */
export function nearest(
  from: DeskState,
  states: DeskState[],
  direction: Direction,
): DeskState | undefined {
  let best: DeskState | undefined;
  let bestScore = Infinity;
  for (const state of states) {
    const dx = state.desk.x - from.desk.x;
    const dy = state.desk.y - from.desk.y;
    const [ahead, aside] = direction === 'left' || direction === 'right' ? [dx, dy] : [dy, dx];
    const forward = direction === 'right' || direction === 'down' ? ahead : -ahead;
    if (state === from || forward <= 0) {
      continue;
    }
    const score = forward + Math.abs(aside) * 3;
    if (score < bestScore) {
      best = state;
      bestScore = score;
    }
  }
  return best;
}
