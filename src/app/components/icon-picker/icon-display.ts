import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { hasIcon, isImageIcon } from '../../icons/icon-utils';

@Component({
  selector: 'app-icon-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (hasIcon) {
      @if (isImage) {
        <img [src]="icon" [alt]="alt" [class]="klass" [style.width.px]="size" [style.height.px]="size" />
      } @else {
        <span [class]="klass" [style.font-size.px]="size">{{ icon }}</span>
      }
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      img {
        object-fit: contain;
        border-radius: 4px;
      }
    `,
  ],
})
export class IconDisplay {
  @Input() icon: string | undefined = '';
  @Input() size = 16;
  @Input() alt = '';
  @Input() klass = '';

  get hasIcon(): boolean {
    return hasIcon(this.icon);
  }

  get isImage(): boolean {
    return isImageIcon(this.icon);
  }
}
