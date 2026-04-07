# CHANGELOG — Auth Frontend + Profil

| Champ | Valeur |
|-------|--------|
| Date | 2026-04-04 |
| Feature | SPEC_004 — Auth Frontend + Profil |
| Commit | `feat(auth): implement frontend authentication, profile page and backend PATCH endpoint` |

## Feature implémentée

Authentification complète côté frontend : pages login et register fonctionnelles, déconnexion, page profil avec modification des informations, header dynamique selon l'état de connexion, guard pour routes protégées, intercepteur HTTP pour le JWT. Endpoint backend PATCH /api/user/profile ajouté.

## Fichiers créés

### Backend
| Fichier | Description |
|---------|-------------|
| `src/user/dto/update-profile.dto.ts` | DTO de mise à jour profil (class-validator, champs optionnels) |

### Frontend — Core
| Fichier | Description |
|---------|-------------|
| `core/services/auth.service.ts` | AuthService : login, register, logout, isAuthenticated, getCurrentUser, updateProfile, BehaviorSubject isLoggedIn$ |
| `core/guards/auth.guard.ts` | AuthGuard (CanActivateFn) → redirige vers /connexion si non authentifié |
| `core/interceptors/auth.interceptor.ts` | Intercepteur Bearer token + auto-logout sur 401 |

### Frontend — Pages
| Fichier | Description |
|---------|-------------|
| `pages/login/login.component.ts/html/scss` | Page connexion (email + password, gestion 401/403) |
| `pages/register/register.component.ts/html/scss` | Page inscription (6 champs, indicateur robustesse mdp, gestion 409) |
| `pages/profil/profil.component.ts/html/scss` | Page profil (formulaire pré-rempli, champs readonly rôle + date, PATCH) |

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/user/user.controller.ts` | Ajout endpoint PATCH /user/profile |
| `src/user/user.service.ts` | Ajout méthode updateProfile (unicité email/username) |
| `src/user/user.service.spec.ts` | 5 nouveaux tests updateProfile (7 total) |
| `frontend/src/app/app.config.ts` | Ajout withInterceptors([authInterceptor]) |
| `frontend/src/app/app.routes.ts` | Routes /inscription, /profil (avec guard), /connexion → LoginComponent |
| `frontend/src/app/core/services/api.service.ts` | Ajout méthode patch<T> |
| `frontend/src/app/shared/components/header/header.component.ts` | Injection AuthService, méthode onLogout |
| `frontend/src/app/shared/components/header/header.component.html` | Header dynamique connecté/non connecté |
| `tsconfig.build.json` | Exclusion du dossier frontend du build NestJS |

## Fichiers supprimés

| Fichier | Raison |
|---------|--------|
| `pages/connexion/connexion.component.ts` | Placeholder remplacé par LoginComponent |

## Tests

- 7 tests backend UserService (2 existants + 5 nouveaux)
- 46/46 tests totaux passent, 0 régressions

## Sécurité

- Aucune vulnérabilité critique
- JWT localStorage : risque XSS accepté (choix spec)
- UserId extrait du JWT, pas d'IDOR possible
- Prisma paramétrisé, pas de raw SQL

## Décisions techniques

| Décision | Justification |
|----------|---------------|
| CanActivateFn (pas class-based guard) | Pattern recommandé Angular 17 |
| HttpInterceptorFn (functional) | Pattern recommandé Angular 17, compatible withInterceptors() |
| BehaviorSubject pour état auth | Permet au header de réagir en temps réel aux changements de connexion |
| map(() => undefined as void) | Résolution type Observable<void> sans cast unsafe |
| Exclusion frontend/ dans tsconfig.build.json | Évite compilation croisée NestJS/Angular |
