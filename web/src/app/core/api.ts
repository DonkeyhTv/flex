import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  DemoAccounts,
  Desk,
  ErrorCode,
  IsoDate,
  Member,
  Office,
  Reservation,
  Slot,
  Team,
  TeamWeek,
} from './models';

/** A refusal from the API, with its code when it gave one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | null,
  ) {
    super(code ?? `HTTP ${status}`);
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }
    if (error instanceof HttpErrorResponse) {
      return new ApiError(error.status, (error.error as { code?: ErrorCode } | null)?.code ?? null);
    }
    return new ApiError(0, null);
  }
}

/** The Flex API, as promises: every call is one request and one answer. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  private async call<T>(request: ReturnType<HttpClient['get']>): Promise<T> {
    try {
      return (await firstValueFrom(request)) as T;
    } catch (error) {
      throw ApiError.from(error);
    }
  }

  demoAccounts(): Promise<DemoAccounts> {
    return this.call(this.http.get('/api/auth/demo-accounts'));
  }

  signIn(email: string, password: string): Promise<Member> {
    return this.call(this.http.post('/api/auth/sign-in', { email, password }));
  }

  signOut(): Promise<void> {
    return this.call(this.http.post('/api/auth/sign-out', null));
  }

  session(): Promise<{ member: Member | null }> {
    return this.call(this.http.get('/api/auth/session'));
  }

  office(): Promise<Office> {
    return this.call(this.http.get('/api/office'));
  }

  reservationsOn(date: IsoDate): Promise<Reservation[]> {
    return this.call(this.http.get('/api/reservations', { params: { date } }));
  }

  myReservations(): Promise<Reservation[]> {
    return this.call(this.http.get('/api/reservations/mine'));
  }

  book(deskId: string, date: IsoDate, slot: Slot): Promise<Reservation> {
    return this.call(this.http.post('/api/reservations', { deskId, date, slot }));
  }

  move(id: string, change: { date?: IsoDate; deskId?: string; slot?: Slot }): Promise<Reservation> {
    return this.call(this.http.patch(`/api/reservations/${id}`, change));
  }

  cancel(id: string): Promise<void> {
    return this.call(this.http.delete(`/api/reservations/${id}`));
  }

  teamWeek(week: IsoDate, team?: Team): Promise<TeamWeek> {
    return this.call(this.http.get('/api/team', { params: team ? { week, team } : { week } }));
  }

  updateDesk(
    id: string,
    change: { active: boolean; disabledReason?: string | null },
  ): Promise<{ desk: Desk; cancelled: number }> {
    return this.call(this.http.patch(`/api/desks/${id}`, change));
  }
}
