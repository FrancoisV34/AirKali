import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import {
  AuthService,
  UpdateProfileData,
  UserProfile,
} from '../../core/services/auth.service';
import { Favorite, FavoriteService } from '../../core/services/favorite.service';
import { Commune, CommuneService } from '../../core/services/commune.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatListModule,
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
  favorites: Favorite[] = [];

  // Commune section
  communeSearchInput = '';
  communeResults: Commune[] = [];
  communeSearchError = '';
  communeSearchLoading = false;
  selectedCommuneResult: Commune | null = null;
  communeSaveMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private favoriteService: FavoriteService,
    private communeService: CommuneService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      adressePostale: [''],
    });

    this.favoriteService.loadFavorites();
    this.favoriteService.favorites$.subscribe((favs) => {
      this.favorites = favs;
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

  onRemoveFavorite(communeId: number): void {
    this.favoriteService.removeFavorite(communeId).subscribe();
  }

  // --- Commune de référence ---

  onCommuneSearch(): void {
    const cp = this.communeSearchInput.trim();
    this.communeSearchError = '';
    this.communeResults = [];
    this.selectedCommuneResult = null;
    this.communeSaveMessage = '';

    if (!/^\d{5}$/.test(cp)) {
      this.communeSearchError = 'Veuillez saisir un code postal à 5 chiffres.';
      return;
    }

    this.communeSearchLoading = true;
    this.communeService.getCommunesByCodePostal(cp).subscribe({
      next: (results) => {
        this.communeResults = results;
        this.communeSearchLoading = false;
        if (results.length === 0) {
          this.communeSearchError = 'Aucune commune couverte pour ce code postal.';
        }
      },
      error: () => {
        this.communeSearchLoading = false;
        this.communeSearchError = 'Erreur lors de la recherche.';
      },
    });
  }

  onSelectCommuneResult(commune: Commune): void {
    this.selectedCommuneResult = commune;
  }

  onSaveCommune(): void {
    if (!this.selectedCommuneResult) return;

    this.communeSaveMessage = '';
    this.authService
      .updateUserCommune(this.selectedCommuneResult.id, this.communeSearchInput.trim())
      .subscribe({
        next: (updated) => {
          this.profile = updated;
          this.communeResults = [];
          this.selectedCommuneResult = null;
          this.communeSaveMessage = 'Commune de référence enregistrée.';
          this.favoriteService.loadFavorites();
        },
        error: () => {
          this.communeSaveMessage = 'Erreur lors de l\'enregistrement.';
        },
      });
  }

  onRemoveCommune(): void {
    if (!this.profile?.communeId) return;

    const isFavorite = this.favorites.some(
      (f) => f.communeId === this.profile!.communeId,
    );

    if (isFavorite) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          message:
            'Cette commune est également dans vos favoris. Souhaitez-vous la supprimer de vos favoris ?',
        },
      });

      dialogRef.afterClosed().subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.favoriteService
            .removeFavorite(this.profile!.communeId!)
            .subscribe(() => {
              this._clearCommune();
            });
        } else {
          this._clearCommune();
        }
      });
    } else {
      this._clearCommune();
    }
  }

  private _clearCommune(): void {
    this.authService.updateUserCommune(null).subscribe({
      next: (updated) => {
        this.profile = updated;
        this.communeSaveMessage = '';
        this.communeResults = [];
        this.selectedCommuneResult = null;
        this.communeSearchInput = '';
        this.favoriteService.loadFavorites();
      },
    });
  }
}
