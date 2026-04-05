import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AirQualityData } from '../../../../core/services/air-quality.service';
import { MeteoData } from '../../../../core/services/meteo.service';
import { Commune } from '../../../../core/services/commune.service';

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
export class DataPanelComponent {
  @Input() commune: Commune | null = null;
  @Input() airData: AirQualityData | null = null;
  @Input() meteoData: MeteoData | null = null;
  @Input() isFavorite = false;
  @Input() favoritesCount = 0;
  @Input() isLoggedIn = false;
  @Input() isActive = false;
  @Input() loading = false;

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

  onFetchData(): void {
    if (this.commune) {
      this.fetchData.emit(this.commune.id);
    }
  }
}
