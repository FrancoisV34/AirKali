import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { CommuneWithAqi } from '../../../../core/services/commune.service';

function getMarkerColor(europeanAqi: number | null): string {
  if (europeanAqi === null) return '#9E9E9E';
  if (europeanAqi <= 3) return '#4CAF50';
  if (europeanAqi <= 6) return '#FFC107';
  if (europeanAqi <= 8) return '#FF9800';
  return '#F44336';
}

@Component({
  selector: 'app-map',
  standalone: true,
  template: `<div id="recherche-map" class="map-container"></div>`,
  styles: [`.map-container { width: 100%; height: 500px; border-radius: 8px; }`],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @Output() markerClicked = new EventEmitter<number>();

  private map!: L.Map;
  private markerClusterGroup!: L.MarkerClusterGroup;

  ngAfterViewInit(): void {
    this.map = L.map('recherche-map', {
      center: [46.6, 2.2],
      zoom: 6,
      scrollWheelZoom: true,
      dragging: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.markerClusterGroup = L.markerClusterGroup();
    this.map.addLayer(this.markerClusterGroup);
  }

  loadMarkers(communes: CommuneWithAqi[]): void {
    this.markerClusterGroup.clearLayers();

    communes.forEach((commune) => {
      const color = getMarkerColor(
        commune.derniereQualiteAir?.europeanAqi ?? null,
      );
      const marker = L.circleMarker(
        [Number(commune.latitude), Number(commune.longitude)],
        {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          fillOpacity: 0.9,
        },
      );

      const aqiText = commune.derniereQualiteAir
        ? `ATMO: ${commune.derniereQualiteAir.europeanAqi}`
        : 'Pas de données';

      marker.bindPopup(
        `<strong>${commune.nom}</strong><br>${commune.codePostal}<br>${aqiText}`,
      );

      marker.on('click', () => {
        this.markerClicked.emit(commune.id);
      });

      this.markerClusterGroup.addLayer(marker);
    });
  }

  centerOn(lat: number, lng: number, zoom: number = 12): void {
    if (this.map) {
      this.map.setView([lat, lng], zoom);
    }
  }

  openPopupForCommune(communeId: number, name: string, aqi: string, temp: string, meteoDesc: string): void {
    const layers = this.markerClusterGroup.getLayers() as L.CircleMarker[];
    const marker = layers.find((l) => {
      const popup = l.getPopup();
      return popup && popup.getContent()?.toString().includes(name);
    });

    if (marker) {
      marker.setPopupContent(
        `<strong>${name}</strong><br>ATMO: ${aqi}<br>Temp: ${temp}°C<br>${meteoDesc}`,
      );
      marker.openPopup();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
