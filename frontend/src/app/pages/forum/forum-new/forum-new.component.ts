import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { ForumService } from '../../../core/services/forum.service';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models/forum.models';
import { SafeMarkdownPipe } from '../../../shared/pipes/safe-markdown.pipe';

@Component({
  selector: 'app-forum-new',
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
    SafeMarkdownPipe,
  ],
  templateUrl: './forum-new.component.html',
  styleUrl: './forum-new.component.scss',
})
export class ForumNewComponent implements OnInit {
  form: FormGroup;
  categories: Category[] = [];
  previewMode = false;
  submitting = false;
  errorMsg = '';

  constructor(
    private fb: FormBuilder,
    private forumService: ForumService,
    private categoryService: CategoryService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
      content: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2000)]],
      categoryId: [null],
    });
  }

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe((cats) => (this.categories = cats));
  }

  get titleControl() { return this.form.get('title')!; }
  get contentControl() { return this.form.get('content')!; }

  togglePreview(): void {
    this.previewMode = !this.previewMode;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.errorMsg = '';

    const val = this.form.value;
    this.forumService
      .createTopic({
        title: val.title.trim(),
        content: val.content.trim(),
        categoryId: val.categoryId ?? null,
      })
      .subscribe({
        next: (topic) => this.router.navigate(['/forum', topic.id]),
        error: (err) => {
          this.submitting = false;
          if (err.status === 429) {
            this.errorMsg = 'Limite de 3 topics par jour atteinte.';
          } else if (err.status === 403) {
            this.errorMsg = 'Votre compte est suspendu.';
          } else {
            this.errorMsg = 'Une erreur est survenue. Réessayez.';
          }
        },
      });
  }
}
