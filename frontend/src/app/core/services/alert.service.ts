import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Alert {
  id: number;
  communeId: number;
  commune: { id: number; nom: string; codePostal: string };
  type: 'AIR' | 'METEO';
  palier: string;
  active: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface AlertLog {
  id: number;
  commune: { id: number; nom: string };
  type: 'AIR' | 'METEO';
  palier: string | null;
  valeurMesuree: number;
  seuilDeclenche: number;
  unite: string;
  officielle: boolean;
  createdAt: string;
}

export interface CreateAlertData {
  communeId: number;
  type: 'AIR' | 'METEO';
  palier: string;
}

@Injectable({ providedIn: 'root' })
export class AlertApiService {
  constructor(private api: ApiService) {}

  getAlerts(): Observable<Alert[]> {
    return this.api.get<Alert[]>('/alerts');
  }

  createAlert(data: CreateAlertData): Observable<Alert> {
    return this.api.post<Alert>('/alerts', data);
  }

  toggleAlert(id: number): Observable<Alert> {
    return this.api.patch<Alert>(`/alerts/${id}`, {});
  }

  deleteAlert(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`/alerts/${id}`);
  }

  getHistory(): Observable<AlertLog[]> {
    return this.api.get<AlertLog[]>('/alerts/history');
  }
}
