import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AirQualityData {
  communeId: number;
  communeNom: string;
  ozone: number | null;
  co: number | null;
  pm25: number | null;
  pm10: number | null;
  indiceQualite: number | null;
  [key: string]: unknown;
}

export interface AirQualityHistoryItem {
  ozone: number | null;
  co: number | null;
  pm25: number | null;
  pm10: number | null;
  indiceQualite: number | null;
  dateHeure: string;
}

export interface AirQualityHistory {
  communeId: number;
  communeNom: string;
  from: string;
  to: string;
  data: AirQualityHistoryItem[];
}

@Injectable({ providedIn: 'root' })
export class AirQualityService {
  constructor(private api: ApiService) {}

  getCurrent(communeId: number): Observable<AirQualityData> {
    return this.api.get<AirQualityData>(`/communes/${communeId}/air`);
  }

  getHistory(communeId: number, from: string, to: string): Observable<AirQualityHistory> {
    return this.api.get<AirQualityHistory>(
      `/communes/${communeId}/air/history?from=${from}&to=${to}`,
    );
  }
}
