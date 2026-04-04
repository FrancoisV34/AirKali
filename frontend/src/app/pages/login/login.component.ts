import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, LoginData } from '../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  form: FormGroup;
  hidePassword = true;
  serverError = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError = '';
    const data: LoginData = this.form.value;

    this.authService.login(data).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.serverError = 'Email ou mot de passe incorrect';
        } else if (err.status === 403) {
          this.serverError =
            'Votre compte a été suspendu. Contactez un administrateur.';
        } else {
          this.serverError = 'Une erreur est survenue. Veuillez réessayer.';
        }
      },
    });
  }
}
