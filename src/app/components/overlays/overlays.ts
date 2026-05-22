import {
  Component,
  Input,
  input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Avatar } from '../header/header';
import { MarkdownView } from '../markdown/markdown-view';
import { CommentReactions } from '../comment-reactions/comment-reactions';
import { PageCommentComposer } from '../page-comment-composer/page-comment-composer';
import { Page, Comment, InboxItem } from '../../models';
import { IconDisplay } from '../icon-picker/icon-display';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, IconDisplay],
  template: `
    @if (open) {
      <div class="cmd-overlay" (click)="onClose.emit()">
        <div class="cmd" (click)="$event.stopPropagation()">
          <div class="cmd-input-wrap">
            <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <input 
              #searchInput
              class="cmd-input" 
              placeholder="Search pages or run a command…" 
              [ngModel]="query()"
              (ngModelChange)="query.set($event); idx.set(0)"
              (keydown)="handleKeyDown($event)"
            />
            <kbd class="kbd kbd-esc">esc</kbd>
          </div>
          <div class="cmd-list">
            @for (item of filteredItems(); track item.id; let i = $index) {
              <button 
                [class]="'cmd-item' + (i === idx() ? ' is-active' : '')" 
                (mouseenter)="idx.set(i)"
                (click)="handleSelect(item)"
              >
                @if (item.kind === 'page') {
                  <app-icon-display [icon]="item.icon" [size]="16" klass="cmd-item-icon" />
                } @else {
                  <span class="cmd-item-icon">{{ item.icon }}</span>
                }
                <span class="cmd-item-title">{{item.title}}</span>
                @if (item.sub) {
                  <span class="cmd-item-sub">{{item.sub}}</span>
                }
                <span class="cmd-item-hint">{{item.hint}}</span>
              </button>
            }
            @if (filteredItems().length === 0) {
              <div class="cmd-empty">No matches.</div>
            }
          </div>
          <div class="cmd-foot">
            <span><kbd class="kbd">↑↓</kbd> Navigate</span>
            <span><kbd class="kbd">↵</kbd> Open</span>
            <span><kbd class="kbd">esc</kbd> Close</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: []
})
export class CommandPalette {
  @Input() open = false;
  @Input() pages: { [key: string]: Page } = {};
  @Input() movePageId: string | null = null;
  @Input() tree: import('../../models').TreeNode[] = [];
  
  @Output() onClose = new EventEmitter<void>();
  @Output() onSelect = new EventEmitter<string>();
  @Output() onCreatePage = new EventEmitter<string>();
  @Output() onTodayNotes = new EventEmitter<void>();
  @Output() onBrowseTemplates = new EventEmitter<void>();
  @Output() onMoveTarget = new EventEmitter<string>();
  
  query = signal('');
  idx = signal(0);

  private flattenMoveTargets(nodes: import('../../models').TreeNode[], depth = 0): Array<{
    kind: 'target';
    id: string;
    title: string;
    sub: string;
    icon: string;
    hint: string;
  }> {
    const out: Array<{ kind: 'target'; id: string; title: string; sub: string; icon: string; hint: string }> = [];
    for (const n of nodes) {
      if (n.id === this.movePageId) continue;
      if (n.kind === 'workspace' || n.kind === 'folder' || n.kind === 'page') {
        out.push({
          kind: 'target',
          id: n.id,
          title: n.title,
          sub: ' '.repeat(depth * 2) + (n.kind === 'workspace' ? 'Workspace' : n.kind),
          icon: n.icon ?? (n.kind === 'folder' ? '📁' : '📄'),
          hint: 'Move here',
        });
      }
      if (n.children?.length) out.push(...this.flattenMoveTargets(n.children, depth + 1));
    }
    return out;
  }
  
  filteredItems = computed(() => {
    if (this.movePageId) {
      const targets = this.flattenMoveTargets(this.tree);
      const filtered = this.query()
        ? targets.filter((it) => it.title.toLowerCase().includes(this.query().toLowerCase()))
        : targets;
      return filtered.slice(0, 12);
    }

    const all = Object.values(this.pages).map(p => ({
      kind: 'page' as const,
      id: p.id,
      title: p.title,
      sub: p.breadcrumb.slice(0, -1).join(' / '),
      icon: p.icon,
      hint: 'Jump to'
    }));
    
    const filtered = this.query() 
      ? all.filter(it => (it.title + ' ' + it.sub).toLowerCase().includes(this.query().toLowerCase())) 
      : all;
    
    const actions = this.query() 
      ? [{ kind: 'action' as const, id: 'create', title: 'Create new page "' + this.query() + '"', icon: '+', hint: 'New', sub: '' }]
      : [
        { kind: 'action' as const, id: 'today', title: "Open today's notes", icon: '📅', hint: 'Action', sub: '' },
        { kind: 'action' as const, id: 'templates', title: 'Browse templates', icon: '▦', hint: 'Action', sub: '' }
      ];
    
    return [...actions, ...filtered.slice(0, 8)];
  });
  
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onClose.emit();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.idx.set(Math.min(this.filteredItems().length - 1, this.idx() + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.idx.set(Math.max(0, this.idx() - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.filteredItems()[this.idx()];
      if (item) this.handleSelect(item);
    }
  }
  
  handleSelect(item: { kind: string; id: string }) {
    if (this.movePageId) {
      this.onMoveTarget.emit(item.id);
    } else if (item.kind === 'page') {
      this.onSelect.emit(item.id);
    } else if (item.id === 'create') {
      this.onCreatePage.emit(this.query());
    } else if (item.id === 'today') {
      this.onTodayNotes.emit();
    } else if (item.id === 'templates') {
      this.onBrowseTemplates.emit();
    }
    this.onClose.emit();
  }
}

@Component({
  selector: 'app-comments-panel',
  standalone: true,
  imports: [CommonModule, Avatar, MarkdownView, CommentReactions, PageCommentComposer],
  template: `
    @if (open()) {
      <aside class="cmt-panel">
        <div class="cmt-hd">
          <div class="cmt-hd-title">Comments</div>
          <button class="hd-icon-btn" (click)="onClose.emit()" title="Close">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div class="cmt-tabs">
          @for (f of ['open', 'resolved', 'all']; track f) {
            <button [class]="'cmt-tab' + (filter() === f ? ' is-active' : '')" (click)="filter.set(f)">{{f}}</button>
          }
        </div>
        <div class="cmt-list">
          @if (filteredList().length === 0) {
            <div class="cmt-empty">No {{filter()}} comments yet.</div>
          }
          @for (thread of filteredList(); track thread.key) {
            <div class="cmt-thread" (click)="onJump.emit(thread.blockIdx)">
              <div class="cmt-thread-anchor">{{thread.blockSnippet || 'Block ' + (thread.blockIdx + 1)}}</div>
              @for (comment of thread.comments; track comment.id) {
                <div class="cmt-item">
                  <app-avatar [initial]="comment.author[0]" [color]="getPerson(comment.author).color" [size]="20" />
                  <div class="cmt-body">
                    <div class="cmt-meta"><strong>{{getPerson(comment.author).name}}</strong> <span class="cmt-time">{{comment.at}}</span></div>
                    <div class="cmt-text cmt-text--md">
                      <app-markdown-view [source]="comment.text" />
                    </div>
                    <app-comment-reactions
                      [reactions]="comment.reactions"
                      (toggleEmoji)="onCommentReaction.emit({ commentId: comment.id, emoji: $event })"
                    />
                    @if (comment.replies?.length) {
                      @for (reply of comment.replies; track reply.id) {
                        <div class="cmt-item cmt-item--reply">
                          <app-avatar [initial]="reply.author[0]" [color]="getPerson(reply.author).color" [size]="18" />
                          <div class="cmt-body">
                            <div class="cmt-meta"><strong>{{getPerson(reply.author).name}}</strong> <span class="cmt-time">{{reply.at}}</span></div>
                            <div class="cmt-text cmt-text--md">
                              <app-markdown-view [source]="reply.text" />
                            </div>
                            <app-comment-reactions
                              [reactions]="reply.reactions"
                              (toggleEmoji)="onCommentReaction.emit({ commentId: reply.id, emoji: $event })"
                            />
                          </div>
                        </div>
                      }
                    }
                  </div>
                </div>
              }
              <div class="cmt-actions">
                <button class="cmt-act" (click)="$event.stopPropagation(); onResolve.emit(thread.key)">
                  {{thread.resolved ? 'Reopen' : '✓ Resolve'}}
                </button>
                <button class="cmt-act" (click)="$event.stopPropagation(); onJump.emit(thread.blockIdx)">View in page</button>
                @if (thread.comments[0]; as root) {
                  <button class="cmt-act cmt-act--danger" (click)="$event.stopPropagation(); onDelete.emit({ commentId: root.id, threadKey: thread.key })">Delete</button>
                }
              </div>
              <div class="cmt-composer-row" (click)="$event.stopPropagation()">
                <app-avatar initial="M" color="#ec4899" [size]="20" />
                <app-page-comment-composer
                  placeholder="Reply…"
                  submitLabel="Reply"
                  (submitted)="emitBlockReply(thread.key, $event)"
                />
              </div>
            </div>
          }
        </div>
      </aside>
    }
  `,
  styles: []
})
export class CommentsPanel {
  open = input(false);
  threads = input<{ [key: string]: Comment[] }>({});
  page = input.required<Page>();
  blockMap = input<{ [idx: number]: string }>({});
  people = input<Record<string, { name: string; color: string }>>({});
  
  @Output() onClose = new EventEmitter<void>();
  @Output() onResolve = new EventEmitter<string>();
  @Output() onReply = new EventEmitter<{ key: string; text: string; parentCommentId?: string }>();
  @Output() onJump = new EventEmitter<number>();
  @Output() onCommentReaction = new EventEmitter<{ commentId: string; emoji: string }>();
  @Output() onDelete = new EventEmitter<{ commentId: string; threadKey: string }>();

  filter = signal('open');
  
  filteredList = computed(() => {
    const snippets = this.blockMap();
    return Object.entries(this.threads()).map(([key, comments]) => {
      const blockIdx = parseInt(key.split('__')[1], 10);
      return {
        key,
        comments,
        blockIdx,
        blockSnippet: snippets[blockIdx] || '',
        resolved: comments.every((c) => c.resolved),
      };
    }).filter((t) =>
      this.filter() === 'all' ? true : this.filter() === 'resolved' ? t.resolved : !t.resolved,
    );
  });
  
  getPerson(id: string) {
    return this.people()[id] || { name: id, color: '#888' };
  }
  
  emitBlockReply(key: string, text: string) {
    const thread = this.threads()[key] ?? [];
    const parentCommentId = thread.length > 0 ? thread[thread.length - 1].id : undefined;
    this.onReply.emit({ key, text, parentCommentId });
  }
}

export { ShareModal } from './share-modal.component';

@Component({
  selector: 'app-page-actions-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="actions-overlay" (click)="onClose.emit()">
        <div class="actions-menu" (click)="$event.stopPropagation()">
          <div class="actions-section">Page</div>
          <button class="actions-item" (click)="onAction.emit('favorite')"><span>⭐</span> {{ isFavorite ? 'Remove from favorites' : 'Add to favorites' }}</button>
          <button class="actions-item" (click)="onAction.emit('duplicate')"><span>⎘</span> Duplicate</button>
          <button class="actions-item" (click)="onAction.emit('move')"><span>↗</span> Move to…</button>
          <button class="actions-item" (click)="onAction.emit('export')"><span>↓</span> Export as PDF</button>
          <div class="actions-divider"></div>
          <div class="actions-section">View</div>
          <button class="actions-item" (click)="onAction.emit('history')"><span>⟲</span> Page history</button>
          <button class="actions-item" (click)="onAction.emit('backlinks')"><span>↺</span> Backlinks</button>
          <div class="actions-divider"></div>
          <button class="actions-item actions-item--danger" (click)="onAction.emit('delete')"><span>🗑</span> Move to trash</button>
        </div>
      </div>
    }
  `,
  styles: []
})
export class PageActionsMenu {
  @Input() open = false;
  @Input() isFavorite = false;

