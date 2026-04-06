import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

export interface RegisterData {
  email: string;
  username: string;
  nom: string;
  prenom: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  nom: string;
  prenom: string;
  role: string;
  estSuspendu: boolean;
  adressePostale: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  nom?: string;
  prenom?: string;
  username?: string;
  email?: string;
  adressePostale?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private loggedIn$ = new BehaviorSubject<boolean>(this.isAuthenticated());

  get isLoggedIn$(): Observable<boolean> {
    return this.loggedIn$.asObservable();
  }

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  register(data: RegisterData): Observable<void> {
    return this.api
      .post<{ access_token: string }>('/auth/register', data)
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.access_token);
          this.loggedIn$.next(true);
        }),
        map(() => undefined as void),
      );
  }

  login(data: LoginData): Observable<void> {
    return this.api
      .post<{ access_token: string }>('/auth/login', data)
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.access_token);
          this.loggedIn$.next(true);
        }),
        map(() => undefined as void),
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.loggedIn$.next(false);
    this.router.navigate(['/']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      return Date.now() < exp;
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getTokenPayload(): { sub: number; email: string; role: string } | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  getUserId(): number | null {
    return this.getTokenPayload()?.sub ?? null;
  }

  getUserRole(): string | null {
    return this.getTokenPayload()?.role ?? null;
  }

  getCurrentUser(): Observable<UserProfile> {
    return this.api.get<UserProfile>('/user/profile');
  }

  updateProfile(data: UpdateProfileData): Observable<UserProfile> {
    return this.api.patch<UserProfile>('/user/profile', data);
  }
}
