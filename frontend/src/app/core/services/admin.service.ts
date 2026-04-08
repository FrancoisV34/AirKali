import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AdminUser {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  estSuspendu: boolean;
  createdAt: string;
}

export interface AdminUsersResult {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface SuspensionLog {
  id: number;
  action: 'SUSPEND' | 'REACTIVATE';
  motif: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private api: ApiService) {}

  getUsers(search?: string, page: number = 1, limit: number = 20): Observable<AdminUsersResult> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return this.api.get<AdminUsersResult>(`/admin/users?${params.toString()}`);
  }

  suspendUser(userId: number, motif: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`/admin/users/${userId}/suspend`, { motif });
  }

  reactivateUser(userId: number): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`/admin/users/${userId}/reactivate`, {});
  }

  getSuspensionHistory(userId: number): Observable<SuspensionLog[]> {
    return this.api.get<SuspensionLog[]>(`/admin/users/${userId}/suspension-history`);
  }

  getMySuspensionHistory(): Observable<SuspensionLog[]> {
    return this.api.get<SuspensionLog[]>('/user/suspension-history');
  }
}
