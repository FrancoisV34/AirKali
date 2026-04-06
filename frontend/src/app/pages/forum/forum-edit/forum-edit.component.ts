import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ForumService } from '../../../core/services/forum.service';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models/forum.models';
import { SafeMarkdownPipe } from '../../../shared/pipes/safe-markdown.pipe';

@Component({
  selector: 'app-forum-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SafeMarkdownPipe,
  ],
  templateUrl: './forum-edit.component.html',
  styleUrl: './forum-edit.component.scss',
})
export class ForumEditComponent implements OnInit {
  form: FormGroup;
  categories: Category[] = [];
  previewMode = false;
  submitting = false;
  loading = true;
  errorMsg = '';
  topicId!: number;

  constructor(
    private fb: FormBuilder,
    private forumService: ForumService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
      content: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2000)]],
      categoryId: [null],
    });
  }

  ngOnInit(): void {
    this.topicId = Number(this.route.snapshot.paramMap.get('id'));
    this.categoryService.getCategories().subscribe((cats) => (this.categories = cats));
    this.forumService.getTopic(this.topicId).subscribe({
      next: (topic) => {
        this.form.patchValue({
          title: topic.title,
          content: topic.content,
          categoryId: topic.category?.id ?? null,
        });
        this.loading = false;
      },
      error: () => this.router.navigate(['/forum']),
    });
  }

  get titleControl() { return this.form.get('title')!; }
  get contentControl() { return this.form.get('content')!; }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.errorMsg = '';

    const val = this.form.value;
    this.forumService
      .updateTopic(this.topicId, {
        title: val.title.trim(),
        content: val.content.trim(),
        categoryId: val.categoryId ?? null,
      })
      .subscribe({
        next: () => this.router.navigate(['/forum', this.topicId]),
        error: (err) => {
          this.submitting = false;
          if (err.status === 403) {
            this.errorMsg = "Vous n'êtes pas autorisé à modifier ce topic.";
          } else {
            this.errorMsg = 'Une erreur est survenue. Réessayez.';
          }
        },
      });
  }
}
