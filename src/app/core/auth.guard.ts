import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../shared/service/auth.service';

import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  } else {
    return router.navigate(['/login'], { queryParams: { returnUrl: state.url } });

  }
};