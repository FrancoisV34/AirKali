import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Commune } from './commune.service';

export interface Favorite {
  id: number;
  communeId: number;
  commune: Commune;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private favoritesSubject = new BehaviorSubject<Favorite[]>([]);
  favorites$ = this.favoritesSubject.asObservable();

  constructor(private api: ApiService) {}

  loadFavorites(): void {
    this.api.get<Favorite[]>('/favorites').subscribe({
      next: (favs) => this.favoritesSubject.next(favs),
      error: () => this.favoritesSubject.next([]),
    });
  }

  getFavorites(): Observable<Favorite[]> {
    return this.favorites$;
  }

  addFavorite(communeId: number): Observable<Favorite> {
    return this.api.post<Favorite>(`/favorites/${communeId}`, {}).pipe(
      tap(() => this.loadFavorites()),
    );
  }

  removeFavorite(communeId: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`/favorites/${communeId}`).pipe(
      tap(() => this.loadFavorites()),
    );
  }

  isFavorite(communeId: number): boolean {
    return this.favoritesSubject.value.some((f) => f.communeId === communeId);
  }

  get count(): number {
    return this.favoritesSubject.value.length;
  }
}
