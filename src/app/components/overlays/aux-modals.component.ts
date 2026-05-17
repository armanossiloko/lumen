import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageTemplate } from '../../services/api.service';

@Component({
  selector: 'app-history-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="cmd-overlay" (click)="onClose.emit()">
        <div class="share" (click)="$event.stopPropagation()">
          <div class="share-hd">
            <div class="share-title">Page history</div>
            <button type="button" class="hd-icon-btn" (click)="onClose.emit()">×</button>
          </div>
          @for (v of entries; track v.id) {
            <button type="button" class="cmd-item" (click)="restore.emit(v.id)">
              <span class="cmd-item-title">{{ v.title }}</span>
              <span class="cmd-item-sub">{{ v.savedAt }} · {{ v.savedBy ?? '—' }}</span>
            </button>
          }
          @if (entries.length === 0) {
            <p class="cmd-empty">No saved versions yet. Versions are created when you edit a page.</p>
          }
        </div>
      </div>
    }
  `,
})
export class HistoryModal {
  @Input() open = false;
  @Input() entries: { id: string; title: string; savedAt: string; savedBy?: string }[] = [];
  @Output() onClose = new EventEmitter<void>();
  @Output() restore = new EventEmitter<string>();
}

@Component({
  selector: 'app-backlinks-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="cmd-overlay" (click)="onClose.emit()">
        <div class="share" (click)="$event.stopPropagation()">
          <div class="share-hd">
            <div class="share-title">Backlinks</div>
            <button type="button" class="hd-icon-btn" (click)="onClose.emit()">×</button>
          </div>
          @for (link of links; track link.pageId) {
            <button type="button" class="cmd-item" (click)="openPage.emit(link.pageId)">
              <span class="cmd-item-icon">{{ link.icon }}</span>
              <span class="cmd-item-title">{{ link.title }}</span>
            </button>
          }
          @if (links.length === 0) {
            <p class="cmd-empty">No pages link here yet.</p>
          }
        </div>
      </div>
    }
  `,
})
export class BacklinksModal {
  @Input() open = false;
  @Input() links: { pageId: string; title: string; icon: string }[] = [];
  @Output() onClose = new EventEmitter<void>();
  @Output() openPage = new EventEmitter<string>();
}

@Component({
  selector: 'app-trash-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="inbox-overlay" (click)="onClose.emit()">
        <div class="inbox" (click)="$event.stopPropagation()">
          <div class="inbox-hd">
            <div class="inbox-title">Trash</div>
          </div>
          @for (p of pages; track p.id) {
            <div class="inbox-item">
              <span>@if (p.icon) { {{ p.icon }} }{{ p.title }}</span>
              <button type="button" class="btn btn-ghost btn-sm" (click)="restore.emit(p.id)">Restore</button>
            </div>
          }
          @if (pages.length === 0) {
            <p class="cmd-empty">Trash is empty.</p>
          }
        </div>
      </div>
    }
  `,
})
export class TrashPanel {
  @Input() open = false;
  @Input() pages: { id: string; title: string; icon?: string }[] = [];
  @Output() onClose = new EventEmitter<void>();
  @Output() restore = new EventEmitter<string>();
}

@Component({
  selector: 'app-templates-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="cmd-overlay" (click)="onClose.emit()">
        <div class="cmd" (click)="$event.stopPropagation()">
          <div class="share-hd">
            <div class="share-title">Templates</div>
            <button type="button" class="hd-icon-btn" (click)="onClose.emit()">×</button>
          </div>
          @for (t of templates; track t.id) {
            <button type="button" class="cmd-item" (click)="select.emit(t)">
              <span class="cmd-item-icon">{{ t.icon }}</span>
              <span class="cmd-item-title">{{ t.title }}</span>
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class TemplatesModal {
  @Input() open = false;
  @Input() templates: PageTemplate[] = [];
  @Output() onClose = new EventEmitter<void>();
  @Output() select = new EventEmitter<PageTemplate>();
}
