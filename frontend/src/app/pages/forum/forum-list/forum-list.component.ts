import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ForumService } from '../../../core/services/forum.service';
import { CategoryService } from '../../../core/services/category.service';
import { AuthService } from '../../../core/services/auth.service';
import { Category, TopicSummary } from '../../../core/models/forum.models';

@Component({
  selector: 'app-forum-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './forum-list.component.html',
  styleUrl: './forum-list.component.scss',
})
export class ForumListComponent implements OnInit {
  topics: TopicSummary[] = [];
  categories: Category[] = [];
  total = 0;
  page = 1;
  sort = 'recent';
  selectedCategoryId: number | undefined;
  loading = false;
  isLoggedIn = false;
  isSuspended = false;

  constructor(
    private forumService: ForumService,
    private categoryService: CategoryService,
    public authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        this.authService.getCurrentUser().subscribe((user) => {
          this.isSuspended = user.estSuspendu;
        });
      }
    });
    this.categoryService.getCategories().subscribe((cats) => (this.categories = cats));
    this.loadTopics();
  }

  loadTopics(): void {
    this.loading = true;
    this.forumService.getTopics(this.page, this.sort, this.selectedCategoryId).subscribe({
      next: (res) => {
        this.topics = res.data;
        this.total = res.total;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onSortChange(): void {
    this.page = 1;
    this.loadTopics();
  }

  onCategoryChange(): void {
    this.page = 1;
    this.loadTopics();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadTopics();
    }
  }

  nextPage(): void {
    if (this.page * 20 < this.total) {
      this.page++;
      this.loadTopics();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.total / 20);
  }

  canCreateTopic(): boolean {
    return this.isLoggedIn && !this.isSuspended;
  }
}
