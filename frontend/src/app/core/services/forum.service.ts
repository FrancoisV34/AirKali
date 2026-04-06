import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  CreateTopicBody,
  TopicDetail,
  TopicListResponse,
  UpdateTopicBody,
} from '../models/forum.models';

@Injectable({ providedIn: 'root' })
export class ForumService {
  constructor(private api: ApiService) {}

  getTopics(
    page: number,
    sort: string,
    categoryId?: number,
  ): Observable<TopicListResponse> {
    let path = `/topics?page=${page}&sort=${sort}`;
    if (categoryId) path += `&categoryId=${categoryId}`;
    return this.api.get<TopicListResponse>(path);
  }

  getTopic(id: number): Observable<TopicDetail> {
    return this.api.get<TopicDetail>(`/topics/${id}`);
  }

  createTopic(body: CreateTopicBody): Observable<TopicDetail> {
    return this.api.post<TopicDetail>('/topics', body);
  }

  updateTopic(id: number, body: UpdateTopicBody): Observable<TopicDetail> {
    return this.api.patch<TopicDetail>(`/topics/${id}`, body);
  }
}
