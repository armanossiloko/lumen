import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Avatar } from '../header/header';
import { Page } from '../../models';

interface InviteCandidate {
  id: string;
  name: string;
  color: string;
  initial: string;
}

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, Avatar],
  template: `
    @if (open) {
      <div class="cmd-overlay" (click)="onClose.emit()">
        <div class="share" (click)="$event.stopPropagation()">
          <div class="share-hd">
            <div class="share-title">Share "{{ page.title }}"</div>
            <button type="button" class="hd-icon-btn" (click)="onClose.emit()">×</button>
          </div>
          <div class="share-input">
            <div class="share-invite-field">
              <input
                type="text"
                class="share-invite-search"
                placeholder="Search people by name…"
                [(ngModel)]="inviteQuery"
                (ngModelChange)="onInviteQueryChange()"
                (focus)="invitePickerOpen = true"
                (blur)="onInviteBlur()"
                (keydown.enter)="invite(); $event.preventDefault()"
                autocomplete="off"
                spellcheck="false"
              />
              @if (invitePickerOpen) {
                <div class="share-invite-list" role="listbox">
                  @if (inviteCandidates.length === 0) {
                    <div class="share-invite-empty">No matching people</div>
                  } @else {
                    @for (p of inviteCandidates; track p.id) {
                      <button
                        type="button"
                        class="share-invite-option"
                        [class.is-selected]="selectedInviteId === p.id"
                        (mousedown)="$event.preventDefault()"
                        (click)="selectInvite(p.id)"
                      >
                        <app-avatar [initial]="p.initial" [color]="p.color" [size]="24" />
                        <span class="share-invite-option-name">{{ p.name }}</span>
                      </button>
                    }
                  }
                </div>
              }
            </div>
            <select class="share-role" [(ngModel)]="invitePermission">
              <option value="edit">Can edit</option>
              <option value="comment">Can comment</option>
              <option value="view">Can view</option>
            </select>
            <button type="button" class="btn btn-primary" [disabled]="!canInvite" (click)="invite()">Invite</button>
          </div>
          <div class="share-section">People with access</div>
          @for (m of members; track m.userId) {
            <div class="share-person">
              <app-avatar [initial]="personInitial(m.userId)" [color]="getPerson(m.userId).color" [size]="28" />
              <div class="share-person-meta">
                <div class="share-person-name">{{ getPerson(m.userId).name }}</div>
              </div>
              <div class="share-person-actions">
                @if (m.permission === 'owner') {
                  <span class="share-role-tag">Owner</span>
                } @else {
                  <select class="share-role" [ngModel]="m.permission" (ngModelChange)="updatePermission(m.userId, $event)">
                    <option value="edit">Can edit</option>
                    <option value="comment">Can comment</option>
                    <option value="view">Can view</option>
                  </select>
                  <button
                    type="button"
                    class="share-remove"
                    (click)="removeMember(m.userId)"
                    [attr.aria-label]="'Remove ' + getPerson(m.userId).name"
                    title="Remove access"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                    <span class="share-remove-label">Remove</span>
                  </button>
                }
              </div>
            </div>
          }
          <label class="share-general">
            <input type="checkbox" [ngModel]="linkSharing" (ngModelChange)="linkSharingChange.emit($event)" />
            Anyone with the link can view
          </label>
          <div class="share-foot">
            <button type="button" class="btn btn-ghost" (click)="copyLink.emit()">Copy link</button>
            <button type="button" class="btn btn-primary" (click)="save.emit()">Done</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ShareModal implements OnChanges {
  @Input() open = false;
  @Input() page!: Page;
  @Input() people: Record<string, { name: string; color: string; initial?: string }> = {};
  @Input() members: { userId: string; permission: string }[] = [];
  @Input() linkSharing = false;

  @Output() onClose = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() copyLink = new EventEmitter<void>();
  @Output() membersChange = new EventEmitter<{ userId: string; permission: string }[]>();
  @Output() linkSharingChange = new EventEmitter<boolean>();

  inviteQuery = '';
  selectedInviteId: string | null = null;
  invitePickerOpen = false;
  invitePermission: 'view' | 'comment' | 'edit' = 'edit';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && !this.open) {
      this.resetInvite();
    }
  }

  get inviteCandidates(): InviteCandidate[] {
    const q = this.inviteQuery.trim().toLowerCase();
    const memberIds = new Set(this.members.map((m) => m.userId));
    return Object.entries(this.people)
      .filter(([id]) => !memberIds.has(id))
      .map(([id, p]) => ({
        id,
        name: p.name,
        color: p.color,
        initial: p.initial ?? id[0],
      }))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get canInvite(): boolean {
    if (this.selectedInviteId) return true;
    return this.inviteQuery.trim().length > 0 && this.inviteCandidates.length === 1;
  }

  getPerson(id: string) {
    return this.people[id] || { name: id, color: '#888' };
  }

  personInitial(id: string): string {
    const p = this.people[id];
    return p?.initial ?? id[0];
  }

  onInviteQueryChange() {
    this.selectedInviteId = null;
    this.invitePickerOpen = true;
  }

  onInviteBlur() {
    setTimeout(() => {
      this.invitePickerOpen = false;
    }, 150);
  }

  selectInvite(id: string) {
    this.selectedInviteId = id;
    this.inviteQuery = this.getPerson(id).name;
    this.invitePickerOpen = false;
  }

  invite() {
    const id = this.selectedInviteId ?? (this.inviteCandidates.length === 1 ? this.inviteCandidates[0].id : null);
    if (!id || this.members.some((m) => m.userId === id)) return;
    this.membersChange.emit([...this.members, { userId: id, permission: this.invitePermission }]);
    this.resetInvite();
  }

  removeMember(userId: string) {
    this.membersChange.emit(this.members.filter((m) => m.userId !== userId));
  }

  updatePermission(userId: string, permission: string) {
    this.membersChange.emit(this.members.map((m) => (m.userId === userId ? { ...m, permission } : m)));
  }

  private resetInvite() {
    this.inviteQuery = '';
    this.selectedInviteId = null;
    this.invitePickerOpen = false;
    this.invitePermission = 'edit';
  }
}
