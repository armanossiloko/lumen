import {
  Component,
  input,
  output,
  signal,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarkdownView } from './markdown-view';
import { applyMarkdownFormat, MarkdownFormatAction } from './markdown-format';

interface FormatControl {
  action: MarkdownFormatAction;
  label: string;
  title: string;
  icon: string;
}

const FORMAT_CONTROLS: FormatControl[] = [
  { action: 'bold', label: 'B', title: 'Bold (Ctrl+B)', icon: 'bold' },
  { action: 'italic', label: 'I', title: 'Italic (Ctrl+I)', icon: 'italic' },
  { action: 'strike', label: 'S', title: 'Strikethrough', icon: 'strike' },
  { action: 'code', label: '`', title: 'Inline code', icon: 'code' },
  { action: 'link', label: 'Link', title: 'Link', icon: 'link' },
  { action: 'heading', label: 'H', title: 'Heading', icon: 'heading' },
  { action: 'bulletList', label: '•', title: 'Bullet list', icon: 'ul' },
  { action: 'numberedList', label: '1.', title: 'Numbered list', icon: 'ol' },
  { action: 'quote', label: '❝', title: 'Quote', icon: 'quote' },
  { action: 'codeBlock', label: '</>', title: 'Code block', icon: 'codeBlock' },
  { action: 'hr', label: '—', title: 'Horizontal rule', icon: 'hr' },
];

@Component({
  selector: 'app-markdown-composer',
  standalone: true,
  imports: [FormsModule, MarkdownView],
  host: { class: 'md-composer-host' },
  template: `
    <div class="md-composer" [class.md-composer--dialog]="layout() === 'dialog'">
      <div class="md-composer-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="tab() === 'write'"
          class="md-composer-tab"
          [class.active]="tab() === 'write'"
          (click)="tab.set('write')"
        >
          Write
        </button>
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="tab() === 'preview'"
          class="md-composer-tab"
          [class.active]="tab() === 'preview'"
          (click)="tab.set('preview')"
        >
          Preview
        </button>
      </div>
      @if (tab() === 'write' && showFormatToolbar()) {
        <div class="md-composer-format" role="toolbar" aria-label="Formatting">
          @for (ctrl of formatControls; track ctrl.action) {
            <button
              type="button"
              class="md-format-btn"
              [class.md-format-btn--text]="ctrl.icon === 'link'"
              [attr.aria-label]="ctrl.title"
              [title]="ctrl.title"
              (mousedown)="$event.preventDefault()"
              (click)="applyFormat(ctrl.action)"
            >
              @switch (ctrl.icon) {
                @case ('bold') {
                  <span class="md-format-icon md-format-icon--bold">B</span>
                }
                @case ('italic') {
                  <span class="md-format-icon md-format-icon--italic">I</span>
                }
                @case ('strike') {
                  <span class="md-format-icon md-format-icon--strike">S</span>
                }
                @case ('code') {
                  <span class="md-format-icon md-format-icon--mono">&#96;</span>
                }
                @case ('link') {
                  <span class="md-format-label">Link</span>
                }
                @case ('heading') {
                  <span class="md-format-icon">H</span>
                }
                @case ('ul') {
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                    <circle cx="4" cy="3.5" r=".9" fill="currentColor"/>
                    <circle cx="4" cy="7" r=".9" fill="currentColor"/>
                    <circle cx="4" cy="10.5" r=".9" fill="currentColor"/>
                  </svg>
                }
                @case ('ol') {
                  <span class="md-format-icon md-format-icon--mono">1.</span>
                }
                @case ('quote') {
                  <span class="md-format-icon">❝</span>
                }
                @case ('codeBlock') {
                  <span class="md-format-icon md-format-icon--mono">&lt;/&gt;</span>
                }
                @case ('hr') {
                  <span class="md-format-icon">—</span>
                }
              }
            </button>
          }
        </div>
      }
      @if (tab() === 'write') {
        <textarea
          #editor
          [class]="'md-composer-input' + (resizable() ? ' md-composer-input--resize' : '')"
          [placeholder]="placeholder()"
          [attr.rows]="rows()"
          [ngModel]="draft()"
          (ngModelChange)="draft.set($event)"
          (keydown)="onKeydown($event)"
        ></textarea>
      } @else {
        <div
          class="md-composer-preview-wrap"
          [class.md-composer-preview--document]="previewVariant() === 'document'"
        >
          @if (!draft().trim()) {
            <div class="md-composer-empty">Nothing to preview yet.</div>
          } @else {
            <app-markdown-view [source]="draft()" [variant]="previewVariant()" />
          }
        </div>
      }
      <div class="md-composer-toolbar">
        <span class="md-composer-hint">{{ hint() }}</span>
        <div class="md-composer-actions">
          @if (showCancel()) {
            <button type="button" class="btn btn-ghost btn-sm" (click)="cancel()">Cancel</button>
          }
          @if (showToolbarSubmit()) {
            <button type="button" class="btn md-composer-send" [disabled]="!draft().trim()" (click)="submit()">
              {{ submitLabel() }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class MarkdownComposer implements OnInit {
  placeholder = input('Write…');
  submitLabel = input('Send');
  hint = input('Markdown · Ctrl+Enter to send');
  layout = input<'default' | 'dialog'>('default');
  previewVariant = input<'comment' | 'document'>('comment');
  showToolbarSubmit = input(true);
  showCancel = input(false);
  showFormatToolbar = input(true);
  clearOnSubmit = input(true);
  rows = input(4);
  resizable = input(false);
  /** Seed textarea when the component is created (modal / edit sheet). */
  initialBody = input('');

  submitted = output<string>();
  cancelled = output<void>();

  readonly formatControls = FORMAT_CONTROLS;

  tab = signal<'write' | 'preview'>('write');
  draft = signal('');
  private submitting = false;

  @ViewChild('editor') private editorRef?: ElementRef<HTMLTextAreaElement>;

  ngOnInit(): void {
    this.draft.set(this.initialBody());
  }

  /** Raw draft including trailing whitespace (for save). */
  currentDraft(): string {
    return this.draft();
  }

  applyFormat(action: MarkdownFormatAction): void {
    const el = this.editorRef?.nativeElement;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const result = applyMarkdownFormat(this.draft(), start, end, action);
    this.draft.set(result.value);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      this.applyFormat('bold');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      this.applyFormat('italic');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      this.applyFormat('link');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (this.showToolbarSubmit()) {
        e.preventDefault();
        this.submit();
      }
    }
  }

  cancel() {
    this.draft.set('');
    this.tab.set('write');
    this.cancelled.emit();
  }

  submit() {
    if (this.submitting) return;
    const text = this.draft().trim();
    if (!text) return;
    this.submitting = true;
    this.submitted.emit(text);
    if (this.clearOnSubmit()) {
      this.draft.set('');
      this.tab.set('write');
    }
    queueMicrotask(() => {
      this.submitting = false;
    });
  }
}
