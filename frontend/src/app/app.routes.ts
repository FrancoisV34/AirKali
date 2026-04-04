import { Routes } from '@angular/router';

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
      import('./pages/connexion/connexion.component').then(
        (m) => m.ConnexionComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
