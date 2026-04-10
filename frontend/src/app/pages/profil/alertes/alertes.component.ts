import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import {
  Alert,
  AlertApiService,
  AlertLog,
} from '../../../core/services/alert.service';
import { Favorite, FavoriteService } from '../../../core/services/favorite.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-alertes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatChipsModule,
  ],
  templateUrl: './alertes.component.html',
  styleUrl: './alertes.component.scss',
})
export class AlertesComponent implements OnInit {
  alerts: Alert[] = [];
  history: AlertLog[] = [];
  favorites: Favorite[] = [];
  loading = true;
  error = '';
  isSuspended = false;

  // Form
  showForm = false;
  selectedCommuneId: number | null = null;
  selectedType: 'AIR' | 'METEO' = 'AIR';
  selectedPalier = 'AIR_MAUVAIS';
  formError = '';

  palierOptions: { value: string; label: string }[] = [];

  constructor(
    private alertApi: AlertApiService,
    private favoriteService: FavoriteService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.favoriteService.loadFavorites();
    this.favoriteService.favorites$.subscribe((favs) => {
      this.favorites = favs;
    });

    this.authService.getCurrentUser().subscribe((profile) => {
      this.isSuspended = profile.estSuspendu;
    });

    this.loadData();
    this.updatePalierOptions();
  }

  loadData(): void {
    this.loading = true;
    this.alertApi.getAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts;
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les alertes.';
        this.loading = false;
      },
    });

    this.alertApi.getHistory().subscribe({
      next: (history) => (this.history = history),
    });
  }

  onTypeChange(): void {
    this.updatePalierOptions();
    this.selectedPalier = this.palierOptions[0]?.value ?? '';
  }

  updatePalierOptions(): void {
    if (this.selectedType === 'AIR') {
      this.palierOptions = [
        { value: 'AIR_MOYEN', label: 'Moyen (AQI > 50)' },
        { value: 'AIR_MAUVAIS', label: 'Mauvais (AQI > 100)' },
        { value: 'AIR_TRES_MAUVAIS', label: 'Tres mauvais (AQI > 150)' },
      ];
    } else {
      this.palierOptions = [
        { value: 'METEO_SEVERE', label: 'Severe (vent, temperature, orage)' },
      ];
    }
  }

  onCreate(): void {
    if (!this.selectedCommuneId) {
      this.formError = 'Selectionnez une commune.';
      return;
    }
    this.formError = '';
    this.alertApi
      .createAlert({
        communeId: this.selectedCommuneId,
        type: this.selectedType,
        palier: this.selectedPalier,
      })
      .subscribe({
        next: () => {
          this.showForm = false;
          this.loadData();
        },
        error: (err) => {
          this.formError = err.error?.message || 'Erreur lors de la creation.';
        },
      });
  }

  onToggle(alert: Alert): void {
    this.alertApi.toggleAlert(alert.id).subscribe({
      next: (updated) => {
        const idx = this.alerts.findIndex((a) => a.id === updated.id);
        if (idx >= 0) this.alerts[idx] = updated;
      },
    });
  }

  onDelete(id: number): void {
    this.alertApi.deleteAlert(id).subscribe({
      next: () => {
        this.alerts = this.alerts.filter((a) => a.id !== id);
      },
    });
  }

  get canCreate(): boolean {
    return this.alerts.length < 3 && !this.isSuspended;
  }

  getPalierLabel(palier: string): string {
    const map: Record<string, string> = {
      AIR_MOYEN: 'Moyen (AQI > 50)',
      AIR_MAUVAIS: 'Mauvais (AQI > 100)',
      AIR_TRES_MAUVAIS: 'Tres mauvais (AQI > 150)',
      METEO_SEVERE: 'Severe',
    };
    return map[palier] ?? palier;
  }

  getTypeLabel(type: string): string {
    return type === 'AIR' ? 'Qualite de l\'air' : 'Meteo';
  }

  isInFavorites(communeId: number): boolean {
    return this.favorites.some((f) => f.communeId === communeId);
  }
}
