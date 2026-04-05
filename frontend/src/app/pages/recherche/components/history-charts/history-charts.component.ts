import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import {
  AirQualityHistory,
  AirQualityService,
} from '../../../../core/services/air-quality.service';
import {
  MeteoHistory,
  MeteoService,
} from '../../../../core/services/meteo.service';

@Component({
  selector: 'app-history-charts',
  standalone: true,
  imports: [CommonModule, MatButtonToggleModule, BaseChartDirective],
  templateUrl: './history-charts.component.html',
  styleUrl: './history-charts.component.scss',
})
export class HistoryChartsComponent implements OnChanges {
  @Input() communeId: number | null = null;
  @Input() isActive = false;

  chartType: 'air' | 'meteo' = 'air';
  period: '7' | '30' = '7';
  loading = false;

  airChartData: ChartConfiguration<'line'>['data'] | null = null;
  meteoChartData: ChartConfiguration<'line'>['data'] | null = null;
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: { title: { display: true, text: 'Valeur' } },
    },
  };

  constructor(
    private airService: AirQualityService,
    private meteoService: MeteoService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['communeId'] || changes['isActive']) {
      if (this.communeId && this.isActive) {
        this.loadData();
      } else {
        this.airChartData = null;
        this.meteoChartData = null;
      }
    }
  }

  onChartTypeChange(type: 'air' | 'meteo'): void {
    this.chartType = type;
  }

  onPeriodChange(period: '7' | '30'): void {
    this.period = period;
    this.loadData();
  }

  private loadData(): void {
    if (!this.communeId) return;
    this.loading = true;

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - Number(this.period));

    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    this.airService
      .getHistory(this.communeId, fromStr, toStr)
      .subscribe({
        next: (data) => this.buildAirChart(data),
        error: () => (this.airChartData = null),
      });

    this.meteoService
      .getHistory(this.communeId, fromStr, toStr)
      .subscribe({
        next: (data) => this.buildMeteoChart(data),
        error: () => (this.meteoChartData = null),
        complete: () => (this.loading = false),
      });
  }

  private buildAirChart(history: AirQualityHistory): void {
    const labels = history.data.map((d) =>
      new Date(d.dateHeure).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );

    this.airChartData = {
      labels,
      datasets: [
        {
          label: 'PM2.5',
          data: history.data.map((d) => d.pm25),
          borderColor: '#FF6384',
          tension: 0.3,
          fill: false,
        },
        {
          label: 'PM10',
          data: history.data.map((d) => d.pm10),
          borderColor: '#36A2EB',
          tension: 0.3,
          fill: false,
        },
        {
          label: 'Indice ATMO',
          data: history.data.map((d) => d.indiceQualite),
          borderColor: '#4CAF50',
          tension: 0.3,
          fill: false,
        },
      ],
    };
  }

  private buildMeteoChart(history: MeteoHistory): void {
    const labels = history.data.map((d) =>
      new Date(d.dateHeure).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );

    this.meteoChartData = {
      labels,
      datasets: [
        {
          label: 'Température (°C)',
          data: history.data.map((d) => d.temperature),
          borderColor: '#FF6384',
          tension: 0.3,
          fill: false,
          yAxisID: 'y',
        },
        {
          label: 'Humidité (%)',
          data: history.data.map((d) => d.humidite),
          borderColor: '#36A2EB',
          tension: 0.3,
          fill: false,
          yAxisID: 'y1',
        },
      ],
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales:
        this.chartType === 'meteo'
          ? {
              x: { title: { display: true, text: 'Date' } },
              y: {
                type: 'linear',
                position: 'left',
                title: { display: true, text: '°C' },
              },
              y1: {
                type: 'linear',
                position: 'right',
                title: { display: true, text: '%' },
                grid: { drawOnChartArea: false },
              },
            }
          : {
              x: { title: { display: true, text: 'Date' } },
              y: { title: { display: true, text: 'Valeur' } },
            },
    };
  }
}
