import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-comment-reactions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cmt-reactions" (click)="$event.stopPropagation()">
      @for (emoji of emojiKeys(); track emoji) {
        <button
          type="button"
          [class]="'reaction' + (isMine(emoji) ? ' is-mine' : '')"
          (click)="toggleEmoji.emit(emoji)"
        >
          <span class="reaction-emoji">{{ emoji }}</span>
          <span class="reaction-count">{{ reactionsSafe()[emoji].length }}</span>
        </button>
      }
      <div class="reaction-add-wrap">
        <button
          type="button"
          class="reaction reaction-add"
          (click)="pickerOpen.set(!pickerOpen())"
          title="Add reaction"
        >
          <svg width="13" height="13" viewBox="0 0 13 13">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <circle cx="5" cy="5.5" r=".7" fill="currentColor" />
            <circle cx="8" cy="5.5" r=".7" fill="currentColor" />
            <path
              d="M4.5 8c.5.7 1.3 1.2 2 1.2S8 8.7 8.5 8"
              stroke="currentColor"
              strokeWidth="1.1"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <span>+</span>
        </button>
        @if (pickerOpen()) {
          <div class="reaction-picker">
            @for (e of palette; track e) {
              <button type="button" class="reaction-pick" (click)="pick(e)">{{ e }}</button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [],
})
export class CommentReactions {
  @Input() reactions: Record<string, string[]> | undefined;
  @Input() viewerId = 'MC';

  @Output() toggleEmoji = new EventEmitter<string>();

  pickerOpen = signal(false);
  palette = ['👍', '❤️', '🎉', '🚀', '👀', '🌱', '🔥', '💯', '✅', '👋'];

  reactionsSafe(): Record<string, string[]> {
    return this.reactions ?? {};
  }

  emojiKeys(): string[] {
    return Object.keys(this.reactionsSafe());
  }

  isMine(emoji: string): boolean {
    return (this.reactionsSafe()[emoji] ?? []).includes(this.viewerId);
  }

  pick(e: string): void {
    this.toggleEmoji.emit(e);
    this.pickerOpen.set(false);
  }
}
