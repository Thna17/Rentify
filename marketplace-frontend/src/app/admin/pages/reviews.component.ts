import { Component, inject, signal } from '@angular/core';
import { AdminService, Review } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { dstr } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent, ConfirmComponent, IconComponent, MenuComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Reviews</h1><p class="page-sub">Moderate buyer reviews across the marketplace</p></div></div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Product</th><th>Buyer</th><th>Rating</th><th>Comment</th><th>Date</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>
        @for (r of d.reviews(); track r.id) {
          <tr>
            <td class="cell-main">{{r.product}}</td><td>{{r.buyer}}</td>
            <td><span class="stars">{{'★'.repeat(r.rating)}}</span><span class="stars" style="opacity:.25">{{'★'.repeat(5 - r.rating)}}</span></td>
            <td class="cell-sub">{{r.comment}}</td><td class="cell-sub">{{dstr(r.date)}}</td>
            <td><kc-badge [value]="r.status"></kc-badge></td>
            <td class="right"><div class="cell-actions">
              <button class="icon-btn" [attr.data-tip]="r.status === 'visible' ? 'Hide review' : 'Show review'"
                [attr.aria-label]="r.status === 'visible' ? 'Hide review' : 'Show review'"
                (click)="d.setReviewStatus(r.id, r.status === 'visible' ? 'hidden' : 'visible')">
                <kc-icon [name]="r.status === 'visible' ? 'eye-off' : 'eye'" [size]="14"></kc-icon></button>
              <kc-menu [items]="[{label: 'Delete review', icon: 'trash', danger: true, action: 'delete'}]" (pick)="del.set(r)"></kc-menu>
            </div></td>
          </tr>
        }
      </tbody>
    </table></div>

    @if (del(); as r) {
      <kc-confirm title="Delete review?" [message]="'The review by ' + r.buyer + ' on ' + r.product + ' will be permanently removed.'"
        confirmLabel="Delete" (confirm)="d.deleteReview(r.id); del.set(null)" (cancel)="del.set(null)"></kc-confirm>
    }
  } @else { <div class="skel" style="height:280px"></div> }`,
})
export class ReviewsComponent {
  d = inject(AdminService);
  del = signal<Review | null>(null);
  dstr = dstr;
}