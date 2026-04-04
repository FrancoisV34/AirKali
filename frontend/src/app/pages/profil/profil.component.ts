import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
  AuthService,
  UpdateProfileData,
  UserProfile,
} from '../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.scss',
})
export class ProfilComponent implements OnInit {
  form!: FormGroup;
  profile: UserProfile | null = null;
  serverError = '';
  successMessage = '';
  loading = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      adressePostale: [''],
    });

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.form.patchValue({
          nom: profile.nom,
          prenom: profile.prenom,
          username: profile.username,
          email: profile.email,
          adressePostale: profile.adressePostale || '',
        });
        this.loading = false;
      },
      error: () => {
        this.serverError = 'Impossible de charger le profil.';
        this.loading = false;
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError = '';
    this.successMessage = '';

    const data: UpdateProfileData = this.form.value;

    this.authService.updateProfile(data).subscribe({
      next: (updated) => {
        this.profile = updated;
        this.successMessage = 'Profil mis à jour';
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.serverError =
            err.error?.message || 'Email ou username déjà utilisé';
        } else {
          this.serverError = 'Une erreur est survenue. Veuillez réessayer.';
        }
      },
    });
  }
}
