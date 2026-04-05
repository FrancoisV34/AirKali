import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { Favorite, FavoriteService } from '../../../../core/services/favorite.service';
import { Commune } from '../../../../core/services/commune.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-favorites-select',
  standalone: true,
  imports: [CommonModule, MatSelectModule, MatFormFieldModule, MatIconModule],
  templateUrl: './favorites-select.component.html',
  styleUrl: './favorites-select.component.scss',
})
export class FavoritesSelectComponent implements OnInit {
  @Output() favoriteSelected = new EventEmitter<Commune>();

  favorites: Favorite[] = [];
  isLoggedIn = false;

  constructor(
    public favoriteService: FavoriteService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        this.favoriteService.loadFavorites();
      }
    });

    this.favoriteService.favorites$.subscribe((favs) => {
      this.favorites = favs;
    });
  }

  onSelect(favorite: Favorite): void {
    this.favoriteSelected.emit(favorite.commune);
  }
}
