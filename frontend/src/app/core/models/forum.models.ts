export interface Category {
  id: number;
  name: string;
  createdAt: string;
}

export interface TopicAuthor {
  id: number;
  pseudo: string;
}

export interface TopicSummary {
  id: number;
  title: string;
  excerpt: string;
  category: Category | null;
  author: TopicAuthor;
  score: number;
  commentCount: number;
  status: string;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TopicDetail {
  id: number;
  title: string;
  content: string;
  category: Category | null;
  author: TopicAuthor;
  score: number;
  userVote: 1 | -1 | null;
  isEdited: boolean;
  status: string;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TopicListResponse {
  data: TopicSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface CommentNode {
  id: number;
  content: string;
  author: TopicAuthor;
  score: number;
  userVote: 1 | -1 | null;
  isEdited: boolean;
  parentId: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  children: CommentNode[];
}

export interface CommentListResponse {
  data: CommentNode[];
  total: number;
  page: number;
  limit: number;
}

export interface VoteResponse {
  vote: { id: number; value: number } | null;
  newScore: number;
}

export interface CreateTopicBody {
  title: string;
  content: string;
  categoryId?: number | null;
}

export interface UpdateTopicBody {
  title?: string;
  content?: string;
  categoryId?: number | null;
}

export interface CreateCommentBody {
  content: string;
  parentId?: number | null;
}

export interface ModerateBody {
  reason?: string;
}

export interface Notification {
  id: number;
  userId: number;
  message: string;
  reason: string | null;
  readAt: string | null;
  createdAt: string;
}
