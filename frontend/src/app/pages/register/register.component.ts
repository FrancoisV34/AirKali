import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService, RegisterData } from '../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  form: FormGroup;
  hidePassword = true;
  hideConfirm = true;
  serverError = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        username: ['', [Validators.required]],
        nom: ['', [Validators.required]],
        prenom: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  private passwordMatchValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    if (password && confirm && password !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }

  get passwordStrength(): { level: string; value: number; color: string } {
    const password = this.form.get('password')?.value || '';
    let score = 0;

    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 'Faible', value: 20, color: 'warn' };
    if (score <= 3) return { level: 'Moyen', value: 55, color: 'accent' };
    return { level: 'Fort', value: 100, color: 'primary' };
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError = '';
    const { confirmPassword, ...data } = this.form.value;
    const registerData: RegisterData = data;

    this.authService.register(registerData).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.serverError =
            err.error?.message || 'Email ou username déjà utilisé';
        } else if (err.status === 400) {
          this.serverError = 'Données invalides. Vérifiez le formulaire.';
        } else {
          this.serverError = 'Une erreur est survenue. Veuillez réessayer.';
        }
      },
    });
  }
}
