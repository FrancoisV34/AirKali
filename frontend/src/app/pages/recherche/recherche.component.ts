import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { FavoritesSelectComponent } from './components/favorites-select/favorites-select.component';
import { MapComponent } from './components/map/map.component';
import { DataPanelComponent } from './components/data-panel/data-panel.component';
import { HistoryChartsComponent } from './components/history-charts/history-charts.component';
import { Commune, CommuneService } from '../../core/services/commune.service';
import { AirQualityData, AirQualityService } from '../../core/services/air-quality.service';
import { MeteoData, MeteoService } from '../../core/services/meteo.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-recherche',
  standalone: true,
  imports: [
    CommonModule,
    SearchBarComponent,
    FavoritesSelectComponent,
    MapComponent,
    DataPanelComponent,
    HistoryChartsComponent,
  ],
  templateUrl: './recherche.component.html',
  styleUrl: './recherche.component.scss',
})
export class RechercheComponent implements OnInit {
  @ViewChild(MapComponent) mapComponent!: MapComponent;

  selectedCommune: Commune | null = null;
  airData: AirQualityData | null = null;
  meteoData: MeteoData | null = null;
  isLoggedIn = false;
  dataLoading = false;

  constructor(
    private communeService: CommuneService,
    private airService: AirQualityService,
    private meteoService: MeteoService,
    public favoriteService: FavoriteService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        this.favoriteService.loadFavorites();
        this._centerOnUserCommune();
      }
    });

    this.communeService.getActiveCommunes(1, 50).subscribe({
      next: (result) => {
        setTimeout(() => {
          this.mapComponent?.loadMarkers(result.data);
        }, 100);
      },
    });
  }

  private _centerOnUserCommune(): void {
    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        if (profile.communeId) {
          this.communeService.getCommuneById(profile.communeId).subscribe({
            next: (commune) => {
              this.onCommuneSelected(commune);
            },
          });
        }
      },
    });
  }

  onCommuneSelected(commune: Commune): void {
    this.selectedCommune = { ...commune, active: commune.active ?? true };
    this.airData = null;
    this.meteoData = null;

    this.mapComponent?.centerOn(Number(commune.latitude), Number(commune.longitude), 12);

    this.loadCommuneData(commune.id);
  }

  onMarkerClicked(communeId: number): void {
    this.communeService.getCommuneById(communeId).subscribe((commune) => {
      this.selectedCommune = commune;
      this.airData = null;
      this.meteoData = null;
      this.loadCommuneData(commune.id);
    });
  }

  onFetchData(communeId: number): void {
    this.loadCommuneData(communeId);
  }

  onAddFavorite(communeId: number): void {
    this.favoriteService.addFavorite(communeId).subscribe({
      next: () => {
        if (this.selectedCommune) {
          this.selectedCommune = { ...this.selectedCommune, active: true };
        }
        this.communeService.getActiveCommunes(1, 50).subscribe((result) => {
          this.mapComponent?.loadMarkers(result.data);
        });
      },
    });
  }

  onRemoveFavorite(communeId: number): void {
    this.favoriteService.removeFavorite(communeId).subscribe({
      next: () => {
        this.communeService.getActiveCommunes(1, 50).subscribe((result) => {
          this.mapComponent?.loadMarkers(result.data);
        });
      },
    });
  }

  private loadCommuneData(communeId: number): void {
    this.dataLoading = true;

    forkJoin({
      air: this.airService.getCurrent(communeId),
      meteo: this.meteoService.getCurrent(communeId),
    }).subscribe({
      next: ({ air, meteo }) => {
        this.airData = air;
        this.meteoData = meteo;
        this.dataLoading = false;

        if (this.selectedCommune) {
          this.mapComponent?.openPopupForCommune(
            communeId,
            this.selectedCommune.nom,
            String(air.indiceQualite ?? '—'),
            String(meteo.temperature ?? '—'),
            meteo.meteoCiel ?? '',
          );
        }
      },
      error: () => {
        this.dataLoading = false;
      },
    });
  }
}
