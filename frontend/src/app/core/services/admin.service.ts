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

export interface ManualAlertItem {
  id: number;
  communeId: number;
  palier: string;
  message: string | null;
  expiresAt: string;
  closedAt: string | null;
  createdAt: string;
  statut: string;
  commune?: { nom: string };
  admin?: { nom: string; prenom: string };
}

export interface CreateManualAlertData {
  communeId: number;
  palier: string;
  message?: string;
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

  getManualAlerts(): Observable<ManualAlertItem[]> {
    return this.api.get<ManualAlertItem[]>('/admin/alertes');
  }

  createManualAlert(data: CreateManualAlertData): Observable<ManualAlertItem> {
    return this.api.post<ManualAlertItem>('/admin/alertes', data);
  }

  closeManualAlert(id: number): Observable<ManualAlertItem> {
    return this.api.patch<ManualAlertItem>(`/admin/alertes/${id}/close`, {});
  }
}
