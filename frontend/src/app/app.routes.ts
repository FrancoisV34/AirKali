import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'forum',
    loadComponent: () =>
      import('./pages/forum/forum.component').then((m) => m.ForumComponent),
  },
  {
    path: 'recherche',
    loadComponent: () =>
      import('./pages/recherche/recherche.component').then(
        (m) => m.RechercheComponent,
      ),
  },
  {
    path: 'connexion',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'inscription',
    loadComponent: () =>
      import('./pages/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'profil',
    loadComponent: () =>
      import('./pages/profil/profil.component').then(
        (m) => m.ProfilComponent,
      ),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
