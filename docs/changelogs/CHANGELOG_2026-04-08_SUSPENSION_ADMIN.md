# CHANGELOG — 2026-04-08 — UC15 Interface admin suspension

## Feature implémentée

**UC15 — Interface admin suspension utilisateur** : panneau d'administration complet permettant de suspendre et réactiver des utilisateurs avec motif, historique, notifications in-app et email.

---

## Fichiers créés

| Fichier | Description |
|---|---|
| `src/mail/mail.service.ts` | Service d'envoi d'emails via Nodemailer (mode dégradé si SMTP absent) |
| `src/mail/mail.module.ts` | Module global exportant MailService |
| `src/admin/admin.service.ts` | Service : suspend, reactivate, getUsers, getSuspensionHistory |
| `src/admin/admin.controller.ts` | 4 routes /admin/users/* (JwtAuthGuard + RolesGuard + @Roles(ADMIN)) |
| `src/admin/admin.module.ts` | Module admin important NotificationModule |
| `src/admin/dto/suspend-user.dto.ts` | DTO suspension avec motif obligatoire (max 1000 chars) |
| `src/admin/admin.service.spec.ts` | 12 tests unitaires AdminService |
| `frontend/.../admin.guard.ts` | Guard frontend vérifiant isAuthenticated + role ADMIN |
| `frontend/.../admin.service.ts` | Service frontend : appels API admin + historique |
| `frontend/.../admin-users.component.*` | Page admin : liste utilisateurs, search, pagination, actions |
| `frontend/.../suspension-modal.component.ts` | Modale Material Dialog avec champ motif |
| `frontend/.../suspension-history.component.ts` | Composant historique réutilisable (admin + profil) |
| `docs/audits/AUDIT_2026-04-08_SUSPENSION_ADMIN.md` | Rapport d'audit UC15 |

## Fichiers modifiés

| Fichier | Changements |
|---|---|
| `src/app.module.ts` | +MailModule (global), +AdminModule |
| `src/user/user.service.ts` | +getSuspensionHistory() |
| `src/user/user.controller.ts` | +GET /user/suspension-history |
| `frontend/.../admin.service.ts` | +getMySuspensionHistory() |
| `frontend/.../profil.component.ts` | +SuspensionHistoryComponent import |
| `frontend/.../profil.component.html` | +Section historique de suspension |
| `frontend/.../header.component.ts` | +getter isAdmin |
| `frontend/.../header.component.html` | +lien Admin conditionnel |
| `frontend/.../app.routes.ts` | +route /admin/utilisateurs avec adminGuard |

---

## Architecture mise en place

- **MailModule @Global** : accessible dans tout le projet sans import explicite
- **AdminModule** : import NotificationModule, injection MailService via @Global
- **SuspensionHistoryComponent** : réutilisé dans ProfilComponent (isAdminView=false) et AdminUsersComponent (isAdminView=true)
- **Double protection** : adminGuard frontend + JwtAuthGuard + RolesGuard backend

## Tests ajoutés

- `admin.service.spec.ts` : 12 tests (suspendUser 5 cas, reactivateUser 3 cas, getSuspensionHistory 2 cas, getUsers 2 cas)
- **Total** : 129 tests passent (0 régression)

## Findings sécurité

- Aucune vulnérabilité détectée
- Mode dégradé email : aucun crash si SMTP non configuré
- Role.ADMIN utilisé via enum (pas de magic string)

## Décisions techniques

1. **MailModule @Global** : évite d'importer MailModule dans chaque module. Un seul transporter SMTP instancié.
2. **Mode dégradé** : SMTP optionnel. En dev/staging, les emails sont loggés. Variables MAIL_HOST/PORT/USER/PASS/FROM requises en prod.
3. **confirm() natif pour réactivation** : simple, sans dépendance Material Dialog supplémentaire. Action réversible donc confirmation légère justifiée.
4. **getSuspensionHistory dupliqué** (AdminService + UserService) : séparation claire des responsabilités (admin vs utilisateur propre), accès différent (`/admin/users/:id/...` vs `/user/suspension-history`).
