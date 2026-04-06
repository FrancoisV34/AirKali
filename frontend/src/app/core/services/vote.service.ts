import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { VoteResponse } from '../models/forum.models';

@Injectable({ providedIn: 'root' })
export class VoteService {
  constructor(private api: ApiService) {}

  vote(
    targetType: 'TOPIC' | 'COMMENT',
    targetId: number,
    value: 1 | -1,
  ): Observable<VoteResponse> {
    return this.api.post<VoteResponse>('/votes', { targetType, targetId, value });
  }
}
