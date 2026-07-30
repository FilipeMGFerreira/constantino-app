import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { NgApexchartsModule, ChartComponent, ApexChart, ApexNonAxisChartSeries, ApexResponsive, ApexAxisChartSeries, ApexXAxis } from 'ng-apexcharts';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyPipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { forkJoin } from 'rxjs';

export type ChartOptions = {
  series: ApexNonAxisChartSeries | ApexAxisChartSeries;
  chart: ApexChart;
  labels?: string[];
  xaxis?: ApexXAxis;
  responsive?: ApexResponsive[];
  colors?: string[];
};

@Component({
  selector: 'app-estatisticas',
  standalone: true,
  imports: [NgApexchartsModule, MatIconModule, CurrencyPipe],
  template: `
    <div class="page">
      <h2>Estatísticas</h2>
      <p class="lede">Visão anual dos gastos da casa.</p>
      <div class="stat">
        <div class="label">Total anual</div>
        <div class="value">{{ totalAno() | currency: 'EUR' }}</div>
      </div>

      <div class="surface chart-card">
        <h3>Por categoria</h3>
        @if (pie.series.length) {
          <apx-chart
            [series]="pie.series"
            [chart]="pie.chart"
            [labels]="pie.labels"
            [colors]="pie.colors"
            [responsive]="pie.responsive"
          ></apx-chart>
        }
      </div>

      <div class="surface chart-card">
        <h3>Evolução mensal</h3>
        @if (line.series.length) {
          <apx-chart [series]="line.series" [chart]="line.chart" [xaxis]="line.xaxis" [colors]="line.colors"></apx-chart>
        }
      </div>

      <div class="surface">
        <h3>Top 10 despesas</h3>
        @for (t of top10(); track t.id) {
          <div class="list-row" style="cursor:default">
            <span class="grow">{{ t.descricao }}</span>
            <strong>{{ t.valor | currency: 'EUR' }}</strong>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      h2 { margin: 4px 0 0; font-size: 28px; font-weight: 800; }
      .lede { margin: 6px 0 16px; color: var(--ink-soft); }
      .chart-card { margin-top: 12px; }
      h3 { margin: 0 0 8px; font-size: 15px; }
      .grow { flex: 1; }
      .stat { margin-bottom: 4px; }
      strong { font-family: var(--font-display); }
    `,
  ],
})
export class EstatisticasComponent implements OnInit {
  private api = inject(ApiService);
  totalAno = signal(0);
  top10 = signal<any[]>([]);
  catNames = new Map<string, string>();

  pie: any = {
    series: [],
    chart: { type: 'pie', height: 280 },
    labels: [],
    colors: ['#2c2c2c', '#8b7355', '#5c5c5c', '#c4b5a0', '#3d3d3d', '#a89070'],
    responsive: [{ breakpoint: 480, options: { chart: { width: '100%' } } }],
  };

  line: any = {
    series: [],
    chart: { type: 'line', height: 260, toolbar: { show: false } },
    xaxis: { categories: [] },
    colors: ['#2c2c2c'],
  };

  ngOnInit() {
    forkJoin({
      stats: this.api.getEstatisticas(),
      cats: this.api.getCategorias(),
    }).subscribe(({ stats, cats }: any) => {
      cats.forEach((c: any) => this.catNames.set(c.id, c.nome));
      this.totalAno.set(stats.totalAno || 0);
      this.top10.set(stats.top10 || []);
      this.pie = {
        ...this.pie,
        series: (stats.pieCategorias || []).map((p: any) => p.total),
        labels: (stats.pieCategorias || []).map((p: any) => this.catNames.get(p.id) || p.id),
      };
      this.line = {
        ...this.line,
        series: [{ name: 'Total', data: (stats.lineMensal || []).map((m: any) => m.total) }],
        xaxis: {
          categories: (stats.lineMensal || []).map((m: any) => String(m.mes)),
        },
      };
    });
  }
}