  @Output() onClose = new EventEmitter<void>();
  @Output() onAction = new EventEmitter<string>();
}

@Component({
  selector: 'app-inbox-panel',
  standalone: true,
  imports: [CommonModule, Avatar],
  template: `
    @if (open) {
      <div class="inbox-overlay" (click)="onClose.emit()">
        <div class="inbox" (click)="$event.stopPropagation()">
          <div class="inbox-hd">
            <div class="inbox-title">Inbox</div>
            <button class="btn btn-ghost btn-sm" (click)="markAllRead()">Mark all read</button>
          </div>
          <div class="inbox-list">
            @for (item of items; track item.id) {
              <button 
                [class]="'inbox-item' + (item.unread ? ' is-unread' : '')" 
                (click)="handleJump(item)"
              >
                @if (item.unread) {
                  <span class="inbox-dot"></span>
                }
                <app-avatar [initial]="item.author[0]" [color]="getPerson(item.author).color" [size]="28" />
                <div class="inbox-meta">
                  <div class="inbox-line">
                    <strong>{{getPerson(item.author).name}}</strong> {{item.verb}} <em>{{item.pageTitle}}</em>
                  </div>
                  <div class="inbox-snippet">{{item.snippet}}</div>
                  <div class="inbox-time">{{item.at}}</div>
                </div>
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: []
})
export class InboxPanel {
  @Input() open = false;
  @Input() items: InboxItem[] = [];
  @Input() people: any = {};
  
  @Output() onClose = new EventEmitter<void>();
  @Output() onMarkRead = new EventEmitter<string>();
  @Output() onJump = new EventEmitter<string>();
  @Output() onMarkAllRead = new EventEmitter<void>();

  getPerson(id: string) {
    return this.people[id] || { name: id, color: '#888' };
  }

  markAllRead() {
    this.onMarkAllRead.emit();
  }
  
  handleJump(item: InboxItem) {
    this.onJump.emit(item.pageId);
    this.onMarkRead.emit(item.id);
    this.onClose.emit();
  }
}

@Component({
  selector: 'app-block-comment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (blockIdx != null) {
      <div class="block-cmt-overlay" (click)="cancel.emit()" role="presentation">
        <div class="block-cmt-dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="block-cmt-title">
          <div class="block-cmt-hd">
            <span id="block-cmt-title" class="block-cmt-title">Comment on block</span>
            <button type="button" class="block-cmt-x" (click)="cancel.emit()" aria-label="Close">×</button>
          </div>
          <p class="block-cmt-sub">Side comment on block {{ blockIdx + 1 }} · shows in the comments panel</p>
          <textarea
            #bodyEl
            class="block-cmt-input"
            rows="5"
            placeholder="Write your comment…"
            [ngModel]="draft()"
            (ngModelChange)="draft.set($event)"
            (keydown)="onKeydown($event)"
          ></textarea>
          <div class="block-cmt-foot">
            <span class="block-cmt-hint">Ctrl+Enter or ⌘+Enter to send · Esc to close</span>
            <div class="block-cmt-actions">
              <button type="button" class="btn btn-ghost" (click)="cancel.emit()">Cancel</button>
              <button type="button" class="btn btn-primary" [disabled]="!draft().trim()" (click)="confirm()">Add comment</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [],
})
export class BlockCommentModal implements OnChanges {
  /** Active block index, or null when closed. */
  @Input() blockIdx: number | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() submitComment = new EventEmitter<string>();

  draft = signal('');
  private submitting = false;

  @ViewChild('bodyEl') private bodyEl?: ElementRef<HTMLTextAreaElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['blockIdx'] && this.blockIdx !== null && this.blockIdx !== undefined) {
      this.draft.set('');
      queueMicrotask(() => this.bodyEl?.nativeElement?.focus());
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel.emit();
      return;
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.confirm();
    }
  }

  confirm(): void {
    if (this.submitting) return;
    const t = this.draft().trim();
    if (!t) return;
    this.submitting = true;
    this.submitComment.emit(t);
    this.draft.set('');
    queueMicrotask(() => {
      this.submitting = false;
    });
  }
}
