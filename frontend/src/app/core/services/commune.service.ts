import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Commune {
  id: number;
  nom: string;
  codePostal: string;
  codeInsee: string;
  population: number | null;
  latitude: number;
  longitude: number;
  active?: boolean;
}

export interface CommuneWithAqi extends Commune {
  derniereQualiteAir: {
    europeanAqi: number | null;
    dateHeure: string;
  } | null;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class CommuneService {
  constructor(private api: ApiService) {}

  searchCommunes(query: string): Observable<Commune[]> {
    return this.api.get<Commune[]>(`/communes?search=${encodeURIComponent(query)}`);
  }

  getActiveCommunes(page: number = 1, limit: number = 50): Observable<PaginatedResult<CommuneWithAqi>> {
    return this.api.get<PaginatedResult<CommuneWithAqi>>(`/communes/active?page=${page}&limit=${limit}`);
  }

  getCommuneById(id: number): Observable<Commune> {
    return this.api.get<Commune>(`/communes/${id}`);
  }
}
