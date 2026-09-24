import { Component, computed, inject, signal } from '@angular/core';
import { AdminService, Report } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { IconComponent } from '../ui/icon.component';
import { dstr } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent, IconComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Reports</h1><p class="page-sub">Buyer, seller and product reports — review, resolve or dismiss</p></div></div>
    <div class="toolbar">
      <div class="tabs">
        @for (t of ['open', 'resolved', 'dismissed', 'all']; track t) {
          <button class="tab" [class.active]="tab() === t" (click)="tab.set(t)">{{t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}}</button>
        }
      </div>
    </div>

    <div class="grid half">
      @for (r of rows(); track r.id) {
        <div class="card card-pad" style="cursor:pointer" (click)="sel.set(r)">
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">
            <kc-badge [value]="r.kind"></kc-badge><b>{{r.target}}</b><span class="spacer"></span><kc-badge [value]="r.status"></kc-badge>
          </div>
          <p class="muted" style="margin:0 0 6px">“{{r.reason}}”</p>
          <div class="cell-sub">Reported by {{r.reporter}} · {{dstr(r.date)}}</div>
        </div>
      } @empty { <div class="card"><div class="empty">No reports in this view. 🎉</div></div> }
    </div>

    @if (sel(); as r) {
      <div class="drawer-back" (click)="sel.set(null)"></div>
      <div class="drawer">
        <div class="drawer-head"><div><b>{{r.kind}} report</b> <kc-badge [value]="r.status"></kc-badge></div>
          <button class="icon-btn" aria-label="Close" (click)="sel.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
        <div class="drawer-body">
          <div class="kv"><span class="k">Target</span>{{r.target}}</div>
          <div class="kv"><span class="k">Reporter</span>{{r.reporter}}</div>
          <div class="kv"><span class="k">Date</span>{{dstr(r.date)}}</div>
          <div class="kv"><span class="k">Reason</span>{{r.reason}}</div>
          <div class="sect">Internal notes</div>
          @for (n of r.notes; track n.date) { <div class="list-item"><div><div>{{n.text}}</div><div class="cell-sub">{{dstr(n.date)}}</div></div></div> }
          <div style="display:flex;gap:8px;margin-top:8px">
            <input class="input" style="flex:1" placeholder="Add internal note…" [value]="note()" (input)="note.set($any($event.target).value)"/>
            <button class="btn" [disabled]="!note().trim()" (click)="addNote(r.id)">Add</button>
          </div>
          @if (r.status === 'open') {
            <div class="sect">Actions</div>
            <div class="cell-actions" style="justify-content:flex-start">
              <button class="btn btn-primary" (click)="d.setReportStatus(r.id, 'resolved'); sel.set(null)">Resolve</button>
              <button class="btn btn-danger" (click)="d.setReportStatus(r.id, 'dismissed'); sel.set(null)">Dismiss</button>
            </div>
          }
        </div>
      </div>
    }
  } @else { <div class="skel" style="height:300px"></div> }`,
})
export class ReportsComponent {
  d = inject(AdminService);
  tab = signal('open');
  sel = signal<Report | null>(null);
  note = signal('');
  dstr = dstr;
  rows = computed(() => this.d.reports().filter(r => this.tab() === 'all' || r.status === this.tab()));
  addNote(id: string) { if (this.note().trim()) { this.d.addReportNote(id, this.note().trim()); this.note.set(''); } }
}