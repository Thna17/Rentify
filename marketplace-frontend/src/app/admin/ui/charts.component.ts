import { Component, input } from '@angular/core';
@Component({ selector: 'kc-bars', standalone: true, template: `
  <div class="bars">
    @for (d of data(); track d.label) {
      <div class="bar-col">
        <div class="bar-wrap"><div class="bar" [style.height.%]="pct(d.value)" [title]="d.label + ': ' + d.value"></div></div>
        <span class="bar-lbl">{{d.label}}</span>
      </div>
    }
  </div>` })
export class BarChartComponent {
  data = input<{ label: string; value: number }[]>([]);
  max = () => Math.max(...this.data().map(d => d.value), 1);
  pct = (v: number) => Math.max(4, Math.round((v / this.max()) * 100));
}

@Component({ selector: 'kc-line', standalone: true, template: `
  <div class="chart">
    <svg viewBox="0 0 100 42" preserveAspectRatio="none">
      <polygon [attr.points]="area" fill="rgba(138,30,44,.06)"></polygon>
      <polyline [attr.points]="pts" fill="none" stroke="var(--accent)" stroke-width="1.5"
        stroke-linecap="round" vector-effect="non-scaling-stroke"></polyline>
    </svg>
    <div class="chart-x">@for (l of labels(); track l) { <span>{{l}}</span> }</div>
  </div>` })
export class LineChartComponent {
  values = input<number[]>([]);
  labels = input<string[]>([]);
  private coords() {
    const v = this.values(); const max = Math.max(...v, 1); const min = Math.min(...v, 0);
    return v.map((x, i) => [
      (4 + i * 92 / Math.max(v.length - 1, 1)).toFixed(1),
      (38 - ((x - min) / (max - min || 1)) * 30).toFixed(1),
    ]);
  }
  get pts() { return this.coords().map(c => c.join(',')).join(' '); }
  get area() { return [...this.coords().map(c => c.join(',')), '100,42', '0,42'].join(' '); }
}