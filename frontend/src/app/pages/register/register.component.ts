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
        password: ['', [Validators.required, Validators.pattern(
          /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:,.<>?]{8,}$/
        )]],
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

  get passwordCriteria(): { label: string; valid: boolean }[] {
    const password = this.form.get('password')?.value || '';
    return [
      { label: '8 caractères minimum', valid: password.length >= 8 },
      { label: '1 lettre majuscule', valid: /[A-Z]/.test(password) },
      { label: '1 chiffre', valid: /\d/.test(password) },
      { label: '1 caractère spécial', valid: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) },
    ];
  }

  get passwordStrength(): { level: string; value: number; color: string } {
    const validCount = this.passwordCriteria.filter(c => c.valid).length;

    if (validCount <= 1) return { level: 'Faible', value: 20, color: 'warn' };
    if (validCount <= 3) return { level: 'Moyen', value: 55, color: 'accent' };
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
