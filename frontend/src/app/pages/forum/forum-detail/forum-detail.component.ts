import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { ForumService } from '../../../core/services/forum.service';
import { CommentService } from '../../../core/services/comment.service';
import { VoteService } from '../../../core/services/vote.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommentNode, TopicDetail } from '../../../core/models/forum.models';
import { SafeMarkdownPipe } from '../../../shared/pipes/safe-markdown.pipe';

@Component({
  selector: 'app-forum-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    SafeMarkdownPipe,
  ],
  templateUrl: './forum-detail.component.html',
  styleUrl: './forum-detail.component.scss',
})
export class ForumDetailComponent implements OnInit {
  topic: TopicDetail | null = null;
  comments: CommentNode[] = [];
  commentsTotal = 0;
  commentsPage = 1;
  loading = true;
  loadingComments = false;

  isLoggedIn = false;
  isSuspended = false;
  currentUserId: number | null = null;
  currentUserRole: string | null = null;

  newCommentContent = '';
  replyingTo: { id: number; pseudo: string } | null = null;
  editingCommentId: number | null = null;
  editingCommentContent = '';

  isTablet = false;

  // Moderation state
  confirmDeleteTarget: { type: 'topic' | 'comment'; id: number; topicId?: number } | null = null;
  confirmDeleteReason = '';
  adminTopicReason = '';
  adminCommentReasonMap = new Map<number, string>();
  readonly reasonOptions = ['spam', 'contenu inapproprié', 'hors sujet'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private forumService: ForumService,
    private commentService: CommentService,
    private voteService: VoteService,
    public authService: AuthService,
    private breakpointObserver: BreakpointObserver,
  ) {}

  ngOnInit(): void {
    this.breakpointObserver.observe(['(max-width: 1024px)']).subscribe((result) => {
      this.isTablet = result.matches;
    });

    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.currentUserId = loggedIn ? this.authService.getUserId() : null;
      this.currentUserRole = loggedIn ? this.authService.getUserRole() : null;
      if (loggedIn) {
        this.authService.getCurrentUser().subscribe((user) => {
          this.isSuspended = user.estSuspendu;
        });
      }
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.forumService.getTopic(id).subscribe({
      next: (topic) => {
        this.topic = topic;
        this.loading = false;
        this.loadComments();
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/forum']);
      },
    });
  }

  loadComments(): void {
    if (!this.topic) return;
    this.loadingComments = true;
    this.commentService.getComments(this.topic.id, this.commentsPage).subscribe({
      next: (res) => {
        this.comments = res.data;
        this.commentsTotal = res.total;
        this.loadingComments = false;
      },
      error: () => (this.loadingComments = false),
    });
  }

  voteOnTopic(value: 1 | -1): void {
    if (!this.topic || !this.canVote()) return;
    const optimisticScore = this.computeOptimisticScore(this.topic.score, this.topic.userVote, value);
    const optimisticVote = this.topic.userVote === value ? null : value;
    const prevScore = this.topic.score;
    const prevVote = this.topic.userVote;
    this.topic = { ...this.topic, score: optimisticScore, userVote: optimisticVote };

    this.voteService.vote('TOPIC', this.topic.id, value).subscribe({
      next: (res) => {
        this.topic = { ...this.topic!, score: res.newScore, userVote: res.vote?.value as (1 | -1) ?? null };
      },
      error: () => {
        this.topic = { ...this.topic!, score: prevScore, userVote: prevVote };
      },
    });
  }

  voteOnComment(comment: CommentNode, value: 1 | -1): void {
    if (!this.canVote()) return;
    const optimisticScore = this.computeOptimisticScore(comment.score, comment.userVote, value);
    const optimisticVote = comment.userVote === value ? null : value;
    const prevScore = comment.score;
    const prevVote = comment.userVote;
    comment.score = optimisticScore;
    comment.userVote = optimisticVote;

    this.voteService.vote('COMMENT', comment.id, value).subscribe({
      next: (res) => {
        comment.score = res.newScore;
        comment.userVote = res.vote?.value as (1 | -1) ?? null;
      },
      error: () => {
        comment.score = prevScore;
        comment.userVote = prevVote;
      },
    });
  }

  private computeOptimisticScore(
    current: number,
    currentVote: 1 | -1 | null,
    newVote: 1 | -1,
  ): number {
    if (currentVote === newVote) return current - newVote;
    if (currentVote !== null) return current - currentVote + newVote;
    return current + newVote;
  }

  submitComment(): void {
    if (!this.topic || !this.newCommentContent.trim()) return;
    this.commentService
      .createComment(this.topic.id, {
        content: this.newCommentContent.trim(),
        parentId: this.replyingTo?.id ?? null,
      })
      .subscribe({
        next: () => {
          this.newCommentContent = '';
          this.replyingTo = null;
          this.commentsPage = 1;
          this.loadComments();
        },
      });
  }

