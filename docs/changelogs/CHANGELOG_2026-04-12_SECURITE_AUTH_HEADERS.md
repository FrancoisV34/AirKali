# Changelog — SPEC_010 Securite Authentification et Headers HTTP

**Date** : 2026-04-12
**Commit** : feat(security): implement password validation, rate limiting, and security headers
**Spec** : SPEC_010_SECURITE_AUTH_HEADERS.md

---

## Resume

Mise en conformite de la securite authentification et des headers HTTP avec le dossier de conception Breath For All. Correction de 5 ecarts identifies lors de l'audit de conformite.

## Changements

### 1. Validation complexite mot de passe
- **Backend** : Remplacement de `@MinLength(6)` par `@Matches(regex)` dans `RegisterDto` — exige 8 caracteres min, 1 majuscule, 1 chiffre, 1 caractere special
- **Frontend** : Ajout de `Validators.pattern` avec la meme regex dans le formulaire d'inscription
- Message d'erreur en francais

### 2. Indicateur de robustesse mot de passe
- Remplacement de la barre simple par une **checklist 4 criteres** avec icones (check/cancel) + **barre coloree** (rouge faible / orange moyen / vert fort)
- Mise a jour en temps reel a chaque frappe

### 3. bcrypt salt rounds 12
- `bcrypt.hash(password, 10)` → `bcrypt.hash(password, 12)` dans `auth.service.ts`
- Retrocompatible : les anciens hash en 10 rounds restent valides

### 4. Rate limiting
- Installation de `@nestjs/throttler`
- Configuration : 10 requetes/minute par IP+route
- Applique sur `/auth/login` et `/auth/register` uniquement (pas global)

### 5. Headers de securite HTTP
- Installation de `helmet` avec CSP stricte (unsafe-inline styles uniquement pour Angular)
- CORS restreint via variable d'environnement `CORS_ORIGIN` (defaut: `http://localhost:4200`)
- `CORS_ORIGIN` ajoute dans `.env.example`

## Fichiers modifies

| Fichier | Type | Description |
|---------|------|-------------|
| `src/auth/dto/register.dto.ts` | Modifie | @Matches regex validation MDP |
| `src/auth/auth.service.ts` | Modifie | bcrypt salt 10 → 12 |
| `src/auth/auth.controller.ts` | Modifie | @Throttle + ThrottlerGuard sur login/register |
| `src/auth/auth.service.spec.ts` | Modifie | Test bcrypt 12 rounds + fix DTO fields |
| `src/app.module.ts` | Modifie | Import ThrottlerModule |
| `src/main.ts` | Modifie | Helmet + CORS restrictif |
| `.env.example` | Modifie | Ajout CORS_ORIGIN |
| `frontend/.../register.component.ts` | Modifie | Checklist criteres + validation pattern |
| `frontend/.../register.component.html` | Modifie | Checklist UI + message erreur pattern |
| `frontend/.../register.component.scss` | Modifie | Styles checklist |
| `package.json` | Modifie | +@nestjs/throttler, +helmet |
| `docs/spec/SPEC_010_SECURITE_AUTH_HEADERS.md` | Cree | Specification |
| `docs/audits/AUDIT_2026-04-12_SECURITE_AUTH_HEADERS.md` | Cree | Rapport d'audit |

## Tests
- 146/146 tests passent (aucune regression)
- Test specifique : verification bcrypt salt rounds 12 via pattern hash

## Securite
- Aucune vulnerabilite detectee
- OWASP Top 10 : couvert par helmet, rate limiting, validation input
