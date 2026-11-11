import type { Routes } from '@angular/router';
import { officeManager, signedIn, signedOut } from './core/guards';

/** Each page is its own chunk, loaded the first time someone opens it. */
export const routes: Routes = [
  {
    path: 'sign-in',
    canMatch: [signedOut],
    title: $localize`:@@title.signIn:Connexion · Flex`,
    loadComponent: () => import('./sign-in/sign-in-page').then((m) => m.SignInPage),
  },
  {
    path: '',
    canMatch: [signedIn],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: $localize`:@@title.book:Réserver un bureau · Flex`,
        loadComponent: () => import('./booking/booking-page').then((m) => m.BookingPage),
      },
      {
        path: 'my-bookings',
        title: $localize`:@@title.mine:Mes réservations · Flex`,
        loadComponent: () => import('./mine/my-bookings-page').then((m) => m.MyBookingsPage),
      },
      {
        path: 'team',
        title: $localize`:@@title.team:Équipe · Flex`,
        loadComponent: () => import('./team/team-page').then((m) => m.TeamPage),
      },
      {
        path: 'office',
        canMatch: [officeManager],
        title: $localize`:@@title.office:Bureaux · Flex`,
        loadComponent: () => import('./office/office-page').then((m) => m.OfficePage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
