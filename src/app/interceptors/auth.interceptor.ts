import {
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  const cloned = token
    ? req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    })
    : req;

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthUrl = req.url.includes('/auth/');

      if (err.status === 401 && !isAuthUrl && auth.getAccessToken()) {
        return from(auth.refreshTokens()).pipe(
          switchMap((newToken) => {
            if (newToken) {
              const retry = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              });
              return next(retry);
            }
            auth.logout();
            return throwError(() => err);
          })
        );
      }

      if (err.status === 401 && isAuthUrl && !req.url.includes('/auth/login')) {
        auth.logout();
      }

      return throwError(() => err);
    })
  );
};
