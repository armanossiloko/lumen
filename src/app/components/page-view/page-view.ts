import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Block as BlockComponent } from '../blocks/block';
import { AvatarStack } from '../header/header';
import { MarkdownComposer } from '../markdown/markdown-composer';
import { MarkdownView } from '../markdown/markdown-view';
import { CommentReactions } from '../comment-reactions/comment-reactions';
import { PageCommentComposer } from '../page-comment-composer/page-comment-composer';
import { IconDisplay } from '../icon-picker/icon-display';
import { IconPicker } from '../icon-picker/icon-picker';
import { PageActionsMenu } from '../overlays/overlays';
import { Page, Block, Comment, CurrentUser } from '../../models';
import { singleLineTitle } from '../../navigation/tree-utils';

@Component({
  selector: 'app-page-view',
  standalone: true,
  imports: [
    CommonModule,
    BlockComponent,
    AvatarStack,
    MarkdownComposer,
    MarkdownView,
    CommentReactions,
    PageCommentComposer,
    IconDisplay,
    IconPicker,
    PageActionsMenu,
  ],
  templateUrl: './page-view.html',
  styles: [],
})
export class PageView implements OnChanges {
  @Input() page!: Page;
  @Input() blocks: Block[] = [];
  @Input() comments: { [key: string]: Comment[] } = {};
  @Input() focusBlockIdx: number | null = null;
  @Input() reactions: { [emoji: string]: string[] } = {};
  @Input() pageThread: Comment[] = [];
  @Input() pageWidth: string = 'regular';
  @Input() people: any = {};
  @Input() currentUser: CurrentUser | null = null;
  @Input() isFavorite = false;

  readonly Object = Object;

  @ViewChild('pageActionsRef') pageActionsRef?: ElementRef<HTMLElement>;
  @ViewChild('iconPickerRef') iconPickerRef?: ElementRef<HTMLElement>;

  @Output() onTitleChange = new EventEmitter<string>();
  @Output() onBlocksChange = new EventEmitter<Block[]>();
  @Output() onResolveComment = new EventEmitter<string>();
  @Output() onReplyComment = new EventEmitter<{ key: string; text: string }>();
  @Output() onAddComment = new EventEmitter<number>();
  @Output() onFocusBlock = new EventEmitter<number>();
  @Output() onReact = new EventEmitter<string>();
  @Output() onAddPageComment = new EventEmitter<string>();
  @Output() onReplyPageComment = new EventEmitter<{ commentId: string; text: string }>();
  @Output() onCommentReaction = new EventEmitter<{ commentId: string; emoji: string }>();
  @Output() onSelectPage = new EventEmitter<string>();
  @Output() onMarkdownBodySave = new EventEmitter<string>();
  @Output() onIconChange = new EventEmitter<string>();
  @Output() onBlockReorder = new EventEmitter<{ from: number; to: number }>();
  @Output() onPageAction = new EventEmitter<string>();

  showInsertMenu = signal<{ idx: number } | null>(null);
  iconPickerOpen = signal(false);
  pageActionsOpen = signal(false);
  reactionPickerOpen = signal(false);
  mdEditing = signal(false);
  dragBlockIdx = signal<number | null>(null);

