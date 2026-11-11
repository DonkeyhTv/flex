import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Api } from './api';
import type { Member } from './models';

interface SessionState {
  member: Member | null;
  /** Whether /api/me has answered once: until then, nobody knows who is there. */
  checked: boolean;
}

/** Who is signed in. The session itself is an HttpOnly cookie the page never sees. */
export const Session = signalStore(
  { providedIn: 'root' },
  withState<SessionState>({ member: null, checked: false }),
  withComputed(({ member }) => ({
    signedIn: computed(() => member() !== null),
    isAdmin: computed(() => member()?.role === 'admin'),
    firstName: computed(() => member()?.name.split(' ')[0] ?? ''),
  })),
  withMethods((store, api = inject(Api), router = inject(Router)) => ({
    async check(): Promise<Member | null> {
      if (store.checked()) {
        return store.member();
      }
      const { member } = await api.session();
      patchState(store, { member, checked: true });
      return member;
    },
    async signIn(email: string, password: string): Promise<void> {
      patchState(store, { member: await api.signIn(email, password), checked: true });
    },
    async signOut(): Promise<void> {
      await api.signOut().catch(() => undefined);
      patchState(store, { member: null });
      await router.navigateByUrl('/sign-in');
    },
    /** The session ended on the server (expired, or signed out elsewhere). */
    expired(): void {
      if (store.member()) {
        patchState(store, { member: null });
        void router.navigate(['/sign-in'], { queryParams: { expired: 1 } });
      }
    },
  })),
);
