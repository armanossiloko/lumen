import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthTokenService } from '../services/auth-token.service';

/** Requires a stored JWT; otherwise sends the user to sign-in. */
export const authGuard: CanActivateFn = (_route, state) => {
  const token = inject(AuthTokenService).get();
  if (token) return true;

  const router = inject(Router);
  const returnUrl = state.url.startsWith('/p/') ? state.url : undefined;
  return router.createUrlTree(['/login'], returnUrl ? { queryParams: { returnUrl } } : {});
};

/** Signed-in users should not see the login page. */
export const guestGuard: CanActivateFn = () => {
  const token = inject(AuthTokenService).get();
  if (!token) return true;
  return inject(Router).createUrlTree(['/p/welcome']);
};
