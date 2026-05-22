import { Routes } from '@angular/router';
import { AppComponent } from './app';
import { LoginComponent } from './components/login/login';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback';
import { authGuard, guestGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'p',
    canActivate: [authGuard],
    children: [{ path: '**', component: AppComponent }],
  },
  { path: '**', redirectTo: 'login' },
];
