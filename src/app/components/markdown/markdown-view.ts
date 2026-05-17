import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { renderMarkdownToHtml } from '../../markdown/render';

@Component({
  selector: 'app-markdown-view',
  standalone: true,
  template: `<div
    class="markdown-body"
    [class.markdown-body--comment]="variant() === 'comment'"
    [class.markdown-body--document]="variant() === 'document'"
    [innerHTML]="html()"
  ></div>`,
})
export class MarkdownView {
  private sanitizer = inject(DomSanitizer);

  source = input<string>('');
  variant = input<'comment' | 'document'>('comment');

  html = computed((): SafeHtml => {
    const out = renderMarkdownToHtml(this.source());
    if (!out) return this.sanitizer.bypassSecurityTrustHtml('');
    return this.sanitizer.bypassSecurityTrustHtml(out);
  });
}
