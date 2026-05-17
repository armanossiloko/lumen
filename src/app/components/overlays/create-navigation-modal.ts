import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownComposer } from '../markdown/markdown-composer';
import { IconPicker } from '../icon-picker/icon-picker';

export interface CreateNavContext {
  mode: 'page' | 'folder';
  parentId: string;
  parentTitle: string;
  prefilledTitle?: string;
}

@Component({
  selector: 'app-create-navigation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownComposer, IconPicker],
  template: `
    @if (ctx) {
      <div class="nav-create-overlay" (click)="cancel.emit()" role="presentation">
        <div class="nav-create-dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="nav-create-hd">
            <div class="nav-create-title">{{ ctx.mode === 'page' ? 'New page' : 'New folder' }}</div>
            <button type="button" class="nav-create-x" (click)="cancel.emit()" aria-label="Close">×</button>
          </div>
          <p class="nav-create-sub">
            Under <strong>{{ ctx.parentTitle }}</strong>
          </p>

          <label class="nav-create-field">
            <span class="nav-create-label">Title</span>
            <input type="text" class="nav-create-input" [(ngModel)]="title" name="navTitle" placeholder="Title…" />
          </label>

          <div class="nav-create-field">
            <span class="nav-create-label">Icon</span>
            <app-icon-picker
              [icon]="icon"
              [variant]="ctx.mode === 'folder' ? 'folder' : 'page'"
              (iconChange)="icon = $event"
            />
          </div>

          @if (ctx.mode === 'page') {
            <div class="nav-create-field nav-create-field--grow">
              <span class="nav-create-label">Markdown body</span>
              <app-markdown-composer
                #bodyComposer
                placeholder="Full GitHub-flavored Markdown: headings, lists, tasks, tables, fenced code, math-friendly text…"
                layout="dialog"
                previewVariant="document"
                [showToolbarSubmit]="false"
                hint="Ctrl+Enter inserts newline · Preview tab renders sanitized HTML"
              />
            </div>
          }

          <div class="nav-create-foot">
            <button type="button" class="btn btn-ghost" (click)="cancel.emit()">Cancel</button>
            <button type="button" class="btn btn-primary" [disabled]="!title.trim()" (click)="confirm()">
              {{ ctx.mode === 'page' ? 'Create page' : 'Create folder' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CreateNavigationModal implements OnChanges {
  @Input() ctx: CreateNavContext | null = null;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirmCreate = new EventEmitter<{
    mode: 'page' | 'folder';
    title: string;
    icon: string;
    markdownBody: string;
    parentId: string;
  }>();

  @ViewChild('bodyComposer') private bodyComposer?: MarkdownComposer;

  title = '';
  icon = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ctx'] && this.ctx) {
      this.title = this.ctx.prefilledTitle ?? '';
      this.icon = '';
    }
  }

  confirm() {
    if (!this.ctx || !this.title.trim()) return;
    const md =
      this.ctx.mode === 'page' ? (this.bodyComposer?.currentDraft()?.trim() ?? '') : '';
    this.confirmCreate.emit({
      mode: this.ctx.mode,
      title: this.title.trim(),
      icon: this.icon.trim(),
      markdownBody: md,
      parentId: this.ctx.parentId,
    });
  }
}
