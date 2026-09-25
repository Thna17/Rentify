import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, WebsiteTemplate } from '../services/admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { IconComponent } from '../ui/icon.component';

@Component({
  standalone: true,
  imports: [BadgeComponent, IconComponent, FormsModule],
  template: `
  @if (d.ready()) {
    <div class="page-head">
      <div>
        <h1 class="page-title">Storefront Templates</h1>
        <p class="page-sub">Configure platform storefront templates, themes, color palettes and framework runners</p>
      </div>
      <button class="btn btn-primary" (click)="openAdd.set(true)">
        <kc-icon name="plus" [size]="14"></kc-icon> Create Template
      </button>
    </div>

    <div class="grid g3 mb">
      @for (t of d.templates(); track t.id) {
        <div class="card" style="display:flex;flex-direction:column">
          <div class="card-head">
            <h3 class="card-title">{{t.name}}</h3>
            <kc-badge [value]="t.status"></kc-badge>
          </div>
          <div class="card-pad" style="flex:1;display:flex;flex-direction:column">
            <p class="muted" style="margin-top:0;font-size:12.5px;min-height:36px">{{t.description}}</p>

            <div class="sect">Palette Preview</div>
            <div class="cell-flex" style="gap:6px;margin-bottom:12px">
              <span [style.background]="t.colorPalette.primary" style="width:24px;height:24px;border-radius:6px;display:inline-block;border:1px solid rgba(0,0,0,0.1)" title="Primary"></span>
              <span [style.background]="t.colorPalette.secondary" style="width:24px;height:24px;border-radius:6px;display:inline-block;border:1px solid rgba(0,0,0,0.1)" title="Secondary"></span>
              @if (t.colorPalette.accent) {
                <span [style.background]="t.colorPalette.accent" style="width:24px;height:24px;border-radius:6px;display:inline-block;border:1px solid rgba(0,0,0,0.1)" title="Accent"></span>
              }
              <span [style.background]="t.colorPalette.background" style="width:24px;height:24px;border-radius:6px;display:inline-block;border:1px solid rgba(0,0,0,0.1)" title="Background"></span>
            </div>

            <div class="sect">Key Features</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
              @for (f of t.features; track f) {
                <span class="badge t-gray">{{f}}</span>
              }
            </div>

            <div style="margin-top:auto;padding-top:12px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between">
              <span class="cell-sub"><strong>{{t.storesUsing}}</strong> active stores</span>
              <div class="cell-flex" style="gap:8px">
                <a [href]="t.baseUrl" target="_blank" class="btn btn-sm">
                  Preview <kc-icon name="external" [size]="12"></kc-icon>
                </a>
                <button class="btn btn-sm" (click)="d.toggleTemplateStatus(t.id)">
                  {{t.status === 'active' ? 'Hide' : 'Publish'}}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>

    @if (openAdd()) {
      <div class="modal-back" (click)="openAdd.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Create Storefront Template</h3>
          <p>Add a new Vite template runner configuration to the Rentify platform catalog.</p>

          <div class="form-row">
            <label>Template Name</label>
            <input class="input" [(ngModel)]="newTemplate.name" placeholder="e.g. Modern Minimalist Boutique" />
          </div>
          <div class="form-row">
            <label>Category</label>
            <select class="input" [(ngModel)]="newTemplate.category">
              <option value="ecommerce">E-commerce</option>
              <option value="portfolio">Portfolio</option>
              <option value="services">Services</option>
            </select>
          </div>
          <div class="form-row">
            <label>Preview / Local URL</label>
            <input class="input" [(ngModel)]="newTemplate.baseUrl" placeholder="http://localhost:4700" />
          </div>
          <div class="form-row">
            <label>Description</label>
            <input class="input" [(ngModel)]="newTemplate.description" placeholder="Short description of aesthetic and target stores" />
          </div>

          <div class="modal-actions" style="margin-top:18px">
            <button class="btn" (click)="openAdd.set(false)">Cancel</button>
            <button class="btn btn-primary" [disabled]="!newTemplate.name" (click)="saveTemplate()">Create</button>
          </div>
        </div>
      </div>
    }
  } @else {
    <div class="skel" style="height:360px"></div>
  }`,
})
export class TemplatesComponent {
  d = inject(AdminService);
  openAdd = signal(false);

  newTemplate = {
    name: '',
    category: 'ecommerce' as const,
    framework: 'vite',
    baseUrl: 'http://localhost:4700',
    description: '',
    features: ['Responsive Layout', 'Fast Checkout', 'SEO Optimized'],
    colorPalette: { primary: '#1f2429', secondary: '#68707a', accent: '#8a1e2c', background: '#ffffff' },
    status: 'active' as const,
  };

  saveTemplate() {
    if (!this.newTemplate.name) return;
    this.d.addTemplate(this.newTemplate);
    this.openAdd.set(false);
    this.newTemplate = {
      name: '',
      category: 'ecommerce',
      framework: 'vite',
      baseUrl: 'http://localhost:4700',
      description: '',
      features: ['Responsive Layout', 'Fast Checkout', 'SEO Optimized'],
      colorPalette: { primary: '#1f2429', secondary: '#68707a', accent: '#8a1e2c', background: '#ffffff' },
      status: 'active',
    };
  }
}
