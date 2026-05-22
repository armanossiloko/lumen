import { Component, output } from '@angular/core';

@Component({
  selector: 'app-offline-screen',
  standalone: true,
  template: `
    <div class="error-screen" role="alert" aria-live="polite">
      <div class="error-screen-glow" aria-hidden="true"></div>
      <div class="error-screen-card">
        <div class="error-screen-brand">
          <span class="error-screen-mark" aria-hidden="true">◆</span>
          <span class="error-screen-name">Lumen</span>
        </div>

        <div class="error-screen-icon" aria-hidden="true">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <path d="M8 32c6-10 14-14 20-14s14 4 20 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/>
            <path d="M14 38c4-6 10-9 14-9s10 3 14 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
            <path d="M22 44c2-3 5-5 6-5s4 2 6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M36 18L44 26M44 18L36 26" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>

        <h1 class="error-screen-title">Can't connect right now</h1>
        <p class="error-screen-lead">
          We couldn't reach Lumen. Check your connection, then try again — your pages and workspace will show up once you're back online.
        </p>

        <div class="error-screen-actions">
          <button type="button" class="btn btn-primary" (click)="retry.emit()">Try again</button>
        </div>
      </div>
    </div>
  `,
})
export class OfflineScreenComponent {
  retry = output<void>();
}
