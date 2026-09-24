import { Component, computed, inject, signal } from '@angular/core';
import { AdminService } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { dstr } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Activity Logs</h1><p class="page-sub">Important platform events, newest first</p></div></div>
    <div class="toolbar">
      <select class="input" [value]="kind()" (change)="kind.set($any($event.target).value)">
        <option value="all">All events</option><option value="active">Registrations</option>
        <option value="approved">Approvals</option><option value="suspended">Suspensions</option>
        <option value="failed">Failures</option><option value="resolved">Resolutions</option>
      </select>
    </div>
    <div class="card card-pad">
      @for (l of rows(); track l.id) {
        <div class="list-item"><span class="pulse-dot"></span>
          <div style="flex:1"><div>{{l.action}}</div><div class="cell-sub">{{l.actor}} · {{dstr(l.date)}}</div></div>
          <kc-badge [value]="l.kind"></kc-badge>
        </div>
      } @empty { <div class="empty">No log entries for this filter.</div> }
    </div>
  } @else { <div class="skel" style="height:300px"></div> }`,
})
export class ActivityLogsComponent {
  d = inject(AdminService);
  kind = signal('all');
  dstr = dstr;
  rows = computed(() => this.d.logs().filter(l => this.kind() === 'all' || l.kind === this.kind()));
}