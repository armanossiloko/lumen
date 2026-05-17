import { Routes } from '@angular/router';
import { AppComponent } from './app';

export const routes: Routes = [
  { path: '', redirectTo: 'p/engineering/auth-rfc', pathMatch: 'full' },
  { path: 'p', children: [{ path: '**', component: AppComponent }] },
  { path: '**', redirectTo: 'p/engineering/auth-rfc' },
];
