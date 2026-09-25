import { Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'kc-stat',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="card stat-card" [class.stat-urgent]="urgent()">
      <div class="stat-top">
        <span class="stat-label">{{label()}}</span>
        <div class="stat-icon-wrap" [class.icon-urgent]="urgent()">
          <kc-icon [name]="icon()" [size]="15"></kc-icon>
        </div>
      </div>
      <div class="stat-val">{{value()}}</div>
      @if (hint() || trend()) {
        <div class="stat-foot">
          @if (trend()) {
            <span class="stat-trend" [class.trend-up]="trendPositive()" [class.trend-down]="!trendPositive()">
              <kc-icon [name]="trendPositive() ? 'trending-up' : 'trending-down'" [size]="12"></kc-icon>
              {{trend()}}
            </span>
          }
          @if (hint()) {
            <span class="stat-hint">{{hint()}}</span>
          }
        </div>
      }
    </div>`,
})
export class StatComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  icon = input('grid');
  hint = input('');
  trend = input('');
  trendPositive = input(true);
  urgent = input(false);
}
