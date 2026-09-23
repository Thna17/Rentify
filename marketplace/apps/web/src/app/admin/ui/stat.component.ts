import { Component, input } from '@angular/core';
import { IconComponent } from './icon.component';
@Component({ selector: 'kc-stat', standalone: true, imports: [IconComponent], template: `
  <div class="card stat">
    <span class="label"><kc-icon [name]="icon()" [size]="13"></kc-icon>{{label()}}</span>
    <span class="value">{{value()}}</span>
    @if (hint()) { <span class="hint">{{hint()}}</span> }
  </div>` })
export class StatComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  icon = input('grid');
  hint = input('');
}