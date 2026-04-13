import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { AirQualityData } from '../../../../core/services/air-quality.service';
import { MeteoData } from '../../../../core/services/meteo.service';
import { Commune } from '../../../../core/services/commune.service';

interface ManualAlert {
  id: number;
  palier: string;
  message: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-data-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './data-panel.component.html',
  styleUrl: './data-panel.component.scss',
})
export class DataPanelComponent implements OnChanges {
  @Input() commune: Commune | null = null;
  @Input() airData: AirQualityData | null = null;
  @Input() meteoData: MeteoData | null = null;
  @Input() isFavorite = false;
  @Input() favoritesCount = 0;
  @Input() isLoggedIn = false;
  @Input() isActive = false;
  @Input() loading = false;

  manualAlerts: ManualAlert[] = [];

  constructor(private http: HttpClient) {}

  @Output() addFavorite = new EventEmitter<number>();
  @Output() removeFavorite = new EventEmitter<number>();
  @Output() fetchData = new EventEmitter<number>();

  onToggleFavorite(): void {
    if (!this.commune) return;
    if (this.isFavorite) {
      this.removeFavorite.emit(this.commune.id);
    } else {
      this.addFavorite.emit(this.commune.id);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['commune'] && this.commune) {
      this.loadManualAlerts(this.commune.id);
    }
  }

  onFetchData(): void {
    if (this.commune) {
      this.fetchData.emit(this.commune.id);
    }
  }

  private loadManualAlerts(communeId: number): void {
    this.http
      .get<ManualAlert[]>(`/api/communes/${communeId}/manual-alerts`)
      .subscribe({
        next: (alerts) => (this.manualAlerts = alerts),
        error: () => (this.manualAlerts = []),
      });
  }

  getPalierLabel(palier: string): string {
    const labels: Record<string, string> = {
      AIR_MOYEN: 'Qualité air moyenne',
      AIR_MAUVAIS: 'Mauvaise qualité air',
      AIR_TRES_MAUVAIS: 'Très mauvaise qualité air',
      METEO_SEVERE: 'Météo sévère',
    };
    return labels[palier] || palier;
  }

  getPalierIcon(palier: string): string {
    if (palier.startsWith('METEO')) return 'thunderstorm';
    return 'warning';
  }
}
