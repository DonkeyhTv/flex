import type { Equipment, ErrorCode, RoomKind, Slot, Team, Zone } from './models';

/** What the API sends as codes, in the page's language. */

export const TEAM_LABELS: Record<Team, string> = {
  design: $localize`:@@team.design:Design`,
  produit: $localize`:@@team.produit:Produit`,
  tech: $localize`:@@team.tech:Tech`,
  ventes: $localize`:@@team.ventes:Ventes`,
  ops: $localize`:@@team.ops:Office`,
};

export const ZONE_LABELS: Record<Zone, string> = {
  design: TEAM_LABELS.design,
  produit: TEAM_LABELS.produit,
  tech: TEAM_LABELS.tech,
  ventes: TEAM_LABELS.ventes,
  calme: $localize`:@@zone.calme:Zone calme`,
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  double_screen: $localize`:@@equipment.doubleScreen:Double écran`,
  standing: $localize`:@@equipment.standing:Assis-debout`,
  window: $localize`:@@equipment.window:Côté fenêtre`,
};

export const ROOM_LABELS: Record<RoomKind, string> = {
  meeting: $localize`:@@room.meeting:Salle de réunion`,
  kitchen: $localize`:@@room.kitchen:Cuisine`,
  stairs: $localize`:@@room.stairs:Escalier`,
  phone: $localize`:@@room.phone:Cabines`,
  lounge: $localize`:@@room.lounge:Coin détente`,
};

export const SLOT_LABELS: Record<Slot, string> = {
  day: $localize`:@@slot.day:Journée`,
  am: $localize`:@@slot.am:Matin`,
  pm: $localize`:@@slot.pm:Après-midi`,
};

export const FLOOR_LABELS: Record<number, string> = {
  1: $localize`:@@floor.1:1er étage`,
  2: $localize`:@@floor.2:2e étage`,
};

const ERRORS: Record<ErrorCode, string> = {
  invalid_credentials: $localize`:@@error.invalidCredentials:Adresse e-mail ou mot de passe incorrect.`,
  invalid_date: $localize`:@@error.invalidDate:Cette date n’existe pas.`,
  past_date: $localize`:@@error.pastDate:Cette date est passée.`,
  beyond_window: $localize`:@@error.beyondWindow:On réserve au plus deux semaines à l’avance.`,
  weekend: $localize`:@@error.weekend:Le bureau est fermé le week-end.`,
  desk_not_found: $localize`:@@error.deskNotFound:Ce bureau n’existe plus.`,
  desk_inactive: $localize`:@@error.deskInactive:Ce bureau est hors service.`,
  desk_taken: $localize`:@@error.deskTaken:Quelqu’un vient de réserver ce bureau. Choisissez-en un autre.`,
  already_booked: $localize`:@@error.alreadyBooked:Vous avez déjà un bureau à ce moment-là.`,
  reservation_not_found: $localize`:@@error.reservationNotFound:Cette réservation n’existe plus.`,
  admin_only: $localize`:@@error.adminOnly:Réservé à l’office manager.`,
};

export function errorMessage(error: { status: number; code: ErrorCode | null }): string {
  if (error.code) {
    return ERRORS[error.code];
  }
  if (error.status === 429) {
    return $localize`:@@error.tooMany:Trop de tentatives. Patientez une minute.`;
  }
  return error.status === 0
    ? $localize`:@@error.offline:Le serveur ne répond pas. Vérifiez votre connexion.`
    : $localize`:@@error.unexpected:Une erreur est survenue. Réessayez dans un instant.`;
}
