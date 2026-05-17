import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Page, Person, TreeNode, Workspace, InboxItem, Comment, Reaction } from '../models';

export interface ShareMember {
  userId: string;
  permission: 'view' | 'comment' | 'edit' | 'owner';
  name?: string;
}

export interface ShareSettings {
  pageId: string;
  linkSharingEnabled: boolean;
  members: ShareMember[];
}

export interface PageTemplate {
  id: string;
  title: string;
  icon: string;
  markdownBody: string;
}

export interface Backlink {
  pageId: string;
  title: string;
  icon: string;
  breadcrumb: string[];
}

export interface PageHistoryEntry {
  id: string;
  pageId: string;
  title: string;
  savedAt: string;
  savedBy?: string;
}

/** Nested reply blob stored inside parent `repliesJson`. */
function serializeReplyPayload(r: Comment): Record<string, unknown> {
  return {
    id: r.id,
    author: r.author,
    text: r.text,
    at: r.at,
    resolved: r.resolved,
    reactions: r.reactions ?? {},
    replies: (r.replies ?? []).map(serializeReplyPayload),
  };
}

/** Shape expected by LumenApi `Comment` (JSON uses camelCase). */
export function serializeCommentForApi(c: Comment): Record<string, unknown> {
  return {
    id: c.id,
    author: c.author,
    text: c.text,
    at: c.at,
    resolved: c.resolved,
    pageId: c.pageId ?? '',
    blockIdx: c.blockIdx ?? null,
    parentCommentId: c.parentCommentId ?? null,
    repliesJson: JSON.stringify((c.replies ?? []).map(serializeReplyPayload)),
    reactionsJson: JSON.stringify(c.reactions ?? {}),
  };
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5013/api';
  readonly currentUserId = 'MC';

  // Pages
  getPages(workspaceId?: string): Observable<Record<string, Page>> {
    const q = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
    return this.http.get<Record<string, Page>>(`${this.apiUrl}/pages${q}`);
  }

  getPage(id: string): Observable<Page> {
    return this.http.get<Page>(`${this.apiUrl}/pages/${id}`);
  }

  updatePage(id: string, updates: Partial<Page>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/pages/${id}`, updates);
  }

  createPage(payload: Partial<Page> & { id: string; workspaceId?: string }): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.apiUrl}/pages`, payload);
  }

  deletePage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/pages/${id}`);
  }

  restorePage(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/pages/${id}/restore`, {});
  }

  duplicatePage(id: string): Observable<{ id: string; page: Page }> {
    return this.http.post<{ id: string; page: Page }>(
      `${this.apiUrl}/pages/${id}/duplicate?userId=${this.currentUserId}`,
      {},
    );
  }

  getTrash(workspaceId?: string): Observable<Page[]> {
    const q = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
    return this.http.get<Page[]>(`${this.apiUrl}/pages/trash${q}`);
  }

  getShare(pageId: string): Observable<ShareSettings> {
    return this.http.get<ShareSettings>(`${this.apiUrl}/pages/${pageId}/share`);
  }

  putShare(pageId: string, settings: Partial<ShareSettings>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/pages/${pageId}/share`, settings);
  }

  getBacklinks(pageId: string): Observable<Backlink[]> {
    return this.http.get<Backlink[]>(`${this.apiUrl}/pages/${pageId}/backlinks`);
  }

  getHistory(pageId: string): Observable<PageHistoryEntry[]> {
    return this.http.get<PageHistoryEntry[]>(`${this.apiUrl}/pages/${pageId}/history`);
  }

  getHistoryVersion(pageId: string, versionId: string): Observable<Page> {
    return this.http.get<Page>(`${this.apiUrl}/pages/${pageId}/history/${versionId}`);
  }

  // People & workspaces
  getPeople(): Observable<Record<string, Person>> {
    return this.http.get<Record<string, Person>>(`${this.apiUrl}/data/people`);
  }

  getWorkspaces(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(`${this.apiUrl}/data/workspaces`);
  }

  getTree(workspaceId: string = 'acme'): Observable<TreeNode[]> {
    return this.http.get<TreeNode[]>(`${this.apiUrl}/data/tree?workspaceId=${encodeURIComponent(workspaceId)}`);
  }

  putTree(tree: TreeNode[], workspaceId: string = 'acme'): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/data/tree?workspaceId=${encodeURIComponent(workspaceId)}`,
      tree,
    );
  }

  // Comments
  getComments(): Observable<Record<string, Comment[]>> {
    return this.http.get<Record<string, Comment[]>>(`${this.apiUrl}/comments`);
  }

  createComment(comment: Comment): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/comments`, serializeCommentForApi(comment));
  }

  updateComment(id: string, comment: Comment): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/comments/${id}`, serializeCommentForApi(comment));
  }

  deleteComment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/comments/${id}`);
  }

  // Reactions
  getReactions(): Observable<Record<string, Record<string, string[]>>> {
    return this.http.get<Record<string, Record<string, string[]>>>(`${this.apiUrl}/reactions`);
  }

  addReaction(reaction: Reaction): Observable<Reaction> {
    return this.http.post<Reaction>(`${this.apiUrl}/reactions`, reaction);
  }

  // Inbox
  getInbox(userId: string = this.currentUserId): Observable<InboxItem[]> {
    return this.http.get<InboxItem[]>(`${this.apiUrl}/inbox?userId=${userId}`);
  }

  markInboxItemRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/inbox/${id}/read`, {});
  }

  markAllInboxRead(userId: string = this.currentUserId): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/inbox/read-all?userId=${userId}`, {});
  }

  // Favorites
  getFavorites(userId: string = this.currentUserId): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/favorites?userId=${userId}`);
  }

  addFavorite(pageId: string, userId: string = this.currentUserId): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/favorites/${pageId}?userId=${userId}`, {});
  }

  removeFavorite(pageId: string, userId: string = this.currentUserId): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/favorites/${pageId}?userId=${userId}`);
  }

  // Preferences
  getPreferences(userId: string = this.currentUserId): Observable<{
    theme: string;
    accent: string;
    currentWorkspaceId: string;
  }> {
    return this.http.get<{ theme: string; accent: string; currentWorkspaceId: string }>(
      `${this.apiUrl}/preferences/${userId}`,
    );
  }

  putPreferences(
    userId: string,
    prefs: Partial<{ theme: string; accent: string; currentWorkspaceId: string }>,
  ): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/preferences/${userId}`, prefs);
  }

  // Templates
  getTemplates(): Observable<PageTemplate[]> {
    return this.http.get<PageTemplate[]>(`${this.apiUrl}/templates`);
  }
}
