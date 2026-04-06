import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  CommentListResponse,
  CommentNode,
  CreateCommentBody,
} from '../models/forum.models';

@Injectable({ providedIn: 'root' })
export class CommentService {
  constructor(private api: ApiService) {}

  getComments(topicId: number, page: number): Observable<CommentListResponse> {
    return this.api.get<CommentListResponse>(
      `/topics/${topicId}/comments?page=${page}`,
    );
  }

  createComment(
    topicId: number,
    body: CreateCommentBody,
  ): Observable<CommentNode> {
    return this.api.post<CommentNode>(`/topics/${topicId}/comments`, body);
  }

  updateComment(
    topicId: number,
    commentId: number,
    content: string,
  ): Observable<CommentNode> {
    return this.api.patch<CommentNode>(
      `/topics/${topicId}/comments/${commentId}`,
      { content },
    );
  }
}
