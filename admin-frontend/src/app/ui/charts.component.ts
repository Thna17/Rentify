import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'kc-bars',
  standalone: true,
  template: `
    <div class="bars-container">
      <div class="bars-grid">
        <div class="grid-line"><span>100</span></div>
        <div class="grid-line"><span>75</span></div>
        <div class="grid-line"><span>50</span></div>
        <div class="grid-line"><span>25</span></div>
        <div class="grid-line"><span>0</span></div>
      </div>
      <div class="bars-track">
        @for (d of data(); track d.label; let idx = $index) {
          <div class="bar-col" (mouseenter)="hoverIdx.set(idx)" (mouseleave)="hoverIdx.set(null)">
            @if (hoverIdx() === idx) {
              <div class="bar-tooltip">
                <span class="tip-val">{{d.value}}</span>
                <span class="tip-lbl">{{d.label}}</span>
              </div>
            }
            <div class="bar-wrap">
              <div class="bar" [style.height.%]="pct(d.value)" [class.bar-active]="hoverIdx() === idx"></div>
            </div>
            <span class="bar-lbl" [class.lbl-active]="hoverIdx() === idx">{{d.label}}</span>
          </div>
        }
      </div>
    </div>`,
})
export class BarChartComponent {
  data = input<{ label: string; value: number }[]>([]);
  hoverIdx = signal<number | null>(null);

  max = () => Math.max(...this.data().map((d) => d.value), 1);
  pct = (v: number) => Math.max(6, Math.round((v / this.max()) * 100));
}

@Component({
  selector: 'kc-line',
  standalone: true,
  template: `
    <div class="chart-container">
      <div class="chart-grid">
        <div class="chart-grid-line"></div>
        <div class="chart-grid-line"></div>
        <div class="chart-grid-line"></div>
        <div class="chart-grid-line"></div>
      </div>
      <svg class="chart-svg" viewBox="0 0 100 48" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2563eb" stop-opacity="0.22" />
            <stop offset="100%" stop-color="#2563eb" stop-opacity="0.01" />
          </linearGradient>
        </defs>
        <polygon [attr.points]="area" fill="url(#chartGrad)"></polygon>
        <polyline
          [attr.points]="pts"
          fill="none"
          stroke="#2563eb"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke">
        </polyline>
        @for (pt of pointsList; track pt.x; let i = $index) {
          <circle
            [attr.cx]="pt.x"
            [attr.cy]="pt.y"
            r="1.8"
            fill="#ffffff"
            stroke="#2563eb"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
            class="chart-dot">
          </circle>
        }
      </svg>
      <div class="chart-x">
        @for (l of labels(); track l) {
          <span>{{l}}</span>
        }
      </div>
    </div>`,
})
export class LineChartComponent {
  values = input<number[]>([]);
  labels = input<string[]>([]);

  private coords() {
    const v = this.values();
    const max = Math.max(...v, 1);
    const min = Math.min(...v, 0);
    return v.map((x, i) => {
      const cx = 3 + (i * 94) / Math.max(v.length - 1, 1);
      const cy = 40 - ((x - min) / (max - min || 1)) * 32;
      return [parseFloat(cx.toFixed(1)), parseFloat(cy.toFixed(1))];
    });
  }

  get pointsList() {
    return this.coords().map(([x, y]) => ({ x, y }));
  }

  get pts() {
    return this.coords().map((c) => c.join(',')).join(' ');
  }

  get area() {
    return [...this.coords().map((c) => c.join(',')), '97,48', '3,48'].join(' ');
  }
}

