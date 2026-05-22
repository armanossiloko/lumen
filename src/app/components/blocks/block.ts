import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Block as IBlock, TextPart, TodoItem } from '../../models';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './block.html',
  styleUrls: ['./block.css']
})
export class Block {
  @Input() block!: IBlock;
  @Input() idx!: number;
  @Input() isFocused: boolean = false;
  @Input() commentCount: number = 0;
  /** Reference snapshot — block chrome editing disabled (e.g. pinned RFC demo page). */
  @Input() readOnly: boolean = false;
  
  @Output() onFocus = new EventEmitter<number>();
  @Output() onChange = new EventEmitter<{idx: number, block: IBlock}>();
  @Output() onAddAfter = new EventEmitter<number>();
  @Output() onDelete = new EventEmitter<number>();
  @Output() onPageLink = new EventEmitter<string>();
  @Output() onCommentClick = new EventEmitter<number>();
  
  hover = signal(false);
  
  constructor(private sanitizer: DomSanitizer) {}
  
  get showHandle() {
    return !this.readOnly && (this.hover() || this.isFocused);
  }
  
  get showPin() {
    return this.commentCount > 0;
  }

  /** Comment affordance on hover — allowed even when block body is read-only. */
  get showCommentAdd() {
    return !this.showPin && this.hover();
  }
  
  renderInline(parts: string | TextPart[] | undefined | null): SafeHtml {
    if (parts == null || parts === '') {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    if (typeof parts === 'string') {
      return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(parts));
    }
    if (!Array.isArray(parts) || parts.length === 0) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    let html = '';
    parts.forEach(p => {
      if (p.b) html += `<strong>${this.escapeHtml(p.t)}</strong>`;
      else if (p.i) html += `<em>${this.escapeHtml(p.t)}</em>`;
      else if (p.c) html += `<code class="inline-code">${this.escapeHtml(p.t)}</code>`;
      else if (p.l) html += `<a href="#" class="page-link" data-page-id="${this.escapeAttr(p.l)}">${this.escapeHtml(p.t)}</a>`;
      else html += `<span>${this.escapeHtml(p.t)}</span>`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeAttr(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  handleBodyClick(event: MouseEvent) {
    const anchor = (event.target as HTMLElement).closest('a.page-link');
    if (!anchor) return;
    event.preventDefault();
    const pageId = anchor.getAttribute('data-page-id');
    if (pageId && pageId !== '#') this.onPageLink.emit(pageId);
  }
  
  handleTextBlur(event: Event, field: string = 'text') {
    if (this.readOnly) return;
    const target = event.target as HTMLElement;
    const newBlock = { ...this.block, [field]: target.innerText };
    this.onChange.emit({ idx: this.idx, block: newBlock });
  }
  
  handleKeyDown(event: KeyboardEvent) {
    if (this.readOnly) return;
    if (event.key === 'Enter' && !event.shiftKey && 
        (this.block.type === 'h1' || this.block.type === 'h2' || this.block.type === 'h3')) {
      event.preventDefault();
      (event.target as HTMLElement).blur();
      this.onAddAfter.emit(this.idx);
    }
  }
  
  toggleTodo(itemIdx: number) {
    if (this.readOnly) return;
    if (this.block.type === 'todo' && this.block.items) {
      const items = this.block.items.map((item, i) => {
        if (i === itemIdx && typeof item === 'object') {
          return { ...item, done: !item.done };
        }
        return item;
      });
      this.onChange.emit({ idx: this.idx, block: { ...this.block, items } });
    }
  }
  
  copyCode() {
    if (this.block.type === 'code' && this.block.code) {
      navigator.clipboard?.writeText(this.block.code);
    }
  }
  
  highlightCode(code: string, lang: string): SafeHtml {
    const tokens = this.tokenize(code, lang);
    let html = '';
    tokens.forEach(t => {
      html += `<span class="${t.cls}">${this.escapeHtml(t.text)}</span>`;
    });
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
  
  private tokenize(code: string, lang: string): Array<{cls: string, text: string}> {
    const out: Array<{cls: string, text: string}> = [];
    const keywords: {[key: string]: RegExp} = {
      typescript: /\b(type|const|let|var|function|return|if|else|for|while|import|export|from|interface|class|extends|new|async|await|true|false|null|undefined|number|string|boolean)\b/,
      bash: /\b(cd|git|pnpm|npm|yarn|export|echo|ls|mkdir|sudo|brew|curl)\b/,
      sql: /\b(SELECT|FROM|WHERE|GROUP|BY|ORDER|JOIN|ON|AS|AND|OR|INSERT|UPDATE|DELETE|INTO|VALUES|CREATE|TABLE|INDEX|COUNT|INTERVAL|NOW)\b/i
    };
    const re = keywords[lang] || /^$/;
    const lines = code.split('\n');
    
    lines.forEach((line, li) => {
      let i = 0;
      while (i < line.length) {
        const rest = line.slice(i);
        // Comment
        const cm = rest.match(/^(\/\/|#|--).*/);
        if (cm) { out.push({ cls: 'tk-comment', text: cm[0] }); i += cm[0].length; continue; }
        // String
        const sm = rest.match(/^(['"`])(?:\\.|[^\\])*?\1/);
        if (sm) { out.push({ cls: 'tk-string', text: sm[0] }); i += sm[0].length; continue; }
        // Number
        const nm = rest.match(/^\b\d+(\.\d+)?\b/);
        if (nm) { out.push({ cls: 'tk-number', text: nm[0] }); i += nm[0].length; continue; }
        // Keyword
        const km = rest.match(re);
        if (km && km.index === 0) { out.push({ cls: 'tk-keyword', text: km[0] }); i += km[0].length; continue; }
        // Identifier
        const im = rest.match(/^[A-Za-z_$][\w$]*/);
        if (im) { out.push({ cls: 'tk-id', text: im[0] }); i += im[0].length; continue; }
        out.push({ cls: 'tk-plain', text: rest[0] }); i += 1;
      }
      if (li < lines.length - 1) out.push({ cls: 'tk-plain', text: '\n' });
    });
    
    return out;
  }
}
