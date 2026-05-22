import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { StateService } from '../../services/state.service';
import { AuthSession } from '../../models';
import { OfflineScreenComponent } from '../offline-screen/offline-screen';
import { isApiUnreachable } from '../../utils/http-error';
import { environment } from '../../../environments/environment';

const PROVIDER_LABELS: Record<string, string> = {
  Microsoft: 'Microsoft',
  Facebook: 'Facebook',
  GitHub: 'GitHub',
  Twitter: 'X (Twitter)',
  Keycloak: 'Keycloak',
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, OfflineScreenComponent],
  template: `
    @if (apiUnreachable()) {
      <app-offline-screen (retry)="checkConnection()" />
    } @else {
      <div class="login-screen">
        <div class="login-screen-glow" aria-hidden="true"></div>
        <div class="login-screen-card">
          <div class="login-screen-brand">
            <span class="login-screen-mark" aria-hidden="true">◆</span>
            <span class="login-screen-name">Lumen</span>
          </div>

          <h1 class="login-screen-title">Sign in</h1>
          <p class="login-screen-lead">Enter your username or email and password to continue.</p>

          @if (externalProviders().length > 0) {
            <div class="login-external">
              @for (p of externalProviders(); track p) {
                <button
                  type="button"
                  class="btn login-external-btn"
                  [disabled]="busy()"
                  (click)="signInExternal(p)"
                >
                  Continue with {{ providerLabel(p) }}
                </button>
              }
            </div>
            <p class="login-divider"><span>or</span></p>
          }

          <form class="login-form" (ngSubmit)="submit()">
            <label class="login-field">
              <span>Username or email</span>
              <input
                type="text"
                [(ngModel)]="userName"
                name="userName"
                required
                autocomplete="username"
                placeholder="maya@lumen.dev"
                [disabled]="busy()"
              />
            </label>

            <label class="login-field">
              <span>Password</span>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                autocomplete="current-password"
                [disabled]="busy()"
              />
            </label>

            <label class="login-remember">
              <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" [disabled]="busy()" />
              <span>Stay signed in</span>
            </label>

            @if (errorMessage()) {
              <p class="login-error" role="alert">{{ errorMessage() }}</p>
            }

            <button type="submit" class="btn btn-primary login-submit" [disabled]="busy()">
              {{ busy() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          @if (!environment.production) {
            <p class="login-hint">Demo: <code>maya@lumen.dev</code> / <code>lumen</code></p>
          }
        </div>
      </div>
    }
  `,
})
export class LoginComponent implements OnInit {
  private api = inject(ApiService);
  private state = inject(StateService);
  private route = inject(ActivatedRoute);

  readonly environment = environment;

  userName = '';
  password = '';
  rememberMe = true;
  busy = signal(false);
  apiUnreachable = signal(false);
  errorMessage = signal<string | null>(null);
  externalProviders = signal<string[]>([]);

  ngOnInit() {
    const err = this.route.snapshot.queryParamMap.get('error');
    if (err) this.errorMessage.set(err);
    this.checkConnection();
  }

  providerLabel(id: string) {
    return PROVIDER_LABELS[id] ?? id;
  }

  checkConnection() {
    this.apiUnreachable.set(false);
    this.errorMessage.set(null);
    this.api.getAuthProviders().subscribe({
      next: (res) => {
        this.apiUnreachable.set(false);
        this.externalProviders.set(res.providers ?? []);
      },
      error: (err) => {
        if (isApiUnreachable(err)) this.apiUnreachable.set(true);
      },
    });
  }

  signInExternal(provider: string) {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const callback = new URL('/auth/callback', window.location.origin);
    if (returnUrl) callback.searchParams.set('returnUrl', returnUrl);
    window.location.href = this.api.externalLoginUrl(provider, callback.toString());
  }

  submit() {
    const id = this.userName.trim();
    if (!id) {
      this.errorMessage.set('Enter your username or email.');
      return;
    }

    this.busy.set(true);
    this.errorMessage.set(null);
    this.api.login(id, this.password, this.rememberMe).subscribe({
      next: (user) => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? undefined;
        this.state.onLoginSuccess(user as AuthSession, returnUrl ?? undefined);
        this.busy.set(false);
      },
      error: (err) => {
        this.busy.set(false);
        if (isApiUnreachable(err)) {
          this.apiUnreachable.set(true);
          return;
        }
        const msg =
          err?.error?.error ??
          (err?.status === 401 ? 'Invalid user or password.' : 'Sign-in failed. Try again.');
        this.errorMessage.set(msg);
      },
    });
  }
}
