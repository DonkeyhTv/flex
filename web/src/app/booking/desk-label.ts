import { EQUIPMENT_LABELS, ZONE_LABELS } from '../core/labels';
import type { DeskState } from './desk-state';

/** How a desk reads to a screen reader, and in the list view. */
export function deskAvailability(state: DeskState): string {
  const { am, pm, status } = state;
  switch (status) {
    case 'inactive':
      return $localize`:@@desk.inactive:hors service`;
    case 'mine':
      return $localize`:@@desk.mine:votre bureau ce jour-là`;
    case 'free':
      return $localize`:@@desk.free:libre toute la journée`;
    case 'partial':
      return am
        ? $localize`:@@desk.amTaken:matin pris par ${am.user.name}:name:, après-midi libre`
        : $localize`:@@desk.pmTaken:matin libre, après-midi pris par ${pm!.user.name}:name:`;
    case 'full':
      return am!.id === pm!.id
        ? $localize`:@@desk.taken:réservé par ${am!.user.name}:name:`
        : $localize`:@@desk.split:matin pris par ${am!.user.name}:morning:, après-midi par ${pm!.user.name}:afternoon:`;
  }
}

export function deskLabel(state: DeskState): string {
  const { desk } = state;
  const parts = [
    $localize`:@@desk.name:Bureau ${desk.code}:code:`,
    ZONE_LABELS[desk.zone],
    ...desk.equipment.map((item) => EQUIPMENT_LABELS[item].toLowerCase()),
    deskAvailability(state),
  ];
  return parts.join(', ');
}
