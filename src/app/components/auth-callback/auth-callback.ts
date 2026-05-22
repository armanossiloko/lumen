import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StateService } from '../../services/state.service';
import { AuthSession } from '../../models';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="login-screen">
      <div class="login-screen-card" style="text-align: center">
        <p class="login-screen-lead">Completing sign-in…</p>
      </div>
    </div>
  `,
})
export class AuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private state = inject(StateService);

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const error = params.get('error');
    if (error) {
      void this.router.navigate(['/login'], { queryParams: { error } });
      return;
    }

    const token = params.get('token');
    const userId = params.get('userId');
    if (!token || !userId) {
      void this.router.navigate(['/login'], {
        queryParams: { error: 'Sign-in could not be completed.' },
      });
      return;
    }

    const session: AuthSession = {
      token,
      userId,
      name: params.get('name') ?? userId,
      initial: params.get('initial') ?? '?',
      color: params.get('color') ?? '#888888',
    };

    const returnUrl = params.get('returnUrl') ?? undefined;
    this.state.onLoginSuccess(session, returnUrl);
  }
}
