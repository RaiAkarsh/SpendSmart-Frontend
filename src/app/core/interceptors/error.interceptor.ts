import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/data-access/auth.service';

const resolveErrorMessage = (error: HttpErrorResponse): string => {
  // status 0 = network error (gateway down, CORS blocked, no internet)
  if (error.status === 0) {
    return '⚠️ Cannot reach the API Gateway (port 8080). Make sure gateway-service is running and CORS is configured.';
  }
  if (error.status === 503) {
    return '⚠️ A downstream microservice is unavailable. Check that all 8 Spring Boot services are running.';
  }
  if (typeof error.error === 'string' && error.error.trim()) {
    return error.error;
  }
  if (error.error?.error) return error.error.error as string;
  if (error.error?.message) return error.error.message as string;
  return error.message || 'Something went wrong. Please try again.';
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = resolveErrorMessage(error);

      if (error.status === 401) {
        authService.logout();
        router.navigate(['/auth/login']);
      }

      snackBar.open(message, 'Dismiss', {
        duration: 6000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });

      return throwError(() => error);
    })
  );
};
