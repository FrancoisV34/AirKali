# CHANGELOG — 2026-04-08 — UC12 Localisation utilisateur

## Feature implémentée

**UC12 — Gérer sa localisation** : permet à l'utilisateur de définir une commune de référence depuis son profil (via code postal), avec centrage automatique de la carte et ajout aux favoris.

---

## Fichiers créés

| Fichier | Description |
|---|---|
| `prisma/migrations/20260408183643_add_commune_ref_and_suspension_log/migration.sql` | Migration DB : communeId sur User, table SuspensionLog |
| `src/user/dto/update-commune.dto.ts` | DTO pour PATCH /user/commune avec gestion du null |
| `frontend/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts` | Dialogue de confirmation générique (Material Dialog) |
| `docs/alerts/ALERT_2026-04-08_LOCALISATION_SUSPENSION.md` | Alerte HAUTE (DTO null) corrigée en cours de pipeline |
| `docs/audits/AUDIT_2026-04-08_LOCALISATION.md` | Rapport d'audit UC12 |

## Fichiers modifiés

| Fichier | Changements |
|---|---|
| `prisma/schema.prisma` | +communeId User, +usersReference Commune, +SuspensionLog table |
| `src/commune/commune.service.ts` | +findByCodePostal() : recherche communes actives par CP |
| `src/commune/commune.controller.ts` | +GET /communes/par-code-postal |
| `src/commune/commune.service.spec.ts` | +5 tests findByCodePostal |
| `src/user/user.service.ts` | +updateCommune(), getProfile() expose communeId+commune |
| `src/user/user.controller.ts` | +PATCH /user/commune |
| `src/user/user.service.spec.ts` | +10 tests updateCommune + getProfile étendu |
| `frontend/src/app/core/services/commune.service.ts` | +getCommunesByCodePostal() |
| `frontend/src/app/core/services/auth.service.ts` | UserProfile +communeId+commune, +updateUserCommune() |
| `frontend/src/app/pages/profil/profil.component.ts` | Section commune : search, select, save, remove+dialog |
| `frontend/src/app/pages/profil/profil.component.html` | UI section "Ma commune de référence" |
| `frontend/src/app/pages/recherche/recherche.component.ts` | _centerOnUserCommune() au chargement si connecté |

---

## Architecture mise en place

- **Backend** : CommuneService étendu (findByCodePostal), UserService étendu (updateCommune + _activateCommune privé), nouveau DTO
- **Pattern** : PrismaService direct dans UserService pour éviter dépendance circulaire FavoriteModule ↔ UserModule
- **Frontend** : ProfilComponent standalone avec FormsModule + MatDialogModule, ConfirmDialogComponent générique réutilisable

## Tests ajoutés

- `commune.service.spec.ts` : 5 tests findByCodePostal (CP valide, vide, 4/6 chiffres, non-numérique)
- `user.service.spec.ts` : +10 tests (getProfile avec commune, updateCommune 7 cas)
- **Total** : 117 tests passent (0 régression)

## Findings sécurité

- Validation regex `/^\d{5}$/` côté backend ET frontend
- Aucune vulnérabilité détectée

## Décisions techniques

1. **Activation commune dupliquée** dans UserService (_activateCommune) : évite la dépendance circulaire avec FavoriteModule. Acceptable car logique identique (~15 lignes).
2. **adressePostale nullifiée** avec le communeId lors de la suppression : cohérent — le champ stocke le CP de la commune de référence.
3. **@ValidateIf pour null** dans le DTO : class-validator ignore `undefined` avec @IsOptional mais pas `null`, nécessite @ValidateIf explicite.
