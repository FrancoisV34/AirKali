import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'forum',
    loadComponent: () =>
      import('./pages/forum/forum-list/forum-list.component').then(
        (m) => m.ForumListComponent,
      ),
  },
  {
    path: 'forum/new',
    loadComponent: () =>
      import('./pages/forum/forum-new/forum-new.component').then(
        (m) => m.ForumNewComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'forum/:id/edit',
    loadComponent: () =>
      import('./pages/forum/forum-edit/forum-edit.component').then(
        (m) => m.ForumEditComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'forum/:id',
    loadComponent: () =>
      import('./pages/forum/forum-detail/forum-detail.component').then(
        (m) => m.ForumDetailComponent,
      ),
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
  {
    path: 'admin/utilisateurs',
    loadComponent: () =>
      import('./pages/admin/admin-users/admin-users.component').then(
        (m) => m.AdminUsersComponent,
      ),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
