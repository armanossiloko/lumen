import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FOLDER_ICON_PRESETS,
  PAGE_ICON_PRESETS,
} from '../../icons/icon-presets';
import { fileToIconDataUrl, normalizeIconInput } from '../../icons/icon-utils';

@Component({
  selector: 'app-icon-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="icon-picker">
      <div class="icon-picker-preview-row">
        <div
          class="icon-picker-preview"
          [class.icon-picker-preview--empty]="!value()"
          aria-hidden="true"
        >
          @if (value() && !isImage(value())) {
            <span class="icon-picker-emoji">{{ value() }}</span>
          } @else if (value() && isImage(value())) {
            <img [src]="value()" alt="" class="icon-picker-img" />
          } @else {
            <span class="icon-picker-none">—</span>
          }
        </div>
        <div class="icon-picker-preview-meta">
          <div class="icon-picker-preview-label">
            @if (!value()) {
              No icon selected
            } @else if (isImage(value())) {
              Custom image
            } @else {
              {{ value() }}
            }
          </div>
          @if (value()) {
            <button type="button" class="icon-picker-remove" (click)="selectNone()">
              Remove icon
            </button>
          }
        </div>
      </div>

      <div class="icon-picker-tabs">
        <button
          type="button"
          [class.is-active]="mode() === 'preset'"
          (click)="mode.set('preset')"
        >Presets</button>
        <button
          type="button"
          [class.is-active]="mode() === 'upload'"
          (click)="mode.set('upload')"
        >Upload</button>
      </div>

      @if (mode() === 'preset') {
        <div class="icon-picker-grid" role="listbox">
          @for (emoji of presets; track emoji) {
            <button
              type="button"
              class="icon-picker-cell"
              [class.is-selected]="value() === emoji"
              (click)="selectPreset(emoji)"
              [attr.aria-label]="emoji"
            >{{ emoji }}</button>
          }
        </div>
      }

      @if (mode() === 'upload') {
        <div class="icon-picker-upload">
          <label class="btn btn-ghost icon-picker-upload-btn">
            Choose image…
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              class="icon-picker-file"
              (change)="onFile($event)"
            />
          </label>
          <p class="icon-picker-hint">PNG, JPG, GIF, WebP, or SVG · max 256 KB · resized to 64px</p>
          @if (uploadError()) {
            <p class="icon-picker-error">{{ uploadError() }}</p>
          }
        </div>
      }

      @if (uploading()) {
        <p class="icon-picker-hint">Processing image…</p>
      }
    </div>
  `,
  styles: [],
})
export class IconPicker {
  @Input() set icon(v: string) {
    this.value.set(normalizeIconInput(v));
    this.mode.set(this.isImage(v) ? 'upload' : 'preset');
  }

  @Input() variant: 'page' | 'folder' = 'page';

  @Output() iconChange = new EventEmitter<string>();

  value = signal('');
  mode = signal<'preset' | 'upload'>('preset');
  uploading = signal(false);
  uploadError = signal<string | null>(null);

  get presets(): readonly string[] {
    return this.variant === 'folder' ? FOLDER_ICON_PRESETS : PAGE_ICON_PRESETS;
  }

  isImage(icon: string): boolean {
    return icon.startsWith('data:image/');
  }

  selectPreset(emoji: string) {
    this.value.set(emoji);
    this.mode.set('preset');
    this.uploadError.set(null);
    this.iconChange.emit(emoji);
  }

  selectNone() {
    this.value.set('');
    this.mode.set('preset');
    this.uploadError.set(null);
    this.iconChange.emit('');
  }

  async onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.uploading.set(true);
    this.uploadError.set(null);
    try {
      const dataUrl = await fileToIconDataUrl(file);
      this.value.set(dataUrl);
      this.mode.set('upload');
      this.iconChange.emit(dataUrl);
    } catch (e) {
      this.uploadError.set(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      this.uploading.set(false);
    }
  }
}
