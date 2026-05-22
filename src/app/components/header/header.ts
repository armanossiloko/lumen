import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Page, CurrentUser } from '../../models';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="avatar" 
      [title]="title"
      [style.width.px]="size"
      [style.height.px]="size"
      [style.background]="color"
      [style.fontSize.px]="size * 0.45"
      [style.boxShadow]="ring ? '0 0 0 2px var(--bg)' : 'none'"
    >{{initial}}</span>
  `,
  styles: []
})
export class Avatar {
  @Input() initial!: string;
  @Input() color!: string;
  @Input() size: number = 22;
  @Input() title?: string;
  @Input() ring?: boolean;
}

@Component({
  selector: 'app-avatar-stack',
  standalone: true,
  imports: [CommonModule, Avatar],
  template: `
    <div class="avatar-stack">
      @for (id of shown; track id; let i = $index) {
        <app-avatar 
          [initial]="getPerson(id).initial" 
          [color]="getPerson(id).color" 
          [size]="22" 
          [title]="getPerson(id).name"
          [ring]="true"
        />
      }
      @if (extra > 0) {
        <span class="avatar avatar-more" [style.width.px]="22" [style.height.px]="22">+{{extra}}</span>
      }
    </div>
  `,
  styles: []
})
export class AvatarStack {
  @Input() ids: string[] = [];
  @Input() max: number = 4;
  @Input() people: any = {};

  get shown() {
    return this.ids.slice(0, this.max);
  }

  get extra() {
    return this.ids.length - this.shown.length;
  }

  getPerson(id: string) {
    const p = this.people[id] || { name: id, color: '#888' };
    return { ...p, initial: id[0] };
  }
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, Avatar, AvatarStack],
  templateUrl: './header.html',
  styles: []
})
export class Header {
  @Input() page!: Page;
  @Input() theme!: string;
  @Input() unreadCount: number = 0;
  @Input() viewers: string[] = [];
  @Input() people: any = {};
  /** Parallel to page.breadcrumb: page id to open when that crumb is clickable, else null. */
  @Input() crumbLinkIds: (string | null)[] = [];
  @Input() canGoBack: boolean = false;
  @Input() canGoForward: boolean = false;
  @Input() currentUser: CurrentUser | null = null;

  @Output() selectPage = new EventEmitter<string>();
  @Output() themeChange = new EventEmitter<string>();
  @Output() openSearch = new EventEmitter<void>();
  @Output() share = new EventEmitter<void>();
  @Output() openActions = new EventEmitter<void>();
  @Output() openInbox = new EventEmitter<void>();
  @Output() signOut = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();
  @Output() goForward = new EventEmitter<void>();
}
