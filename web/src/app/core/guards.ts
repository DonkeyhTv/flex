import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Session } from './session';

/** Pages for signed-in members: anyone else goes to the sign-in page, and comes back after. */
export const signedIn: CanMatchFn = async (_route, segments) => {
  const session = inject(Session);
  const router = inject(Router);
  if (await session.check()) {
    return true;
  }
  const back = '/' + segments.map((segment) => segment.path).join('/');
  return router.createUrlTree(['/sign-in'], back === '/' ? {} : { queryParams: { back } });
};

// Guards inject before their first await: inject() only works synchronously.
export const officeManager: CanMatchFn = async () => {
  const session = inject(Session);
  const router = inject(Router);
  await session.check();
  return session.isAdmin() || router.createUrlTree(['/']);
};

export const signedOut: CanMatchFn = async () => {
  const session = inject(Session);
  const router = inject(Router);
  return !(await session.check()) || router.createUrlTree(['/']);
};

/** A 401 on any call but the session's own means the session ended under our feet. */
export const sessionExpiry: HttpInterceptorFn = (request, next) => {
  const session = inject(Session);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.startsWith('/api/auth/')
      ) {
        session.expired();
      }
      return throwError(() => error);
    }),
  );
};