  startReply(comment: CommentNode): void {
    this.replyingTo = { id: comment.id, pseudo: comment.author.pseudo };
    this.newCommentContent = '';
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  startEditComment(comment: CommentNode): void {
    this.editingCommentId = comment.id;
    this.editingCommentContent = comment.content;
  }

  saveEditComment(comment: CommentNode): void {
    if (!this.topic || !this.editingCommentContent.trim()) return;
    this.commentService
      .updateComment(this.topic.id, comment.id, this.editingCommentContent.trim())
      .subscribe({
        next: () => {
          comment.content = this.editingCommentContent.trim();
          comment.isEdited = true;
          this.editingCommentId = null;
        },
      });
  }

  cancelEditComment(): void {
    this.editingCommentId = null;
  }

  // --- Moderation: Topic ---

  adminHideTopic(): void {
    if (!this.topic) return;
    this.forumService.hideTopic(this.topic.id, { reason: this.adminTopicReason || undefined }).subscribe({
      next: () => {
        this.topic = { ...this.topic!, status: 'hidden' };
        this.adminTopicReason = '';
      },
    });
  }

  adminShowTopic(): void {
    if (!this.topic) return;
    this.forumService.showTopic(this.topic.id).subscribe({
      next: () => {
        this.topic = { ...this.topic!, status: 'visible' };
      },
    });
  }

  openDeleteTopicConfirm(): void {
    if (!this.topic) return;
    this.confirmDeleteTarget = { type: 'topic', id: this.topic.id };
    this.confirmDeleteReason = '';
  }

  confirmDelete(): void {
    if (!this.confirmDeleteTarget) return;
    const { type, id, topicId } = this.confirmDeleteTarget;

    if (type === 'topic') {
      this.forumService.deleteTopic(id, { reason: this.confirmDeleteReason || undefined }).subscribe({
        next: () => {
          this.confirmDeleteTarget = null;
          this.router.navigate(['/forum']);
        },
      });
    } else {
      this.commentService.deleteComment(topicId!, id, { reason: this.confirmDeleteReason || undefined }).subscribe({
        next: () => {
          this.confirmDeleteTarget = null;
          this.loadComments();
        },
      });
    }
  }

  cancelDelete(): void {
    this.confirmDeleteTarget = null;
  }

  closeTopic(): void {
    if (!this.topic) return;
    this.forumService.closeTopic(this.topic.id).subscribe({
      next: () => {
        this.topic = { ...this.topic!, isClosed: true };
      },
    });
  }

  reopenTopic(): void {
    if (!this.topic) return;
    this.forumService.reopenTopic(this.topic.id).subscribe({
      next: () => {
        this.topic = { ...this.topic!, isClosed: false };
      },
    });
  }

  // --- Moderation: Comment ---

  getCommentReason(commentId: number): string {
    return this.adminCommentReasonMap.get(commentId) ?? '';
  }

  setCommentReason(commentId: number, reason: string): void {
    this.adminCommentReasonMap.set(commentId, reason);
  }

  adminHideComment(comment: CommentNode): void {
    if (!this.topic) return;
    const reason = this.adminCommentReasonMap.get(comment.id);
    this.commentService.hideComment(this.topic.id, comment.id, { reason: reason || undefined }).subscribe({
      next: () => {
        comment.status = 'hidden';
        this.adminCommentReasonMap.delete(comment.id);
      },
    });
  }

  adminShowComment(comment: CommentNode): void {
    if (!this.topic) return;
    this.commentService.showComment(this.topic.id, comment.id).subscribe({
      next: () => {
        comment.status = 'visible';
      },
    });
  }

  openDeleteCommentConfirm(comment: CommentNode): void {
    if (!this.topic) return;
    this.confirmDeleteTarget = { type: 'comment', id: comment.id, topicId: this.topic.id };
    this.confirmDeleteReason = '';
  }

  selfDeleteComment(comment: CommentNode): void {
    if (!this.topic) return;
    this.commentService.selfDeleteComment(this.topic.id, comment.id).subscribe({
      next: () => {
        comment.status = 'hidden';
      },
    });
  }

  // --- Helpers ---

  canVote(): boolean {
    return this.isLoggedIn && !this.isSuspended;
  }

  isTopicAuthor(): boolean {
    return this.topic?.author.id === this.currentUserId;
  }

  isAdmin(): boolean {
    return this.currentUserRole === 'ADMIN';
  }

  canEditTopic(): boolean {
    return this.isTopicAuthor() || this.isAdmin();
  }

  canEditComment(comment: CommentNode): boolean {
    return comment.author.id === this.currentUserId || this.isAdmin();
  }

  isCommentAuthor(comment: CommentNode): boolean {
    return comment.author.id === this.currentUserId;
  }

  canPostComment(): boolean {
    return this.isLoggedIn && !this.isSuspended && !(this.topic?.isClosed ?? false);
  }

  prevPage(): void {
    if (this.commentsPage > 1) {
      this.commentsPage--;
      this.loadComments();
    }
  }

  nextPage(): void {
    if (this.commentsPage * 20 < this.commentsTotal) {
      this.commentsPage++;
      this.loadComments();
    }
  }

  get totalCommentPages(): number {
    return Math.ceil(this.commentsTotal / 20);
  }
}
