import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Avatar } from '../header/header';
import { Page } from '../../models';

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
            <input placeholder="User id (e.g. JD)…" [(ngModel)]="inviteUserId" (keydown.enter)="invite()" />
            <select class="share-role" [(ngModel)]="invitePermission">
              <option value="edit">Can edit</option>
              <option value="comment">Can comment</option>
              <option value="view">Can view</option>
            </select>
            <button type="button" class="btn btn-primary" (click)="invite()">Invite</button>
          </div>
          <div class="share-section">People with access</div>
          @for (m of members; track m.userId) {
            <div class="share-person">
              <app-avatar [initial]="m.userId[0]" [color]="getPerson(m.userId).color" [size]="28" />
              <div class="share-person-meta">
                <div class="share-person-name">{{ getPerson(m.userId).name }}</div>
              </div>
              <select class="share-role" [ngModel]="m.permission" (ngModelChange)="updatePermission(m.userId, $event)">
                <option value="edit">Can edit</option>
                <option value="comment">Can comment</option>
                <option value="view">Can view</option>
              </select>
              <button type="button" class="tree-act" (click)="removeMember(m.userId)">×</button>
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
export class ShareModal {
  @Input() open = false;
  @Input() page!: Page;
  @Input() people: Record<string, { name: string; color: string }> = {};
  @Input() members: { userId: string; permission: string }[] = [];
  @Input() linkSharing = false;

  @Output() onClose = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() copyLink = new EventEmitter<void>();
  @Output() membersChange = new EventEmitter<{ userId: string; permission: string }[]>();
  @Output() linkSharingChange = new EventEmitter<boolean>();

  inviteUserId = '';
  invitePermission: 'view' | 'comment' | 'edit' = 'edit';

  getPerson(id: string) {
    return this.people[id] || { name: id, color: '#888' };
  }

  invite() {
    const id = this.inviteUserId.trim().toUpperCase();
    if (!id || this.members.some((m) => m.userId === id)) return;
    this.membersChange.emit([...this.members, { userId: id, permission: this.invitePermission }]);
    this.inviteUserId = '';
  }

  removeMember(userId: string) {
    this.membersChange.emit(this.members.filter((m) => m.userId !== userId));
  }

  updatePermission(userId: string, permission: string) {
    this.membersChange.emit(this.members.map((m) => (m.userId === userId ? { ...m, permission } : m)));
  }
}
