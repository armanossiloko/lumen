import { Injectable, computed, signal, effect, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Comment, InboxItem, TweakDefaults, Page, TreeNode, Block } from '../models';
import {
  breadcrumbForNewPage,
  collectTreeIds,
  findNodePath,
  findTreeNode,
  insertTreeChild,
  moveTreeNode,
  prepareNavigationTree,
  removeTreeNodeById,
  removeTreeNode,
  renameTreeNodeTitle,
  singleLineTitle,
  stripWorkspaceBreadcrumbPrefix,
  uniqueChildId,
  updateTreeNodeIcon,
} from '../navigation/tree-utils';
import type { IconEditContext } from '../components/icon-picker/icon-edit-modal';
import { apiWorkspaceId, treeWorkspaceId } from '../navigation/workspace-utils';
import { ApiService, ShareMember, ShareSettings, PageTemplate } from './api.service';
import type { AuthSession, CurrentUser, Person } from '../models';
import { AuthTokenService } from './auth-token.service';
import { RealtimeService } from './realtime.service';
import { buildPrintDocument } from '../print/build-print-document';
import { isApiUnreachable } from '../utils/http-error';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private apiService = inject(ApiService);
  private realtime = inject(RealtimeService);
  private router = inject(Router);
  private authToken = inject(AuthTokenService);

  /** Set from `GET /api/auth/me` on startup. */
  currentUser = signal<CurrentUser | null>(null);
  currentUserId = computed(() => this.currentUser()?.userId ?? '');

  recentPages = signal<string[]>([]);

  // Current state
  currentId = signal<string>('welcome');
  currentWorkspaceId = signal<string>('acme');
  favorites = signal<Set<string>>(new Set());
  trashPages = signal<Page[]>([]);
  pageViewers = this.realtime.pageViewers;
  shareSettings = signal<ShareSettings | null>(null);
  backlinks = signal<{ pageId: string; title: string; icon: string; breadcrumb: string[] }[]>([]);
  pageHistory = signal<{ id: string; title: string; savedAt: string; savedBy?: string }[]>([]);
  templates = signal<PageTemplate[]>([]);

  showHistory = signal(false);
  showBacklinks = signal(false);
  showTrash = signal(false);
  showTemplates = signal(false);
  iconEditUi = signal<IconEditContext | null>(null);
  comments = signal<{ [key: string]: Comment[] }>({});
  pageComments = signal<{ [key: string]: Comment[] }>({});
  reactions = signal<{ [key: string]: { [emoji: string]: string[] } }>({});
  focusBlockIdx = signal<number | null>(null);
  showCommentsPanel = signal<boolean>(true);
  showCmd = signal<boolean>(false);
  showShare = signal<boolean>(false);
  showInbox = signal<boolean>(false);
  inbox = signal<InboxItem[]>([]);
  pages = signal<Record<string, Page>>({});
  people = signal<Record<string, any>>({});
  workspaces = signal<any[]>([]);
  tree = signal<any[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  /** Create page/folder modal context — null when closed. */
  createNavUi = signal<{
    mode: 'page' | 'folder';
    parentId: string;
    parentTitle: string;
    prefilledTitle?: string;
  } | null>(null);

  /** Sidebar expands this node id when set (cleared next microtask). */
  sidebarExpandHint = signal<string | null>(null);

  /** Command palette in “move page” mode — page id being moved, or null. */
  movePageUi = signal<string | null>(null);

  /** Browser-style linear history (page ids). */
  private historyBack = signal<string[]>([]);
  private historyForward = signal<string[]>([]);
  canGoBack = computed(() => this.historyBack().length > 0);
  canGoForward = computed(() => this.historyForward().length > 0);

  // Tweaks
  tweaks = signal<TweakDefaults>({
    theme: 'dark',
    accent: '#ec4899',
    pageWidth: 'wide',
  });

  favoritePages = computed(() => {
    const ids = [...this.favorites()];
    const pages = this.pages();
    return ids.map((id) => pages[id]).filter((p): p is Page => !!p);
  });

  // Computed values
  unreadCount = computed(() => this.inbox().filter(i => i.unread).length);

  /** Block comment threads for the open page (normalized: replies nested, not flat siblings). */
  blockCommentsForCurrentPage = computed(() => {
    const out: { [key: string]: Comment[] } = {};
    const comments = this.comments();
    const currentId = this.currentId();
    for (const k of Object.keys(comments)) {
      if (k.startsWith(currentId + '__')) {
        out[k] = this.normalizeBlockThread(comments[k]);
      }
    }
    return out;
  });

  /** Always returns a page — never null (avoids template errors when API id is missing). */
  currentPage = computed((): Page => {
    const id = this.currentId();
    const fromApi = this.pages()[id];
    if (fromApi) return fromApi;

    const treeNode = findTreeNode(this.tree(), id);
    const path = findNodePath(this.tree(), id);
    const breadcrumb = path
      ? stripWorkspaceBreadcrumbPrefix(
          path.filter((n) => n.kind !== 'workspace').map((n) => n.title),
        )
      : [treeNode?.title ?? id];

    return {
      id,
      icon: treeNode?.icon ?? '📄',
      title: treeNode?.title ?? 'Untitled',
      breadcrumb,
      updatedBy: '—',
      updatedAt: '—',
      contributors: [],
      blocks: [{ type: 'h1', text: treeNode?.title ?? 'Untitled' }],
    };
  });

  constructor() {
    this.loadData();
    this.initRouterSync();
    this.initRealtime();

    effect(() => {
      const theme = this.tweaks().theme;
      const accent = this.tweaks().accent;
      document.documentElement.dataset['theme'] = theme;
      document.documentElement.style.setProperty('--accent', accent);
    });

    effect(() => {
      const id = this.currentId();
      void this.realtime.setPage(id);
    });
  }

  private initRouterSync() {
    const syncFromUrl = () => {
      if (!this.authToken.get()) return;
      const match = this.router.url.match(/^\/p\/(.+?)(?:\?|#|$)/);
      if (match?.[1]) {
        const id = decodeURIComponent(match[1]);
        if (id !== this.currentId()) {
          this.currentId.set(id);
          this.focusBlockIdx.set(null);
        }
      }
    };
    syncFromUrl();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => syncFromUrl());
  }

  private initRealtime() {
    this.realtime.onInboxItem = (item) => {
      this.inbox.update((items) => [item, ...items]);
    };
    effect(() => {
      const uid = this.currentUserId();
      if (uid) void this.realtime.connect(uid);
    });
  }

  getPerson(id: string) {
    return this.people()[id] ?? { name: id, color: '#888' };
  }

  pageIdFromRoute(): string | null {
    const match = this.router.url.match(/^\/p\/(.+?)(?:\?|#|$)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }

  private loadData() {
    this.loading.set(true);
    this.error.set(null);

    if (!this.authToken.get()) {
      this.loading.set(false);
      return;
    }

    this.apiService
      .getMe()
      .toPromise()
      .then((me) => {
        if (me) this.currentUser.set(me);
        return this.loadWorkspaceData(me?.userId ?? '');
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
        this.loading.set(false);
        if (err?.status === 401) {
          this.authToken.clear();
          this.currentUser.set(null);
          void this.goToLogin();
          return;
        }
        if (isApiUnreachable(err)) {
          this.error.set('api_unreachable');
        }
      });
  }

  onLoginSuccess(session: AuthSession, returnUrl?: string) {
    this.authToken.set(session.token);
    this.currentUser.set({
      userId: session.userId,
      name: session.name,
      initial: session.initial,
      color: session.color,
    });
    this.loading.set(true);
    this.error.set(null);

    const target =
      returnUrl && returnUrl.startsWith('/p/') ? returnUrl : '/p/welcome';

    void this.router.navigateByUrl(target).then(() => {
      void this.loadWorkspaceData(session.userId);
    });
  }

  private goToLogin() {
    const returnUrl = this.router.url.startsWith('/p/') ? this.router.url : undefined;
    return this.router.navigate(
      ['/login'],
      returnUrl ? { queryParams: { returnUrl } } : {},
    );
  }

  logout() {
    this.apiService.logout().subscribe({
      next: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  private clearSession() {
    this.authToken.clear();
    this.realtime.disconnect();
    this.currentUser.set(null);
    this.pages.set({});
    this.tree.set([]);
    this.inbox.set([]);
    this.comments.set({});
    this.pageComments.set({});
    this.reactions.set({});
    this.favorites.set(new Set());
    this.showCmd.set(false);
    this.showShare.set(false);
    this.showInbox.set(false);
    this.loading.set(false);
    this.error.set(null);
    void this.goToLogin();
  }

  /** Re-run bootstrap after the backend comes online. */
  retryBootstrap() {
    this.loadData();
  }

  private loadWorkspaceData(userId: string) {
    return this.apiService
      .getPreferences(userId)
      .toPromise()
      .then((prefs) => {
        const wsId = prefs?.currentWorkspaceId ?? this.currentWorkspaceId();
        this.currentWorkspaceId.set(wsId);
        if (prefs?.theme) this.tweaks.update((t) => ({ ...t, theme: prefs.theme as TweakDefaults['theme'] }));
        if (prefs?.accent) this.tweaks.update((t) => ({ ...t, accent: prefs.accent }));
        if (prefs?.pageWidth) {
          this.tweaks.update((t) => ({
            ...t,
            pageWidth: prefs.pageWidth as TweakDefaults['pageWidth'],
          }));
        }
        if (prefs?.recentPages?.length) this.recentPages.set(prefs.recentPages);

        return Promise.all([
          this.apiService.getPages(wsId).toPromise(),
          this.apiService.getComments().toPromise(),
          this.apiService.getReactions().toPromise(),
          this.apiService.getInbox(userId).toPromise(),
          this.apiService.getPeople().toPromise(),
          this.apiService.getWorkspaces().toPromise(),
          this.apiService.getTree(wsId).toPromise(),
          this.apiService.getFavorites(userId).toPromise(),
          this.apiService.getTemplates().toPromise(),
        ]).then(([pages, comments, reactions, inbox, people, workspaces, tree, favs, templates]) => {
          return { prefs, pages, comments, reactions, inbox, people, workspaces, tree, favs, templates };
        });
      })
      .then((result) => {
        if (!result) return;
        const { prefs, pages, comments, reactions, inbox, people, workspaces, tree, favs, templates } =
          result;
        if (favs) this.favorites.set(new Set(favs));
        if (templates) this.templates.set(templates);
        if (pages) {
          const fromApi = Object.fromEntries(
            Object.entries(pages as Record<string, unknown>).map(([id, p]) => [
              id,
              this.normalizeRemotePage(p as Record<string, unknown>, id),
            ]),
          );
          this.pages.set(fromApi);
        }
        if (comments) {
          // Separate block comments from page comments
          const blockComments: { [key: string]: Comment[] } = {};
          const pageComments: { [key: string]: Comment[] } = {};

          Object.entries(comments).forEach(([key, commentList]) => {
            const normalized = this.normalizeCommentList(commentList as unknown[]);
            if (key.includes('__')) {
              blockComments[key] = this.normalizeBlockThread(normalized);
            } else {
              pageComments[key] = normalized;
            }
          });

          this.comments.set(blockComments);
          this.pageComments.set(pageComments);
        }
        if (reactions) this.reactions.set(reactions);
        if (inbox) this.inbox.set(inbox);
        if (people) this.people.set(people);
        if (workspaces) this.workspaces.set(workspaces);
        if (tree) {
          const pageIds = new Set(Object.keys(this.pages()));
          const prepared = prepareNavigationTree(tree as TreeNode[], pageIds);
          this.tree.set(prepared);
          if (JSON.stringify(prepared) !== JSON.stringify(tree)) {
            this.apiService.putTree(prepared, this.currentWorkspaceId()).subscribe({
              error: (err) => console.error('Failed to repair navigation tree:', err),
            });
          }
        }
        const routeId = this.pageIdFromRoute();
        const loadedPages = this.pages();
        let targetId = routeId && loadedPages[routeId] ? routeId : null;
        if (!targetId) {
          targetId = prefs?.recentPages?.find((id) => loadedPages[id]) ?? null;
        }
        if (!targetId) {
          const keys = Object.keys(loadedPages);
          if (keys.length) targetId = keys[0];
        }
        if (targetId) {
          if (targetId !== routeId) {
            this.selectPage(targetId, { skipHistory: true });
          } else {
            this.currentId.set(targetId);
          }
        }
        this.loading.set(false);
      });
  }

  private normalizeCommentList(list: unknown[]): Comment[] {
    return list.map((row) => this.normalizeRemoteComment(row as Record<string, unknown>));
  }

  /** Map API comment rows (`repliesJson` / `reactionsJson`) into our Comment shape. */
  private normalizeRemoteComment(raw: Record<string, unknown>): Comment {
    const id = String(raw['id'] ?? raw['Id'] ?? '');
    const author = String(raw['author'] ?? raw['Author'] ?? '');
    const text = String(raw['text'] ?? raw['Text'] ?? '');
    const at = String(raw['at'] ?? raw['At'] ?? '');
    const resolved = Boolean(raw['resolved'] ?? raw['Resolved']);

    const pageIdRaw = raw['pageId'] ?? raw['PageId'];
    const blockRaw = raw['blockIdx'] ?? raw['BlockIdx'];
    const parentRaw = raw['parentCommentId'] ?? raw['ParentCommentId'];

    let replies: Comment[] | undefined;
    const repliesArr = raw['replies'];
    const repliesJson = raw['repliesJson'] ?? raw['RepliesJson'];
    if (Array.isArray(repliesArr)) {
      replies = repliesArr.map((item) => this.normalizeRemoteComment(item as Record<string, unknown>));
    } else if (typeof repliesJson === 'string' && repliesJson.trim()) {
      try {
        const parsed = JSON.parse(repliesJson) as unknown;
        replies = Array.isArray(parsed)
          ? parsed.map((item) => this.normalizeRemoteComment(item as Record<string, unknown>))
          : [];
      } catch {
        replies = [];
      }
    }

    let reactions: Record<string, string[]> | undefined;
    const rxObj = raw['reactions'];
    const rxJson = raw['reactionsJson'] ?? raw['ReactionsJson'];
    if (rxObj && typeof rxObj === 'object' && !Array.isArray(rxObj)) {
      reactions = rxObj as Record<string, string[]>;
    } else if (typeof rxJson === 'string' && rxJson.trim()) {
      try {
        const parsed = JSON.parse(rxJson) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          reactions = parsed as Record<string, string[]>;
        }
      } catch {
        /* ignore */
      }
    }

    return {
      id,
      author,
      text,
      at,
      resolved,
      pageId: pageIdRaw != null && String(pageIdRaw) !== '' ? String(pageIdRaw) : undefined,
      blockIdx:
        blockRaw === undefined
          ? undefined
          : blockRaw === null
            ? null
            : Number(blockRaw),
      parentCommentId:
        parentRaw != null && String(parentRaw) !== '' ? String(parentRaw) : undefined,
      replies,
      reactions,
    };
  }

  /** Map API / JSON page shapes into our Page model (always a blocks[]). */
  private normalizeRemotePage(raw: Record<string, unknown>, fallbackId: string): Page {
    const id = String(raw['id'] ?? raw['Id'] ?? fallbackId);

    const blocksRaw = raw['blocks'] ?? raw['Blocks'];
    const blocks = Array.isArray(blocksRaw) ? (blocksRaw as Page['blocks']) : [];
    const breadcrumb = raw['breadcrumb'] ?? raw['Breadcrumb'];
    const contributors = raw['contributors'] ?? raw['Contributors'];
    const mdRaw = raw['markdownBody'] ?? raw['MarkdownBody'];
    const markdownBody =
      mdRaw != null && String(mdRaw).trim() !== '' ? String(mdRaw) : undefined;
    const crumbArr = Array.isArray(breadcrumb)
      ? stripWorkspaceBreadcrumbPrefix(breadcrumb as string[])
      : [String(raw['title'] ?? 'Untitled')];
    return {
      id,
      icon: String(raw['icon'] ?? raw['Icon'] ?? ''),
      title: String(raw['title'] ?? raw['Title'] ?? 'Untitled'),
      breadcrumb: crumbArr,
      updatedBy: String(raw['updatedBy'] ?? raw['UpdatedBy'] ?? '—'),
      updatedAt: String(
        raw['updatedAt'] != null ? raw['updatedAt'] : raw['UpdatedAt'] != null ? raw['UpdatedAt'] : '—'
      ),
      contributors: Array.isArray(contributors) ? (contributors as string[]) : [],
      version: (raw['version'] ?? raw['Version']) as number | undefined,
      blocks,
      markdownBody,
    };
  }

  /** Owning top-level comment row when `commentId` appears inside nested `replies`. */
  private findOwningParentCommentRow(
    blockMap: { [key: string]: Comment[] },
    pageMap: { [key: string]: Comment[] },
    commentId: string,
  ): Comment | null {
    const subtreeHasTarget = (nodes: Comment[] | undefined): boolean => {
      for (const r of nodes ?? []) {
        if (r.id === commentId) return true;
        if (subtreeHasTarget(r.replies)) return true;
      }
      return false;
    };

    const scanList = (list: Comment[]): Comment | null => {
      for (const c of list) {
        if (subtreeHasTarget(c.replies)) return c;
      }
      return null;
    };

    for (const list of Object.values(blockMap)) {
      const hit = scanList(list);
      if (hit) return hit;
    }
    for (const list of Object.values(pageMap)) {
      const hit = scanList(list);
      if (hit) return hit;
    }
    return null;
  }

  private findCommentByIdDeep(
    blockMap: { [key: string]: Comment[] },
    pageMap: { [key: string]: Comment[] },
    targetId: string,
  ): Comment | null {
    const walk = (c: Comment): Comment | null => {
      if (c.id === targetId) return c;
      for (const r of c.replies ?? []) {
        const x = walk(r);
        if (x) return x;
      }
      return null;
    };

    const scanList = (list: Comment[]): Comment | null => {
      for (const c of list) {
        const x = walk(c);
        if (x) return x;
      }
      return null;
    };

    for (const list of Object.values(blockMap)) {
      const x = scanList(list);
      if (x) return x;
    }
    for (const list of Object.values(pageMap)) {
      const x = scanList(list);
      if (x) return x;
    }
    return null;
  }

  /**
   * Find a page id whose breadcrumb exactly matches the prefix up to `index`.
   * Returns null if none (e.g. folder-only segment) — caller should not navigate.
   */
  pageIdForBreadcrumbIndex(breadcrumb: string[], index: number): string | null {
    if (index >= breadcrumb.length - 1) return null;
    const want = breadcrumb.slice(0, index + 1);
    for (const [pageId, p] of Object.entries(this.pages())) {
      if (
        p.breadcrumb.length === want.length &&
        want.every((s, i) => p.breadcrumb[i] === s)
      ) {
        return pageId;
      }
    }
    return null;
  }

  goBack(): void {
    const stack = this.historyBack();
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    this.historyBack.set(stack.slice(0, -1));
    this.historyForward.update((f) => [this.currentId(), ...f]);
    this.selectPage(prev, { skipHistory: true });
  }

  goForward(): void {
    const stack = this.historyForward();
    if (stack.length === 0) return;
    const next = stack[0];
    this.historyForward.set(stack.slice(1));
    this.historyBack.update((b) => [...b, this.currentId()]);
    this.selectPage(next, { skipHistory: true });
  }

  // Actions
  selectPage(id: string, opts?: { skipHistory?: boolean }) {
    const prev = this.currentId();
    if (id !== prev && !opts?.skipHistory) {
      this.historyBack.update((h) => [...h, prev]);
      this.historyForward.set([]);
    }
    this.currentId.set(id);
    this.focusBlockIdx.set(null);
    void this.router.navigateByUrl('/p/' + encodeURIComponent(id));
    this.pushRecentPage(id);
    if (!this.pages()[id]) void this.ensurePageRecord(id);
  }

  private pushRecentPage(pageId: string) {
    const uid = this.currentUserId();
    if (!uid) return;
    const next = [pageId, ...this.recentPages().filter((id) => id !== pageId)].slice(0, 12);
    this.recentPages.set(next);
    this.apiService.putPreferences(uid, { recentPages: next }).subscribe();
  }

  private ensurePageRecord(pageId: string) {
    const node = findTreeNode(this.tree(), pageId);
    if (!node || node.kind !== 'page') return;
    const path = findNodePath(this.tree(), pageId);
    const breadcrumb = path
      ? stripWorkspaceBreadcrumbPrefix(path.filter((n) => n.kind !== 'workspace').map((n) => n.title))
      : [node.title];
    const uid = this.currentUserId();
    const page: Page = {
      id: pageId,
      title: node.title,
      icon: node.icon,
      breadcrumb,
      updatedBy: this.getPerson(uid).name,
      updatedAt: new Date().toISOString(),
      contributors: uid ? [uid] : [],
      blocks: [{ type: 'h1', text: node.title }],
      version: 1,
    };
    this.apiService
      .createPage({ ...page, workspaceId: this.currentWorkspaceId() })
      .subscribe({
        next: () => this.pages.update((p) => ({ ...p, [pageId]: page })),
        error: (err) => console.error('Failed to create page record:', err),
      });
  }

  switchWorkspace(apiWorkspaceIdValue: string) {
    if (apiWorkspaceIdValue === this.currentWorkspaceId()) return;
    this.currentWorkspaceId.set(apiWorkspaceIdValue);
    const uid = this.currentUserId();
    if (uid) {
      this.apiService.putPreferences(uid, { currentWorkspaceId: apiWorkspaceIdValue }).subscribe();
    }
    const wsId = apiWorkspaceIdValue;
    Promise.all([
      this.apiService.getPages(wsId).toPromise(),
      this.apiService.getTree(wsId).toPromise(),
    ]).then(([pages, tree]) => {
      if (pages) {
        const fromApi: Record<string, Page> = {};
        for (const [id, p] of Object.entries(pages)) {
          fromApi[id] = this.normalizeRemotePage(p as unknown as Record<string, unknown>, id);
        }
        this.pages.set(fromApi);
      }
      if (tree) {
        const pageIds = new Set(Object.keys(this.pages()));
        this.tree.set(prepareNavigationTree(tree as TreeNode[], pageIds));
      }
    });
  }

  reorderTree(dragId: string, targetId: string) {
    const next = moveTreeNode([...this.tree()], dragId, targetId);
    this.tree.set(next);
    this.persistTree(next);
  }

  persistTreeChange(tree: TreeNode[]) {
    this.tree.set(tree);
    this.persistTree(tree);
  }

  isFavorite(pageId: string): boolean {
    return this.favorites().has(pageId);
  }

  toggleFavorite(pageId: string) {
    const uid = this.currentUserId();
    if (!uid) return;
    const fav = this.favorites();
    const next = new Set(fav);
    if (next.has(pageId)) {
      next.delete(pageId);
      this.favorites.set(next);
      this.apiService.removeFavorite(pageId, uid).subscribe();
    } else {
      next.add(pageId);
      this.favorites.set(next);
      this.apiService.addFavorite(pageId, uid).subscribe();
    }
  }

  async loadShareSettings(pageId: string) {
    try {
      const s = await this.apiService.getShare(pageId).toPromise();
      if (s?.members?.length) {
        this.shareSettings.set(s);
        return;
      }
    } catch {
      /* use defaults below */
    }
    const page = this.pages()[pageId];
    const uid = this.currentUserId();
    const members: ShareMember[] = (page?.contributors ?? (uid ? [uid] : [])).map((userId) => ({
      userId,
      permission: userId === uid ? 'owner' : 'edit',
    }));
    this.shareSettings.set({ pageId, linkSharingEnabled: false, members });
  }

  saveShareSettings(
    pageId: string,
    members: { userId: string; permission: string }[],
    linkSharingEnabled: boolean,
  ) {
    const payload = {
      members: members as ShareMember[],
      linkSharingEnabled,
    };
    this.apiService.putShare(pageId, payload).subscribe({
      next: () => this.shareSettings.set({ pageId, ...payload }),
    });
  }

  copyShareLink(pageId: string): string {
    const url = `${window.location.origin}/p/${encodeURIComponent(pageId)}`;
    void navigator.clipboard.writeText(url);
    return url;
  }

  loadBacklinks(pageId: string) {
    this.apiService.getBacklinks(pageId).subscribe({
      next: (links) => {
        this.backlinks.set(links);
        this.showBacklinks.set(true);
      },
    });
  }

  loadHistory(pageId: string) {
    this.apiService.getHistory(pageId).subscribe({
      next: (h) => {
        this.pageHistory.set(h);
        this.showHistory.set(true);
      },
    });
  }

  restoreHistoryVersion(pageId: string, versionId: string) {
    this.apiService.getHistoryVersion(pageId, versionId).subscribe({
      next: (v) => {
        const blocks = (v as Page).blocks ?? [];
        const md = (v as Page).markdownBody;
        this.pages.update((p) => ({
          ...p,
          [pageId]: {
            ...this.pages()[pageId],
            ...v,
            blocks,
            markdownBody: md,
          },
        }));
        this.apiService
          .updatePage(pageId, { blocks, markdownBody: md } as Partial<Page>)
          .subscribe();
        this.showHistory.set(false);
      },
    });
  }

  loadTrash() {
    this.apiService.getTrash(this.currentWorkspaceId()).subscribe({
      next: (pages) => {
        this.trashPages.set(pages);
        this.showTrash.set(true);
      },
    });
  }

  restoreFromTrash(pageId: string) {
    this.apiService.restorePage(pageId).subscribe({
      next: () => {
        this.trashPages.update((list) => list.filter((p) => p.id !== pageId));
        void this.reloadPages();
      },
    });
  }

  deletePageToTrash(pageId: string) {
    const tree = removeTreeNodeById([...this.tree()], pageId);
    this.tree.set(tree);
    this.persistTree(tree);
    this.apiService.deletePage(pageId).subscribe({
      next: () => {
        this.pages.update((p) => {
          const next = { ...p };
          delete next[pageId];
          return next;
        });
        if (this.currentId() === pageId) this.selectPage('welcome');
      },
    });
  }

  duplicatePage(pageId: string) {
    const uid = this.currentUserId();
    if (!uid) return;
    this.apiService.duplicatePage(pageId, uid).subscribe({
      next: (res) => {
        const page = this.normalizeRemotePage(res.page as unknown as Record<string, unknown>, res.id);
        this.pages.update((p) => ({ ...p, [res.id]: page }));
        const tree = [...this.tree()];
        const parentPath = findNodePath(tree, pageId);
        const parentId = parentPath?.[parentPath.length - 2]?.id ?? treeWorkspaceId(this.currentWorkspaceId());
        const pageNode: TreeNode = { id: res.id, title: page.title, icon: page.icon, kind: 'page' };
        const nextTree = insertTreeChild(tree, parentId, pageNode);
        this.tree.set(nextTree);
        this.persistTree(nextTree);
        this.selectPage(res.id);
      },
    });
  }

  openTodayNotes() {
    const today = new Date().toISOString().slice(0, 10);
    const id = `drafts/notes-${today}`;
    if (this.pages()[id]) {
      this.selectPage(id);
      return;
    }
    this.openCreatePage(treeWorkspaceId(this.currentWorkspaceId()), 'Drafts', `Notes ${today}`);
  }

  openTemplates() {
    this.showTemplates.set(true);
  }

  createFromTemplate(t: PageTemplate) {
    this.showTemplates.set(false);
    const tree = this.tree();
    const drafts = findTreeNode(tree, 'drafts');
    const parentId = drafts?.id ?? treeWorkspaceId(this.currentWorkspaceId());
    this.confirmCreateNavigation({
      mode: 'page',
      title: t.title,
      icon: t.icon,
      markdownBody: t.markdownBody,
      parentId,
    });
  }

  deleteComment(commentId: string, threadKey: string) {
    this.apiService.deleteComment(commentId).subscribe({
      next: () => {
        if (threadKey.includes('__')) {
          this.comments.update((c) => ({
            ...c,
            [threadKey]: (c[threadKey] ?? []).filter((x) => x.id !== commentId),
          }));
        } else {
          this.pageComments.update((c) => ({
            ...c,
            [threadKey]: (c[threadKey] ?? []).filter((x) => x.id !== commentId),
          }));
        }
      },
    });
  }

  handlePageAction(action: string) {
    const pageId = this.currentId();
    switch (action) {
      case 'favorite':
        this.toggleFavorite(pageId);
        break;
      case 'duplicate':
        this.duplicatePage(pageId);
        break;
      case 'export':
        this.exportPagePdf();
        break;
      case 'history':
        this.loadHistory(pageId);
        break;
      case 'backlinks':
        this.loadBacklinks(pageId);
        break;
      case 'viewTrash':
        this.loadTrash();
        break;
      case 'delete':
        this.deletePageToTrash(pageId);
        break;
      case 'move':
        this.movePageUi.set(pageId);
        this.showCmd.set(true);
        break;
    }
  }

  movePageToParent(pageId: string, newParentId: string) {
    if (pageId === newParentId) return;
    const tree = [...this.tree()];
    const { tree: without, removed } = removeTreeNode(tree, pageId);
    if (!removed) return;
    const nextTree = insertTreeChild(without, newParentId, removed);
    this.tree.set(nextTree);
    this.persistTree(nextTree);

    const cur = this.pages()[pageId];
    if (cur && removed.kind === 'page') {
      const parentPath = findNodePath(nextTree, newParentId);
      const crumbTitles = parentPath
        ? breadcrumbForNewPage(parentPath, cur.title)
        : [cur.title];
      const next: Page = { ...cur, breadcrumb: crumbTitles };
      this.pages.update((p) => ({ ...p, [pageId]: next }));
      this.apiService.updatePage(pageId, { breadcrumb: crumbTitles }).subscribe({
        error: (err) => console.error('Failed to update breadcrumb after move:', err),
      });
    }
    this.movePageUi.set(null);
    this.showCmd.set(false);
  }

  createWorkspace(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id =
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `ws-${Date.now()}`;
    this.apiService.createWorkspace({ id, name: trimmed }).subscribe({
      next: (ws) => {
        this.workspaces.update((list) => [...list, ws]);
        this.switchWorkspace(ws.id);
      },
      error: (err) => console.error('Failed to create workspace:', err),
    });
  }

  reorderCurrentPageBlocks(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const cur = this.mergeCurrentPage();
    const blocks = [...(cur.blocks ?? [])];
    if (fromIdx < 0 || fromIdx >= blocks.length || toIdx < 0 || toIdx >= blocks.length) return;
    const [moved] = blocks.splice(fromIdx, 1);
    blocks.splice(toIdx, 0, moved);
    this.updateCurrentPageBlocks(blocks);
  }

  exportPagePdf() {
    const page = this.currentPage();
    const w = window.open('', '_blank');
    if (!w) return;

    const html = buildPrintDocument(page, {
      updatedByLabel: this.getPerson(page.updatedBy).name,
    });

    w.document.open();
    w.document.write(html);
    w.document.close();

    const printWhenReady = () => {
      w.focus();
      w.print();
    };
    if (w.document.readyState === 'complete') {
      printWhenReady();
    } else {
      w.onload = printWhenReady;
    }
  }

  private reloadPages() {
    this.apiService.getPages(this.currentWorkspaceId()).subscribe({
      next: (pages) => {
        const merged = { ...this.pages() };
        for (const [id, p] of Object.entries(pages)) {
          merged[id] = this.normalizeRemotePage(p as unknown as Record<string, unknown>, id);
        }
        this.pages.set(merged);
      },
    });
  }

  openCreatePage(parentId: string, parentTitle: string, prefilledTitle?: string) {
    this.createNavUi.set({ mode: 'page', parentId, parentTitle, prefilledTitle });
  }

  openCreateFolder(parentId: string, parentTitle: string) {
    this.createNavUi.set({ mode: 'folder', parentId, parentTitle });
  }

  closeCreateNav() {
    this.createNavUi.set(null);
  }

  /** Command palette “create …” lands here with a prefilled title under Acme. */
  openCreatePageFromPalette(title: string) {
    this.openCreatePage('workspace-acme', 'Acme', title?.trim());
  }

  openIconEdit(ev: { id: string; kind: 'page' | 'folder'; icon: string; title: string }) {
    this.iconEditUi.set({
      nodeId: ev.id,
      kind: ev.kind,
      icon: ev.icon ?? '',
      title: ev.title,
    });
  }

  closeIconEdit() {
    this.iconEditUi.set(null);
  }

  saveIconEdit(icon: string) {
    const ctx = this.iconEditUi();
    if (!ctx) return;
    this.updateNodeIcon(ctx.nodeId, icon.trim(), ctx.kind);
    this.iconEditUi.set(null);
  }

  updateCurrentPageIcon(icon: string) {
    const id = this.currentId();
    this.updateNodeIcon(id, icon.trim(), 'page');
  }

  updateNodeIcon(nodeId: string, icon: string, kind: 'page' | 'folder') {
    const iconValue = icon.trim();
    const nextTree = updateTreeNodeIcon(
      [...this.tree()],
      nodeId,
      iconValue ? iconValue : undefined,
    );
    this.tree.set(nextTree);
    this.persistTree(nextTree);

    if (kind === 'page') {
      const cur = this.pages()[nodeId];
      if (!cur) return;
      const next: Page = iconValue ? { ...cur, icon: iconValue } : { ...cur };
      if (!iconValue) delete (next as { icon?: string }).icon;
      this.pages.update((p) => ({ ...p, [nodeId]: next }));
      this.apiService
        .updatePage(nodeId, { icon: iconValue || '' } as Partial<Page>)
        .subscribe({
          error: (err) => console.error('Failed to save icon:', err),
        });
    }
  }

  confirmCreateNavigation(ev: {
    mode: 'page' | 'folder';
    title: string;
    icon: string;
    markdownBody: string;
    parentId: string;
  }) {
    const tree = [...this.tree()];
    const pagesMap = this.pages();
    const ids = collectTreeIds(tree);
    Object.keys(pagesMap).forEach((pid) => ids.add(pid));

    const id = uniqueChildId(ev.parentId, ev.title, ids);
    const parentPath = findNodePath(tree, ev.parentId);
    const crumbTitles = parentPath ? breadcrumbForNewPage(parentPath, ev.title) : [ev.title];

    if (ev.mode === 'folder') {
      const folderNode: TreeNode = {
        id,
        title: ev.title,
        ...(ev.icon ? { icon: ev.icon } : {}),
        kind: 'folder',
        children: [],
      };
      const nextTree = insertTreeChild(tree, ev.parentId, folderNode);
      this.tree.set(nextTree);
      this.persistTree(nextTree);
      this.flashExpand(ev.parentId);
      this.closeCreateNav();
      return;
    }

    const md = ev.markdownBody.trim();
    const page: Page = {
      id,
      title: ev.title,
      ...(ev.icon ? { icon: ev.icon } : {}),
      breadcrumb: crumbTitles,
      updatedBy: this.getPerson(this.currentUserId()).name,
      updatedAt: new Date().toISOString(),
      contributors: this.currentUserId() ? [this.currentUserId()] : [],
      blocks: [],
      ...(md ? { markdownBody: md } : {}),
    };

    const pageNode: TreeNode = {
      id,
      title: ev.title,
      ...(page.icon ? { icon: page.icon } : {}),
      kind: 'page',
    };

    const nextTree = insertTreeChild(tree, ev.parentId, pageNode);
    this.pages.update((p) => ({ ...p, [id]: page }));
    this.tree.set(nextTree);

    this.apiService
      .createPage({
        ...page,
        workspaceId: this.currentWorkspaceId(),
      })
      .subscribe({
        error: (err) => console.error('Failed to create page:', err),
      });

    this.persistTree(nextTree);
    this.flashExpand(ev.parentId);
    this.closeCreateNav();
    this.selectPage(id);
  }

  private persistTree(tree: TreeNode[]) {
    const pageIds = new Set(Object.keys(this.pages()));
    const prepared = prepareNavigationTree(tree, pageIds);
    this.tree.set(prepared);
    this.apiService.putTree(prepared, this.currentWorkspaceId()).subscribe({
      error: (err) => console.error('Failed to save sidebar tree:', err),
    });
  }

  /** Keep page record, breadcrumb, sidebar tree, and API in sync for a title change. */
  private applyPageTitleChange(pageId: string, rawTitle: string) {
    const title = singleLineTitle(rawTitle);
    if (!title || !pageId) return;

    const existing = this.pages()[pageId] ?? this.mergeCurrentPage();
    const crumb =
      existing.breadcrumb.length > 0
        ? [...existing.breadcrumb.slice(0, -1), title]
        : [title];
    const next: Page = { ...existing, title, breadcrumb: crumb };

    this.pages.update((p) => ({ ...p, [pageId]: next }));

    const nextTree = renameTreeNodeTitle([...this.tree()], pageId, title);
    this.persistTree(nextTree);

    this.apiService.updatePage(pageId, { title, breadcrumb: crumb }).subscribe({
      error: (err) => console.error('Failed to save title:', err),
    });
  }

  /** Sidebar rename: updates navigation tree + page title/breadcrumb when the page exists in `pages`. */
  renamePageFromSidebar(ev: { id: string; title: string }) {
    const pageId = ev.id;
    const path = findNodePath([...this.tree()], pageId);
    const node = path?.[path.length - 1];
    if (!node || (node.kind !== 'page' && !this.pages()[pageId])) return;
    this.applyPageTitleChange(pageId, ev.title);
  }

  private flashExpand(parentId: string) {
    this.sidebarExpandHint.set(parentId);
    queueMicrotask(() => this.sidebarExpandHint.set(null));
  }

  updateCurrentPageTitle(title: string) {
    this.applyPageTitleChange(this.currentId(), title);
  }

  updateCurrentPageBlocks(blocks: Block[]) {
    const id = this.currentId();
    const cur = this.mergeCurrentPage();
    const next = { ...cur, blocks, version: (cur.version ?? 1) + 1 };
    this.pages.update((p) => ({ ...p, [id]: next }));
    this.apiService.updatePage(id, { blocks }).subscribe({
      error: (err) => console.error('Failed to save blocks:', err),
    });
  }

  /** Persist Markdown document body for the open page (GFM). */
  saveCurrentPageMarkdownBody(raw: string) {
    const id = this.currentId();
    const cur = this.mergeCurrentPage();
    const trimmed = raw.trim();
    const next: Page = {
      ...cur,
      markdownBody: trimmed ? trimmed : undefined,
    };
    this.pages.update((p) => ({ ...p, [id]: next }));
    this.apiService
      .updatePage(id, {
        markdownBody: trimmed ? trimmed : null,
      } as Partial<Page>)
      .subscribe({
        error: (err) => console.error('Failed to save markdown:', err),
      });
  }

  private mergeCurrentPage(): Page {
    const id = this.currentId();
    return (
      this.pages()[id] ?? {
        id,
        icon: '📄',
        title: 'Untitled',
        breadcrumb: [''],
        updatedBy: '—',
        updatedAt: '—',
        contributors: [],
        blocks: [],
      }
    );
  }

  /** When set, the block-comment modal is open for this block index. */
  blockCommentBlockIdx = signal<number | null>(null);

  /** Opens the styled modal (replaces browser `prompt` for block comments). */
  addComment(blockIdx: number) {
    this.blockCommentBlockIdx.set(blockIdx);
  }

  cancelBlockComment() {
    this.blockCommentBlockIdx.set(null);
  }

  /** Debounce duplicate submits (double-click, Ctrl+Enter + Send, etc.). */
  private recentCommentSubmitKeys = new Map<string, number>();

  private newCommentId(prefix: string): string {
    return prefix + (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
  }

  private isDuplicateCommentSubmit(scope: string, text: string): boolean {
    const key = `${scope}::${text.trim()}`;
    const now = Date.now();
    const last = this.recentCommentSubmitKeys.get(key) ?? 0;
    if (now - last < 800) return true;
    this.recentCommentSubmitKeys.set(key, now);
    return false;
  }

  /** Collapse legacy flat replies (parentCommentId) into nested `replies` for display. */
  private normalizeBlockThread(list: Comment[]): Comment[] {
    const roots = list.filter((c) => !c.parentCommentId);
    const flatReplies = list.filter((c) => c.parentCommentId);
    if (flatReplies.length === 0) return roots;

    return roots.map((root) => {
      const legacyReplies = flatReplies.filter((r) => r.parentCommentId === root.id);
      if (legacyReplies.length === 0) return root;
      return {
        ...root,
        replies: [...(root.replies ?? []), ...legacyReplies],
      };
    });
  }

  private patchCommentIdInMap(
    map: { [key: string]: Comment[] },
    threadKey: string,
    tempId: string,
    saved: Comment,
  ): { [key: string]: Comment[] } {
    const list = map[threadKey];
    if (!list) return map;
    const savedId = String((saved as { id?: string; Id?: string }).id ?? (saved as { Id?: string }).Id ?? tempId);
    return {
      ...map,
      [threadKey]: list.map((c) => (c.id === tempId ? { ...c, id: savedId } : c)),
    };
  }

  submitBlockComment(text: string) {
    const trimmed = text.trim();
    const blockIdx = this.blockCommentBlockIdx();
    this.blockCommentBlockIdx.set(null);
    if (blockIdx === null || !trimmed) return;

    const key = this.currentId() + "__" + blockIdx;
    if (this.isDuplicateCommentSubmit(`block:${key}`, trimmed)) return;

    const comments = { ...this.comments() };
    if (!comments[key]) comments[key] = [];

    const tempId = this.newCommentId("c");
    const newComment: Comment = {
      id: tempId,
      author: this.currentUserId(),
      text: trimmed,
      at: "just now",
      resolved: false,
      pageId: this.currentId(),
      blockIdx,
      replies: [],
    };

    comments[key] = [...comments[key], newComment];
    this.comments.set(comments);
    this.showCommentsPanel.set(true);

    this.apiService.createComment(newComment).subscribe({
      next: (saved) => {
        this.comments.set(this.patchCommentIdInMap({ ...this.comments() }, key, tempId, saved));
      },
      error: (err) => console.error("Failed to create comment:", err),
    });
  }

  resolveComment(key: string) {
    const isBlock = key.includes('__');
    const map = isBlock ? { ...this.comments() } : { ...this.pageComments() };
    const list = map[key];
    if (!list?.length) return;

    const nextResolved = !list[0].resolved;
    const updated = list.map((c) => ({ ...c, resolved: nextResolved }));
    map[key] = updated;

    if (isBlock) this.comments.set(map);
    else this.pageComments.set(map);

    for (const c of updated) {
      this.apiService.updateComment(c.id, c).subscribe({
        error: (err) => console.error('Failed to update comment:', err),
      });
    }
  }

  replyComment(key: string, text: string, parentCommentId?: string) {
    const trimmed = text.trim();
    if (!trimmed || this.isDuplicateCommentSubmit(`block-reply:${key}`, trimmed)) return;

    const comments = { ...this.comments() };
    const thread = this.normalizeBlockThread(comments[key] ?? []);
    const parentComment =
      (parentCommentId ? thread.find((c) => c.id === parentCommentId) : undefined) ??
      thread[thread.length - 1];
    if (!parentComment) return;

    const reply: Comment = {
      id: this.newCommentId("cr"),
      author: this.currentUserId(),
      text: trimmed,
      at: "just now",
      resolved: false,
      pageId: parentComment.pageId,
      blockIdx: parentComment.blockIdx,
    };

    const updatedParent: Comment = {
      ...parentComment,
      replies: [...(parentComment.replies ?? []), reply],
    };

    comments[key] = thread.map((c) => (c.id === parentComment.id ? updatedParent : c));
    this.comments.set(comments);

    this.apiService.updateComment(updatedParent.id, updatedParent).subscribe({
      error: (err) => console.error("Failed to save block reply:", err),
    });
  }

  addReaction(emoji: string) {
    const uid = this.currentUserId();
    if (!uid) return;
    const pageId = this.currentId();
    const reactions = {...this.reactions()};
    const cur = reactions[pageId] || {};
    const users = cur[emoji] || [];
    const has = users.includes(uid);
    const newUsers = has ? users.filter((u) => u !== uid) : [...users, uid];
    const newCur = { ...cur };
    if (newUsers.length === 0) delete newCur[emoji];
    else newCur[emoji] = newUsers;
    reactions[pageId] = newCur;
    this.reactions.set(reactions);
    
    // Update backend
    this.apiService.addReaction({ pageId, emoji, userId: uid }).subscribe({
      error: (err) => console.error('Failed to add reaction:', err)
    });
  }

  toggleCommentReaction(commentId: string, emoji: string) {
    const userId = this.currentUserId();
    const toggleOnMap = (cur?: Record<string, string[]>): Record<string, string[]> => {
      const next = { ...(cur ?? {}) };
      const users = [...(next[emoji] ?? [])];
      const idx = users.indexOf(userId);
      if (idx >= 0) users.splice(idx, 1);
      else users.push(userId);
      if (users.length === 0) delete next[emoji];
      else next[emoji] = users;
      return next;
    };

    const patchTree = (c: Comment): Comment => {
      if (c.id === commentId) return { ...c, reactions: toggleOnMap(c.reactions) };
      if (c.replies?.length) {
        let changed = false;
        const nr = c.replies.map((r) => {
          const pr = patchTree(r);
          if (pr !== r) changed = true;
          return pr;
        });
        if (changed) return { ...c, replies: nr };
      }
      return c;
    };

    const patchList = (list: Comment[]): Comment[] => list.map((c) => patchTree(c));

    const nextBlock = { ...this.comments() };
    for (const k of Object.keys(nextBlock)) {
      nextBlock[k] = patchList(nextBlock[k]);
    }

    const nextPage = { ...this.pageComments() };
    for (const k of Object.keys(nextPage)) {
      nextPage[k] = patchList(nextPage[k]);
    }

    this.comments.set(nextBlock);
    this.pageComments.set(nextPage);

    const nestedParent = this.findOwningParentCommentRow(nextBlock, nextPage, commentId);
    const persistRow = nestedParent ?? this.findCommentByIdDeep(nextBlock, nextPage, commentId);
    if (!persistRow) return;

    this.apiService.updateComment(persistRow.id, persistRow).subscribe({
      error: (err) => console.error('Failed to persist comment reaction:', err),
    });
  }

  addPageComment(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const pageId = this.currentId();
    if (this.isDuplicateCommentSubmit(`page:${pageId}`, trimmed)) return;

    const pageComments = { ...this.pageComments() };
    if (!pageComments[pageId]) pageComments[pageId] = [];

    const tempId = this.newCommentId("pc");
    const newComment: Comment = {
      id: tempId,
      author: this.currentUserId(),
      text: trimmed,
      at: "just now",
      resolved: false,
      replies: [],
      pageId,
    };

    pageComments[pageId] = [...pageComments[pageId], newComment];
    this.pageComments.set(pageComments);

    this.apiService.createComment(newComment).subscribe({
      next: (saved) => {
        const next = { ...this.pageComments() };
        const list = next[pageId];
        if (!list) return;
        const savedId = String((saved as { id?: string }).id ?? tempId);
        next[pageId] = list.map((c) => (c.id === tempId ? { ...c, id: savedId } : c));
        this.pageComments.set(next);
      },
      error: (err) => console.error("Failed to create page comment:", err),
    });
  }

  replyPageComment(commentId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const pageId = this.currentId();
    if (this.isDuplicateCommentSubmit(`page-reply:${pageId}:${commentId}`, trimmed)) return;

    const pageComments = { ...this.pageComments() };
    const parentComment = pageComments[pageId]?.find((c) => c.id === commentId);
    if (!parentComment) return;

    const reply: Comment = {
      id: this.newCommentId("pcr"),
      author: this.currentUserId(),
      text: trimmed,
      at: "just now",
      resolved: false,
    };

    const updatedParent: Comment = {
      ...parentComment,
      replies: [...(parentComment.replies || []), reply],
    };

    pageComments[pageId] = pageComments[pageId].map((c) =>
      c.id === commentId ? updatedParent : c,
    );
    this.pageComments.set(pageComments);

    this.apiService.updateComment(updatedParent.id, updatedParent).subscribe({
      error: (err) => console.error("Failed to save page reply:", err),
    });
  }

  markInboxRead(id: string) {
    const inbox = this.inbox().map(i => i.id === id ? { ...i, unread: false } : i);
    this.inbox.set(inbox);
    this.apiService.markInboxItemRead(id).subscribe({
      error: (err) => console.error('Failed to mark inbox read:', err),
    });
  }

  markAllInboxRead() {
    const uid = this.currentUserId();
    if (!uid) return;
    this.inbox.update((items) => items.map((i) => ({ ...i, unread: false })));
    this.apiService.markAllInboxRead(uid).subscribe();
  }

  setTweak(key: keyof TweakDefaults, value: string) {
    this.tweaks.update((t) => ({ ...t, [key]: value }));
    const uid = this.currentUserId();
    if (!uid) return;
    const tw = this.tweaks();
    this.apiService
      .putPreferences(uid, {
        theme: tw.theme,
        accent: tw.accent,
        pageWidth: tw.pageWidth,
      })
      .subscribe();
  }
}
