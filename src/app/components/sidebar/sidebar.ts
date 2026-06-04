import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeNode as ITreeNode, Workspace, Page } from '../../models';
import { findTreeNode, prepareNavigationTree } from '../../navigation/tree-utils';
import { IconDisplay } from '../icon-picker/icon-display';

@Component({
  selector: 'app-workspace-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ws-switcher" #switcherRef>
      <button class="ws-btn" (click)="open.set(!open())">
        <span class="ws-avatar" [style.background]="current.color">{{current.initial}}</span>
        <span class="ws-name">{{current.name}}</span>
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      @if (open()) {
        <div class="ws-dropdown">
          <div class="ws-dd-section">Workspaces</div>
          @for (w of workspaces; track w.id) {
            <button 
              [class]="'ws-dd-item' + (w.id === current.id ? ' is-current' : '')" 
              (click)="onChange.emit(w.id); open.set(false)"
            >
              <span class="ws-avatar" [style.background]="w.color">{{w.initial}}</span>
              <div class="ws-dd-meta">
                <div class="ws-dd-name">{{w.name}}</div>
                <div class="ws-dd-sub">{{w.members}} members</div>
              </div>
              @if (w.id === current.id) {
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.5L5 9l4.5-5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </button>
          }
          <div class="ws-dd-divider"></div>
          <button class="ws-dd-item ws-dd-item--quiet" (click)="promptCreate()">
            <span class="ws-avatar" style="background: transparent; border: 1px dashed var(--border)">+</span>
            <div class="ws-dd-meta"><div class="ws-dd-name">Create workspace</div></div>
          </button>
        </div>
      }
    </div>
  `,
  styles: []
})
export class WorkspaceSwitcher {
  @Input() current!: Workspace;
  @Input() workspaces: Workspace[] = [];
  @Output() onChange = new EventEmitter<string>();
  @Output() onCreateWorkspace = new EventEmitter<string>();
  
  open = signal(false);

  promptCreate() {
    const name = window.prompt('Workspace name');
    if (name?.trim()) {
      this.onCreateWorkspace.emit(name.trim());
      this.open.set(false);
    }
  }
}

@Component({
  selector: 'app-tree-node',
  standalone: true,
  imports: [CommonModule, FormsModule, IconDisplay],
  template: `
    <div>
      <div
        [class]="'tree-row' + (isCurrent ? ' is-current' : '') + (isAncestor ? ' is-ancestor' : '') + (isDragOver ? ' is-drag-over' : '') + (opensAsPage ? ' tree-row--page' : '') + (!opensAsPage && node.kind === 'folder' ? ' tree-row--folder' : '')"
        [style.paddingLeft.px]="8 + depth * 14"
        [draggable]="node.kind !== 'workspace'"
        (dragstart)="onDragStart.emit(node.id)"
        (dragover)="$event.preventDefault(); onDragOver.emit(node.id)"
        (drop)="$event.preventDefault(); $event.stopPropagation(); onDrop.emit(node.id)"
        (mouseenter)="hover.set(true)"
        (mouseleave)="hover.set(false)"
      >
        @if (hasChildren) {
          <button
            type="button"
            class="tree-chev"
            [attr.aria-expanded]="isOpen"
            [attr.aria-label]="chevronLabel"
            [title]="chevronLabel"
            (click)="onChevronPointer($event)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" [style.transform]="isOpen ? 'rotate(90deg)' : 'rotate(0deg)'" [style.transition]="'transform .12s'">
              <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        } @else {
          <span class="tree-chev-spacer" aria-hidden="true"></span>
        }
        @if (renaming()) {
          <div class="tree-body tree-body--renaming">
            <app-icon-display [icon]="node.icon" [size]="14" klass="tree-icon" />
            <input
              type="text"
              class="tree-rename-input"
              [(ngModel)]="renameDraft"
              (click)="$event.stopPropagation()"
              (dblclick)="$event.stopPropagation()"
              (keydown)="onRenameKeydown($event)"
              (blur)="onRenameBlur()"
              autofocus
            />
          </div>
        } @else {
          <div
            class="tree-body"
            [class.tree-body--page]="opensAsPage"
            [class.tree-body--folder]="!opensAsPage && node.kind === 'folder'"
            [attr.title]="bodyTooltip"
            role="button"
            tabindex="0"
            (click)="onBodyClick($event)"
            (keydown)="onBodyKeydown($event)"
          >
            <app-icon-display [icon]="node.icon" [size]="14" klass="tree-icon" />
            <span class="tree-label" (dblclick)="beginRename($event)">{{ node.title }}</span>
          </div>
        }
        @if (hover() && node.kind !== 'workspace' && !renaming()) {
          <span class="tree-actions" (click)="$event.stopPropagation()">
            <button class="tree-act" title="Change icon" (click)="$event.stopPropagation(); onChangeIcon.emit({ id: node.id, kind: node.kind === 'folder' ? 'folder' : 'page', icon: node.icon ?? '', title: node.title })">
              <span aria-hidden="true">🎨</span>
            </button>
            <button class="tree-act" title="Add page" (click)="$event.stopPropagation(); onAddPageInTree.emit({ parentId: node.id, parentTitle: node.title })">
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </button>
            <button class="tree-act" title="Add folder" (click)="$event.stopPropagation(); onAddFolderInTree.emit({ parentId: node.id, parentTitle: node.title })">
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 4.5h2l1-1h5v7H3v-6z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/></svg>
            </button>
          </span>
        }
      </div>
      @if (isOpen && hasChildren) {
        <div>
          @for (child of node.children; track child.id) {
            <app-tree-node
              [node]="child"
              [depth]="depth + 1"
              [currentId]="currentId"
              [expanded]="expanded"
              [ancestorIds]="ancestorIds"
              [dragOverId]="dragOverId"
              [pageIds]="pageIds"
              (onSelect)="onSelect.emit($event)"
              (expandOnly)="expandOnly.emit($event)"
              (toggleExpand)="toggleExpand.emit($event)"
              (onAddPageInTree)="onAddPageInTree.emit($event)"
              (onAddFolderInTree)="onAddFolderInTree.emit($event)"
              (renamePageConfirm)="renamePageConfirm.emit($event)"
              (onDragStart)="onDragStart.emit($event)"
              (onDragOver)="onDragOver.emit($event)"
              (onDrop)="onDrop.emit($event)"
              (onChangeIcon)="onChangeIcon.emit($event)"
            />
          }
        </div>
      }
    </div>
  `,
  styles: []
})
export class TreeNode {
  @Input() node!: ITreeNode;
  @Input() depth: number = 0;
  @Input() currentId!: string;
  @Input() expanded: { [key: string]: boolean } = {};
  @Input() dragOverId: string | null = null;
  /** IDs of tree nodes on the path to the open page (parents of currentId). */
  @Input() ancestorIds: ReadonlySet<string> = new Set();
  /** Page ids from the catalog — nodes with a page always open on label click. */
  @Input() pageIds: ReadonlySet<string> = new Set();
  
  @Output() onSelect = new EventEmitter<string>();
  @Output() expandOnly = new EventEmitter<string>();
  @Output() toggleExpand = new EventEmitter<string>();
  @Output() onAddPageInTree = new EventEmitter<{ parentId: string; parentTitle: string }>();
  @Output() onAddFolderInTree = new EventEmitter<{ parentId: string; parentTitle: string }>();
  @Output() renamePageConfirm = new EventEmitter<{ id: string; title: string }>();
  @Output() onDragStart = new EventEmitter<string>();
  @Output() onDragOver = new EventEmitter<string>();
  @Output() onDrop = new EventEmitter<string>();
  @Output() onChangeIcon = new EventEmitter<{
    id: string;
    kind: 'page' | 'folder';
    icon: string;
    title: string;
  }>();

  hover = signal(false);
  renaming = signal(false);
  renameDraft = '';

  beginRename(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.node.kind !== 'page') return;
    this.renameDraft = this.node.title;
    this.renaming.set(true);
  }

  onRenameBlur() {
    if (!this.renaming()) return;
    const t = this.renameDraft.trim();
    this.renaming.set(false);
    if (!t || t === this.node.title) return;
    this.renamePageConfirm.emit({ id: this.node.id, title: t });
  }

  onRenameKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      this.renaming.set(false);
      return;
    }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      (ev.target as HTMLInputElement).blur();
    }
  }

  get isOpen() {
    return this.expanded[this.node.id];
  }
  
  get isCurrent() {
    return this.node.id === this.currentId;
  }
  
  get hasChildren() {
    return this.node.children && this.node.children.length > 0;
  }
  
  get isDragOver() {
    return this.dragOverId === this.node.id;
  }

  get isAncestor() {
    return !this.isCurrent && this.ancestorIds.has(this.node.id);
  }

  get chevronLabel(): string {
    const verb = this.isOpen ? 'Collapse' : 'Expand';
    return `${verb} ${this.node.title}`;
  }

  get opensAsPage(): boolean {
    if (this.node.kind === 'workspace') return false;
    // Hub pages (e.g. Engineering) may be mis-tagged as folder in a stale API tree.
    if (this.pageIds.has(this.node.id)) return true;
    if (this.node.kind === 'folder') return false;
    return this.node.kind === 'page';
  }

  get bodyTooltip(): string | undefined {
    if (this.opensAsPage) {
      const hint = 'Double-click title to rename.';
      if (this.hasChildren) {
        return `Open “${this.node.title}”. Use the arrow only to show or hide nested pages. ${hint}`;
      }
      return `Open “${this.node.title}”. ${hint}`;
    }
    if (this.node.kind === 'folder') {
      return `“${this.node.title}” is a sidebar section (no page). Click to expand or collapse; use the arrow for the same.`;
    }
    return undefined;
  }

  onBodyClick(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.renaming()) return;
    if (this.opensAsPage) {
      this.onSelect.emit(this.node.id);
      if (this.hasChildren) {
        this.expandOnly.emit(this.node.id);
      }
      return;
    }
    if (this.node.kind === 'folder' && this.hasChildren) {
      this.toggleExpand.emit(this.node.id);
    }
  }

  onBodyKeydown(ev: KeyboardEvent) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    this.onBodyClick(ev as unknown as MouseEvent);
  }

  onChevronPointer(ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.hasChildren) {
      this.toggleExpand.emit(this.node.id);
    }
  }
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, WorkspaceSwitcher, TreeNode],
  templateUrl: './sidebar.html',
  styles: []
})
export class Sidebar implements OnChanges {
  @Input() tree: ITreeNode[] = [];
  @Input() pageIds: ReadonlySet<string> = new Set();
  @Input() currentId!: string;
  @Input() unreadCount: number = 0;
  @Input() workspaces: Workspace[] = [];
  @Input() currentWorkspace!: Workspace;
  @Input() expandHintId: string | null = null;
  @Input() storagePercent = 0;
  @Input() storageText = '';
  @Input() favoritePages: Page[] = [];
  @Input() recentPages: Page[] = [];

  /** Recent pages list — collapsed by default to save sidebar space. */
  recentExpanded = signal(false);

  readonly Date = Date;

  /** Parent nodes of the open page — same trail as breadcrumbs (minus workspace header). */
  private ancestorIdSet = new Set<string>();

  @Output() onSelect = new EventEmitter<{ id: string; opts?: any }>();
  @Output() onTreeChange = new EventEmitter<ITreeNode[]>();
  @Output() onOpenSearch = new EventEmitter<void>();
  @Output() onOpenInbox = new EventEmitter<void>();
  @Output() onOpenCreatePage = new EventEmitter<{ parentId: string; parentTitle: string }>();
  @Output() onOpenCreateFolder = new EventEmitter<{ parentId: string; parentTitle: string }>();
  @Output() renamePageConfirm = new EventEmitter<{ id: string; title: string }>();
  @Output() treeReorder = new EventEmitter<{ dragId: string; targetId: string }>();
  @Output() workspaceChange = new EventEmitter<string>();
  @Output() workspaceCreate = new EventEmitter<string>();
  @Output() openTrash = new EventEmitter<void>();
  @Output() changeIcon = new EventEmitter<{
    id: string;
    kind: 'page' | 'folder';
    icon: string;
    title: string;
  }>();

  expanded = signal<{ [key: string]: boolean }>({
    "workspace-acme": true, 
    "private": true,
    "engineering": true, 
    "product": true, 
    "handbook": true,
    "drafts": true, 
    "engineering/rfcs": true, 
    "engineering/runbooks": false
  });
  
  draggingId: string | null = null;
  dragOverId: string | null = null;

  get ancestorIds(): ReadonlySet<string> {
    return this.ancestorIdSet;
  }

  /** Always repair orphan roots / mis-tagged hub pages before rendering. */
  get displayTree(): ITreeNode[] {
    return prepareNavigationTree(this.tree, this.pageIds);
  }

  get primaryWorkspace(): ITreeNode | undefined {
    return this.displayTree.find((n) => n.kind === 'workspace') ?? this.displayTree[0];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['expandHintId']?.currentValue) {
      const id = changes['expandHintId'].currentValue as string;
      this.expanded.update((e) => ({ ...e, [id]: true }));
    }
    const currentIdChanged =
      !!changes['currentId'] &&
      changes['currentId'].currentValue !== changes['currentId'].previousValue;
    const treeFirstLoad =
      !!changes['tree'] &&
      (changes['tree'].previousValue as ITreeNode[] | undefined)?.length === 0 &&
      (changes['tree'].currentValue as ITreeNode[])?.length > 0;
    // Only auto-expand on navigation / initial load — not on every tree patch (would undo manual collapse).
    if (currentIdChanged || treeFirstLoad) {
      this.syncPathToCurrentPage();
    }
  }

  /** Walk the tree to find ids from root to current page; expand parents and record ancestors. */
  private findPathIds(nodes: ITreeNode[] | undefined, targetId: string): string[] | null {
    if (!nodes?.length) return null;
    for (const n of nodes) {
      if (n.id === targetId) return [n.id];
      if (n.children?.length) {
        const sub = this.findPathIds(n.children, targetId);
        if (sub) return [n.id, ...sub];
      }
    }
    return null;
  }

  private syncPathToCurrentPage(): void {
    this.ancestorIdSet.clear();
    if (!this.currentId || !this.displayTree.length) return;

    const path = this.findPathIds(this.displayTree, this.currentId);
    if (!path?.length) return;

    const parents = path.slice(0, -1);
    parents.forEach((id) => this.ancestorIdSet.add(id));

    this.expanded.update((e) => {
      const next = { ...e };
      for (const id of parents) {
        next[id] = true;
      }
      return next;
    });
  }

  handleTreeSelect(id: string) {
    this.onSelect.emit({ id });
    this.ensureExpanded(id);
  }

  ensureExpanded(id: string) {
    const node = findTreeNode(this.displayTree, id);
    if (node?.children?.length) {
      this.expanded.update((e) => ({ ...e, [id]: true }));
    }
  }

  /** Workspace name lives in the switcher — section headers must not imply a page parent. */
  sectionLabel(root: ITreeNode): string {
    if (root.kind === 'workspace') {
      return root.id === 'private' ? 'Private' : 'Pages';
    }
    return root.title;
  }

  toggleExpand(id: string) {
    this.expanded.update(e => ({ ...e, [id]: !e[id] }));
  }

  toggleRecent(): void {
    this.recentExpanded.update((open) => !open);
  }

  handleDrop(targetId: string) {
    if (!this.draggingId || this.draggingId === targetId) {
      this.draggingId = null;
      this.dragOverId = null;
      return;
    }
    this.treeReorder.emit({ dragId: this.draggingId, targetId });
    this.draggingId = null;
    this.dragOverId = null;
  }
}
