import {
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, throwError } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';

function getErrorMessage(err: HttpErrorResponse): string {
  if (err.error?.message) return err.error.message;
  if (typeof err.error === 'string') return err.error;
  if (err.error?.error) return err.error.error;
  switch (err.status) {
    case 0:
      return 'Error de connexió';
    case 401:
      return 'No autoritzat';
    case 403:
      return 'Accés denegat';
    case 404:
      return 'No trobat';
    case 500:
      return 'Error del servidor';
    default:
      return err.message || 'Error desconegut';
  }
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastCtrl = inject(ToastController);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const message = getErrorMessage(err);
      from(
        toastCtrl
          .create({
            message,
            duration: 3000,
            position: 'bottom',
            color: 'danger',
          })
          .then((t) => t.present())
      ).subscribe();

      return throwError(() => err);
    })
  );
};
