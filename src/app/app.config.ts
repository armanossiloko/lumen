import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors, HttpInterceptorFn } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { AuthTokenService } from './services/auth-token.service';
import { inject } from '@angular/core';
import { environment } from '../environments/environment';

const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthTokenService).get();
  if (!token) return next(req);

  const apiRoot = environment.apiBaseUrl ? `${environment.apiBaseUrl}/api` : '/api';
  if (req.url.startsWith(apiRoot) || req.url.startsWith('/api')) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
  ],
};