  reactionPalette = ['👍', '❤️', '🎉', '🚀', '👀', '🌱', '🔥', '💯', '✅', '👋'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['page']) {
      this.mdEditing.set(false);
      this.pageActionsOpen.set(false);
      this.iconPickerOpen.set(false);
    }
  }

  usesMarkdownDoc(): boolean {
    return !!this.page?.markdownBody?.trim();
  }

  saveMarkdownEditor(raw: string) {
    this.onMarkdownBodySave.emit(raw.trim());
    this.mdEditing.set(false);
  }

  getCommentCount(idx: number): number {
    const key = this.page.id + '__' + idx;
    const list = this.comments[key] || [];
    let count = 0;
    for (const c of list) {
      if (!c.parentCommentId && !c.resolved) count++;
      for (const r of c.replies ?? []) {
        if (!r.resolved) count++;
      }
    }
    return count;
  }

  handleBlockChange(event: { idx: number; block: Block }) {
    const newBlocks = this.blocks.map((b, i) => (i === event.idx ? event.block : b));
    this.onBlocksChange.emit(newBlocks);
  }

  handleAddAfter(idx: number) {
    this.showInsertMenu.set({ idx });
  }

  handleDeleteBlock(idx: number) {
    const newBlocks = this.blocks.filter((_, i) => i !== idx);
    this.onBlocksChange.emit(newBlocks);
  }

  insertBlock(idx: number, type: Block['type']) {
    const newBlock = this.makeBlankBlock(type);
    const newBlocks = [...this.blocks.slice(0, idx + 1), newBlock, ...this.blocks.slice(idx + 1)];
    this.onBlocksChange.emit(newBlocks);
    this.showInsertMenu.set(null);
    setTimeout(() => this.onFocusBlock.emit(idx + 1), 30);
  }

  makeBlankBlock(type: Block['type']): Block {
    switch (type) {
      case 'h1':
        return { type: 'h1', text: 'Heading 1' };
      case 'h2':
        return { type: 'h2', text: 'Heading 2' };
      case 'h3':
        return { type: 'h3', text: 'Heading 3' };
      case 'p':
        return { type: 'p', text: [{ t: 'Type something…' }] };
      case 'ul':
        return { type: 'ul', items: ['Item one', 'Item two'] };
      case 'ol':
        return { type: 'ol', items: ['First', 'Second'] };
      case 'todo':
        return {
          type: 'todo',
          items: [
            { done: false, text: 'Task one' },
            { done: false, text: 'Task two' },
          ],
        };
      case 'callout':
        return { type: 'callout', tone: 'info', text: 'Add a note here.' };
      case 'code':
        return { type: 'code', lang: 'typescript', code: 'const x = 1;' };
      case 'quote':
        return { type: 'quote', text: 'A quote.' };
      case 'divider':
        return { type: 'divider' };
      case 'image':
        return { type: 'image', caption: 'Image caption', placeholder: 'IMAGE' };
      case 'video':
        return { type: 'video', caption: 'Video caption' };
      case 'table':
        return {
          type: 'table',
          headers: ['Column A', 'Column B', 'Column C'],
          rows: [
            ['—', '—', '—'],
            ['—', '—', '—'],
          ],
        };
      default:
        return { type: 'p', text: [{ t: '' }] };
    }
  }

  handleTitleBlur(event: Event) {
    const target = event.target as HTMLElement;
    const title = singleLineTitle(target.innerText);
    if (target.innerText !== title) {
      target.innerText = title;
    }
    if (title && title !== this.page.title) {
      this.onTitleChange.emit(title);
    }
  }

  handleTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      (event.target as HTMLElement).blur();
    }
  }

  handleTitleInput(event: Event) {
    const target = event.target as HTMLElement;
    if (!/[\r\n]/.test(target.innerText)) return;
    const title = singleLineTitle(target.innerText);
    target.innerText = title;
    this.placeCaretAtEnd(target);
  }

  private placeCaretAtEnd(el: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  handleBlockDragStart(idx: number) {
    this.dragBlockIdx.set(idx);
  }

  handleBlockDragOver(event: DragEvent, idx: number) {
    event.preventDefault();
  }

  handleBlockDrop(idx: number) {
    const from = this.dragBlockIdx();
    if (from != null && from !== idx) {
      this.onBlockReorder.emit({ from, to: idx });
    }
    this.dragBlockIdx.set(null);
  }

  handleBlockDragEnd() {
    this.dragBlockIdx.set(null);
  }

  handleReactClick(emoji: string) {
    this.onReact.emit(emoji);
    this.reactionPickerOpen.set(false);
  }

  getReactionUsers(emoji: string): string[] {
    return this.reactions[emoji] || [];
  }

  isMyReaction(emoji: string): boolean {
    const uid = this.currentUser?.userId;
    return uid ? this.getReactionUsers(emoji).includes(uid) : false;
  }

  currentUserColor(): string {
    return this.currentUser?.color ?? 'var(--accent)';
  }

  currentUserInitial(): string {
    return this.currentUser?.initial ?? '?';
  }

  getPerson(id: string) {
    return this.people[id] || { name: id, color: '#888' };
  }

  togglePageActions(event: Event) {
    event.stopPropagation();
    this.iconPickerOpen.set(false);
    this.pageActionsOpen.update((open) => !open);
  }

  handlePageAction(action: string) {
    this.pageActionsOpen.set(false);
    this.onPageAction.emit(action);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as Node;
    if (this.pageActionsOpen()) {
      const el = this.pageActionsRef?.nativeElement;
      if (el && !el.contains(target)) {
        this.pageActionsOpen.set(false);
      }
    }
    if (this.iconPickerOpen()) {
      const el = this.iconPickerRef?.nativeElement;
      if (el && !el.contains(target)) {
        this.iconPickerOpen.set(false);
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.pageActionsOpen.set(false);
    this.iconPickerOpen.set(false);
  }
}
