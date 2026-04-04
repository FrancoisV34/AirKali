# AUDIT — Auth Frontend + Profil

| Champ | Valeur |
|-------|--------|
| Date | 2026-04-04 |
| Feature | SPEC_004 — Auth Frontend + Profil |
| Qualité globale | BONNE |

## 1. Cohérence architecture

| Point | Statut |
|-------|--------|
| AuthService (login, register, logout, profile) | Conforme |
| AuthGuard (CanActivateFn) sur /profil | Conforme |
| AuthInterceptor (Bearer + 401 logout) | Conforme |
| LoginComponent avec gestion 401/403 | Conforme |
| RegisterComponent avec indicateur robustesse | Conforme |
| ProfilComponent (lecture + modification) | Conforme |
| Header dynamique (connecté/non connecté) | Conforme |
| PATCH /api/user/profile (backend) | Conforme |
| UpdateProfileDto avec validations class-validator | Conforme |
| Routes lazy-loaded + guard | Conforme |

## 2. Sécurité

- JWT stocké en localStorage (choix spec, risque XSS accepté)
- Pas de raw SQL, Prisma paramétrisé
- Angular sanitize natif sur les templates
- ValidationPipe global avec whitelist
- UserId extrait du JWT, pas du body (pas d'IDOR)

## 3. Tests

- Tests backend updateProfile : 7/7 passent
  - Nominal, conflict email, conflict username, partial update, skip check
- Tests frontend : hors périmètre

## 4. Points d'attention

- Le tsconfig.build.json a été modifié pour exclure `frontend/` du build NestJS (évite les erreurs de compilation croisée)
- L'ancien placeholder ConnexionComponent a été supprimé et remplacé par LoginComponent
