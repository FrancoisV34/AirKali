import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface MeteoData {
  communeId: number;
  communeNom: string;
  temperature: number | null;
  pression: number | null;
  humidite: number | null;
  meteoCiel: string | null;
  vitesseVent: number | null;
  [key: string]: unknown;
}

export interface MeteoHistoryItem {
  temperature: number | null;
  pression: number | null;
  humidite: number | null;
  meteoCiel: string | null;
  vitesseVent: number | null;
  dateHeure: string;
}

export interface MeteoHistory {
  communeId: number;
  communeNom: string;
  from: string;
  to: string;
  data: MeteoHistoryItem[];
}

@Injectable({ providedIn: 'root' })
export class MeteoService {
  constructor(private api: ApiService) {}

  getCurrent(communeId: number): Observable<MeteoData> {
    return this.api.get<MeteoData>(`/communes/${communeId}/meteo`);
  }

  getHistory(communeId: number, from: string, to: string): Observable<MeteoHistory> {
    return this.api.get<MeteoHistory>(
      `/communes/${communeId}/meteo/history?from=${from}&to=${to}`,
    );
  }
}
