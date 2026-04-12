import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
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
import { ExportService } from '../../../../core/services/export.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-history-charts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    BaseChartDirective,
  ],
  templateUrl: './history-charts.component.html',
  styleUrl: './history-charts.component.scss',
})
export class HistoryChartsComponent implements OnChanges {
  @Input() communeId: number | null = null;
  @Input() isActive = false;

  chartType: 'air' | 'meteo' = 'air';
  period: '7' | '30' = '7';
  loading = false;

  // Export
  showExportPanel = false;
  exportType: 'air' | 'meteo' | 'both' = 'air';
  exportFormat: 'csv' | 'pdf' = 'csv';
  exportFrom = '';
  exportTo = '';
  exportError = '';

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
    private exportService: ExportService,
    public authService: AuthService,
  ) {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 30);
    this.exportTo = today.toISOString().split('T')[0];
    this.exportFrom = monthAgo.toISOString().split('T')[0];
  }

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

  toggleExportPanel(): void {
    this.showExportPanel = !this.showExportPanel;
    this.exportError = '';
  }

  onExport(): void {
    this.exportError = '';

    if (!this.exportFrom || !this.exportTo) {
      this.exportError = 'Veuillez sélectionner une période';
      return;
    }

    const from = new Date(this.exportFrom);
    const to = new Date(this.exportTo);

    if (from > to) {
      this.exportError = 'La date de début doit être antérieure à la date de fin';
      return;
    }

    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 31) {
      this.exportError = 'La période ne peut pas dépasser 1 mois';
      return;
    }

    this.exportService.exportData(
      this.communeId!,
      this.exportFormat,
      this.exportType,
      this.exportFrom,
      this.exportTo,
    );
  }
}
