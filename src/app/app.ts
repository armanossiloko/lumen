import { Component, HostListener, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';
import { PageView } from './components/page-view/page-view';
import {
  CommandPalette,
  CommentsPanel,
  PageActionsMenu,
  InboxPanel,
  BlockCommentModal,
} from './components/overlays/overlays';
import { ShareModal } from './components/overlays/share-modal.component';
import {
  HistoryModal,
  BacklinksModal,
  TrashPanel,
  TemplatesModal,
} from './components/overlays/aux-modals.component';
import { CreateNavigationModal } from './components/overlays/create-navigation-modal';
import { IconEditModal } from './components/icon-picker/icon-edit-modal';

import { DataService } from './services/data.service';
import { StateService } from './services/state.service';
import { ShareMember } from './services/api.service';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Header,
    Sidebar,
    PageView,
    CommandPalette,
    CommentsPanel,
    ShareModal,
    PageActionsMenu,
    InboxPanel,
    BlockCommentModal,
    CreateNavigationModal,
    IconEditModal,
    HistoryModal,
    BacklinksModal,
    TrashPanel,
    TemplatesModal,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class AppComponent {
  readonly Object = Object;

  shareMembersDraft: { userId: string; permission: string }[] = [];
  shareLinkDraft = false;

  constructor(
    public dataService: DataService,
    public state: StateService,
  ) {
    effect(() => {
      if (this.state.showShare()) {
        const pageId = this.state.currentId();
        void this.state.loadShareSettings(pageId);
      }
    });

    effect(() => {
      const s = this.state.shareSettings();
      if (s) {
        this.shareMembersDraft = [...(s.members ?? [])];
        this.shareLinkDraft = s.linkSharingEnabled;
      }
    });
  }

  currentPage = computed(() => this.state.currentPage());
  crumbLinkIds = computed(() => {
    const p = this.currentPage();
    return p.breadcrumb.map((_, i) => this.state.pageIdForBreadcrumbIndex(p.breadcrumb, i));
  });
  pageReactions = computed(() => this.state.reactions()[this.state.currentId()] || {});
  pageThread = computed(() => this.state.pageComments()[this.state.currentId()] || []);
  allPageIds = computed(() => {
    const ids = new Set([
      ...Object.keys(this.state.pages()),
      ...Object.keys(this.dataService.pages()),
    ]);
    const walk = (nodes: { id: string; kind: string; children?: unknown[] }[]) => {
      for (const n of nodes) {
        if (n.kind === 'page') ids.add(n.id);
        if (n.children?.length) walk(n.children as typeof nodes);
      }
    };
    walk(this.state.tree());
    return ids;
  });
  pageThreadComments = computed(() => this.state.blockCommentsForCurrentPage());

  /** Other users on this page right now (from SignalR / backend presence only). */
  viewers = computed(() => this.state.pageViewers());

  currentWorkspace = computed(() => {
    const wsId = this.state.currentWorkspaceId();
    const list = this.state.workspaces();
    return list.find((w) => w.id === wsId) ?? list[0] ?? this.dataService.workspaces()[0];
  });

  blockMap = computed(() => {
    const m: { [idx: number]: string } = {};
    const blocks = this.currentPage().blocks ?? [];
    blocks.forEach((b, i) => {
      let text = '';
      if (typeof b.text === 'string') text = b.text;
      else if (Array.isArray(b.text)) text = b.text.map((p) => p.t || '').join('');
      else if (b.items)
        text = Array.isArray(b.items)
          ? b.items
              .map((it) => (typeof it === 'string' ? it : String((it as { text?: string }).text ?? '')))
              .join(', ')
          : '';
      m[i] = text.slice(0, 60);
    });
    return m;
  });

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.state.showCmd.update((v) => !v);
    }
  }

  handleSelectPage(event: { id: string }) {
    this.state.selectPage(event.id);
  }

  handleBlocksChange(blocks: import('./models').Block[]) {
    this.state.updateCurrentPageBlocks(blocks);
  }

  handleTitleChange(title: string) {
    this.state.updateCurrentPageTitle(title.trim());
  }

  handlePaletteCreate(title: string) {
    this.state.openCreatePageFromPalette(title);
    this.state.showCmd.set(false);
  }

  handleWorkspaceChange(apiWsId: string) {
    this.state.switchWorkspace(apiWsId);
  }

  openShare() {
    this.state.showShare.set(true);
  }

  saveShare() {
    const pageId = this.state.currentId();
    this.state.saveShareSettings(pageId, this.shareMembersDraft, this.shareLinkDraft);
    this.state.showShare.set(false);
  }

  copyShareLink() {
    this.state.copyShareLink(this.state.currentId());
  }

  getUnresolvedCommentCount(): number {
    const comments = this.pageThreadComments();
    return Object.values(comments)
      .flat()
      .filter((c) => !c.resolved).length;
  }
}
