import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Notification } from '../models/forum.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private api: ApiService) {}

  getUnread(): Observable<Notification[]> {
    return this.api.get<Notification[]>('/notifications');
  }

  markAsRead(id: number): Observable<unknown> {
    return this.api.patch<unknown>(`/notifications/${id}/read`, {});
  }
}
