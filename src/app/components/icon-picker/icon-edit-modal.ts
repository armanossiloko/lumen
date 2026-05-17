import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconPicker } from './icon-picker';

export interface IconEditContext {
  nodeId: string;
  title: string;
  kind: 'page' | 'folder';
  icon: string;
}

@Component({
  selector: 'app-icon-edit-modal',
  standalone: true,
  imports: [CommonModule, IconPicker],
  template: `
    @if (ctx) {
      <div class="nav-create-overlay" (click)="cancel.emit()" role="presentation">
        <div class="nav-create-dialog nav-create-dialog--icon" (click)="$event.stopPropagation()" role="dialog">
          <div class="nav-create-hd">
            <div class="nav-create-title">Change icon — {{ ctx.title }}</div>
            <button type="button" class="nav-create-x" (click)="cancel.emit()">×</button>
          </div>
          <div class="nav-create-field">
            <app-icon-picker
              [icon]="draft"
              [variant]="ctx.kind === 'folder' ? 'folder' : 'page'"
              (iconChange)="draft = $event"
            />
          </div>
          <div class="nav-create-foot">
            <button type="button" class="btn btn-ghost" (click)="cancel.emit()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="save.emit(draft)">Save</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class IconEditModal implements OnChanges {
  @Input() ctx: IconEditContext | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  draft = '';

  ngOnChanges(): void {
    if (this.ctx) this.draft = this.ctx.icon ?? '';
  }
}
