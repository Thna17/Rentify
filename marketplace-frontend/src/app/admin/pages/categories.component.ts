import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { IconComponent } from '../ui/icon.component';

@Component({
  standalone: true, imports: [BadgeComponent, IconComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Categories</h1><p class="page-sub">Organise the marketplace catalogue</p></div></div>
    <div class="toolbar">
      <input class="input input-search" placeholder="New category name" [value]="name()" (input)="name.set($any($event.target).value)"/>
      <button class="btn btn-primary" [disabled]="!name().trim()" (click)="add()">Add category</button>
    </div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Category</th><th class="right">Products</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>
        @for (c of d.categories(); track c.id) {
          <tr><td class="cell-main">{{c.name}}</td>
            <td class="num">{{d.products().filter(p => p.category === c.name).length}}</td>
            <td><kc-badge [value]="c.status"></kc-badge></td>
            <td class="right"><div class="cell-actions">
              <button class="icon-btn" [attr.data-tip]="c.status === 'active' ? 'Hide category' : 'Show category'"
                [attr.aria-label]="c.status === 'active' ? 'Hide category' : 'Show category'"
                (click)="d.toggleCategory(c.id)">
                <kc-icon [name]="c.status === 'active' ? 'eye-off' : 'eye'" [size]="14"></kc-icon></button>
            </div></td></tr>
        }
      </tbody>
    </table></div>
  } @else { <div class="skel" style="height:280px"></div> }`,
})
export class CategoriesComponent {
  d = inject(AdminService);
  name = signal('');
  add() { if (this.name().trim()) { this.d.addCategory(this.name().trim()); this.name.set(''); } }
}