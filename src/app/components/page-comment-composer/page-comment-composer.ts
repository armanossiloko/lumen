import {
  Component,
  input,
  output,
  signal,
  ViewChild,
  ElementRef,
  afterNextRender,
  inject,
} from '@angular/core';
import { MarkdownComposer } from '../markdown/markdown-composer';

/**
 * Collapsed-by-default comment field: tap to expand into full Markdown composer
 * (Write / Preview, resizable textarea). Avoids stacking two full editors in the thread.
 */
@Component({
  selector: 'app-page-comment-composer',
  standalone: true,
  imports: [MarkdownComposer],
  host: { class: 'cmt-md-composer-host' },
  template: `
    <div class="cmt-md-composer" [class.is-expanded]="expanded()">
      @if (!expanded()) {
        <button type="button" class="cmt-md-trigger" (click)="expand()">
          <span class="cmt-md-trigger-text">{{ placeholder() }}</span>
          <span class="cmt-md-trigger-meta">Markdown · click to expand</span>
        </button>
      } @else {
        <app-markdown-composer
          #composer
          [placeholder]="placeholder()"
          [submitLabel]="submitLabel()"
          previewVariant="comment"
          [rows]="expandedRows()"
          [resizable]="true"
          [showCancel]="true"
          (submitted)="onSubmitted($event)"
          (cancelled)="collapse()"
        />
      }
    </div>
  `,
})
export class PageCommentComposer {
  placeholder = input('Write a comment…');
  submitLabel = input('Send');
  /** Textarea rows when expanded. */
  expandedRows = input(6);

  submitted = output<string>();

  expanded = signal(false);

  @ViewChild('composer') private composer?: MarkdownComposer;

  private host = inject(ElementRef<HTMLElement>);

  expand(): void {
    this.expanded.set(true);
    afterNextRender(() => {
      const root = this.host.nativeElement.querySelector('.md-composer-input') as HTMLTextAreaElement | null;
      root?.focus();
    });
  }

  collapse(): void {
    this.expanded.set(false);
  }

  onSubmitted(text: string): void {
    this.submitted.emit(text);
    this.collapse();
  }
}
