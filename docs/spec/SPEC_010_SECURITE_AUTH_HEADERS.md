# SPEC_010 — Securite Authentification et Headers HTTP

**Date** : 2026-04-12
**Statut** : A developper
**Priorite** : Haute (conformite dossier de conception)
**Reference** : Dossier de conception Breath For All (20/03/2026), sections 7.1, 7.3, 9

---

## 1. Contexte et objectif

L'audit de conformite avec le dossier de conception a revele 5 ecarts de securite sur l'authentification et les headers HTTP. Cette spec couvre leur correction pour atteindre la conformite complete sur ces aspects.

**Items du TODO conformite couverts** : #2, #3, #4, #5, #9

---

## 2. Fonctionnalites

### 2.1 Validation complexite mot de passe

**Regle** : Le mot de passe doit contenir au minimum :
- 8 caracteres
- 1 lettre majuscule
- 1 chiffre
- 1 caractere special (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Scope** : Formulaire d'inscription uniquement (le changement de mot de passe n'existe pas encore — spec future).

**Backend** :
- Ajouter une validation regex dans le DTO d'inscription (`RegisterDto`) via `@Matches` de class-validator
- Regex : `/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:,.<>?]{8,}$/`
- Message d'erreur en francais : "Le mot de passe doit contenir au moins 8 caracteres, une majuscule, un chiffre et un caractere special"

**Frontend** :
- Validation miroir dans le formulaire Angular d'inscription
- Message d'erreur affiche sous le champ si non conforme

### 2.2 Indicateur de robustesse du mot de passe

**Composant Angular** : `PasswordStrengthComponent` (composant reutilisable)

**Checklist temps reel** : Affiche 4 criteres avec indicateur visuel (coche/croix) :
- [ ] 8 caracteres minimum
- [ ] 1 lettre majuscule
- [ ] 1 chiffre
- [ ] 1 caractere special

**Barre coloree** :
| Criteres valides | Couleur | Label |
|-----------------|---------|-------|
| 0-1 | Rouge | Faible |
| 2-3 | Orange | Moyen |
| 4 | Vert | Fort |

**Emplacement** : Sous le champ mot de passe sur la page d'inscription.

**Comportement** : Mise a jour en temps reel a chaque frappe clavier (keyup/input event).

**Note** : Ce composant sera reutilise sur le formulaire de changement de mot de passe quand celui-ci sera developpe.

### 2.3 bcrypt salt rounds 12

**Modification** : Passer le nombre de salt rounds de 10 a 12.

**Fichier** : `src/auth/auth.service.ts`

**Changement** : `bcrypt.hash(dto.password, 10)` → `bcrypt.hash(dto.password, 12)`

**Impact** : Aucune migration necessaire. Les mots de passe existants (hashes en 10 rounds) restent valides avec `bcrypt.compare()`. Seuls les nouveaux mots de passe seront hashes en 12 rounds.

### 2.4 Rate limiting routes sensibles

**Librairie** : `@nestjs/throttler`

**Configuration** :
- Limite : 10 requetes par minute
- Granularite : par IP + par route (pas un compteur global par IP)
- Reponse en cas de depassement : HTTP 429 Too Many Requests

**Routes protegees** :
| Route | Methode |
|-------|---------|
| `/auth/login` | POST |
| `/auth/register` | POST |

**Implementation** :
- Installer `@nestjs/throttler`
- Configurer le `ThrottlerModule` dans `AppModule`
- Appliquer le decorator `@Throttle()` sur les routes ciblees dans `AuthController`
- Ne PAS appliquer de rate limiting global sur les autres routes

### 2.5 Headers de securite HTTP

#### CORS
- Restreindre l'origine via variable d'environnement `CORS_ORIGIN`
- Format : simple string (une seule origine)
- Valeur par defaut : `http://localhost:4200`
- Ajouter `CORS_ORIGIN` dans `.env.example`

**Configuration** :
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
});
```

#### Helmet
- Installer `helmet`
- Activer avec configuration full securite
- CSP adaptee pour Angular : autoriser `'unsafe-inline'` pour les styles uniquement (Angular en a besoin), scripts stricts
- Headers actives : Content-Security-Policy, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Strict-Transport-Security, X-XSS-Protection, Referrer-Policy

**Fichier** : `src/main.ts`

---

## 3. Fichiers impactes

| Fichier | Modification |
|---------|-------------|
| `src/auth/auth.service.ts` | bcrypt salt 10 → 12 |
| `src/auth/dto/register.dto.ts` | Ajout validation regex mot de passe |
| `src/auth/auth.controller.ts` | Decorateurs @Throttle sur login/register |
| `src/app.module.ts` | Import ThrottlerModule |
| `src/main.ts` | Config CORS restrictive + helmet |
| `.env.example` | Ajout CORS_ORIGIN |
| Frontend : composant inscription | Validation MDP + indicateur robustesse |
| Frontend : nouveau composant | `PasswordStrengthComponent` |

---

## 4. Regles metier

| Regle | Detail |
|-------|--------|
| MDP_VALID | Rejet inscription si MDP non conforme (8 car, 1 maj, 1 chiffre, 1 special) |
| MDP_STRENGTH | Affichage temps reel : rouge 0-1, orange 2-3, vert 4/4 criteres |
| RATE_LIMIT | 429 apres 10 req/min par IP+route sur /auth/login et /auth/register |
| CORS | Seule l'origine definie dans CORS_ORIGIN est autorisee |
| HEADERS | Helmet full securite, CSP avec unsafe-inline styles uniquement |

---

## 5. Criteres d'acceptation

- [ ] Un mot de passe faible ("abc123") est rejete a l'inscription avec message francais
- [ ] Un mot de passe conforme ("MonPass1!") est accepte
- [ ] La checklist affiche en temps reel les criteres valides/invalides
- [ ] La barre change de couleur selon le nombre de criteres (rouge/orange/vert)
- [ ] Les nouveaux comptes ont un hash bcrypt en 12 rounds
- [ ] Les anciens comptes peuvent toujours se connecter (hash 10 rounds compatible)
- [ ] Apres 10 tentatives de login en 1 minute, la 11e retourne HTTP 429
- [ ] Le rate limiting est independant par route (10 sur login + 10 sur register)
- [ ] L'app frontend fonctionne correctement avec les headers helmet actives
- [ ] CORS refuse les requetes depuis une origine non autorisee
- [ ] La variable CORS_ORIGIN est documentee dans .env.example

---

## 6. Hors scope

- Changement de mot de passe (spec future)
- Mot de passe oublie / reset (spec future)
- Rate limiting sur d'autres routes
- Multi-origines CORS
