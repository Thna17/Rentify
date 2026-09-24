import { Component, input, output, signal } from '@angular/core';
import { IconComponent } from './icon.component';

export interface MenuItem { label: string; icon?: string; danger?: boolean; action: string }

@Component({ selector: 'kc-menu', standalone: true, imports: [IconComponent], template: `
  <div class="menu-wrap">
    <button class="icon-btn" aria-label="More actions" data-tip="More actions"
      (click)="$event.stopPropagation(); open.set(!open())">
      <kc-icon name="dots" [size]="15"></kc-icon>
    </button>
    @if (open()) {
      <button class="menu-back" (click)="$event.stopPropagation(); open.set(false)"></button>
      <div class="menu" (click)="$event.stopPropagation()">
        @for (i of items(); track i.label) {
          <button class="menu-item" [class.danger]="!!i.danger" (click)="open.set(false); pick.emit(i.action)">
            @if (i.icon) { <kc-icon [name]="i.icon" [size]="14"></kc-icon> } {{i.label}}
          </button>
        }
      </div>
    }
  </div>` })
export class MenuComponent {
  items = input<MenuItem[]>([]);
  pick = output<string>();
  open = signal(false);
}