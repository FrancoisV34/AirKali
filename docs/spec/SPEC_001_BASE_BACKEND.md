# SPEC_001 — Socle Backend NestJS

| Champ | Valeur |
|-------|--------|
| **ID** | SPEC_001 |
| **Titre** | Socle Backend NestJS — Base applicative |
| **Date** | 2026-04-02 |
| **Statut** | Validée |
| **Priorité** | Haute |

---

## 1. Objectif

Créer le socle backend complet d'une mini-application à partir de zéro. Ce socle doit être fonctionnel, containerisé, et servir de fondation pour les futures features (forum, modération, etc.).

Le projet est initialisé dans le répertoire `/Users/fv/Desktop/TestPipelineC`.

---

## 2. Stack technique

| Élément | Choix |
|---------|-------|
| Framework | NestJS (TypeScript) |
| ORM | Prisma |
| Base de données | MySQL 8 |
| Authentification | JWT unique (durée 2h) |
| Hashing mots de passe | bcrypt |
| Validation | class-validator / class-transformer |
| Configuration | @nestjs/config + fichier .env |
| Package manager | npm |
| Containerisation | Docker + docker-compose |
| Logger | Natif NestJS |
| Port API | 3000 |

---

## 3. Architecture applicative

### 3.1 Structure des modules

```
src/
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    dto/
      register.dto.ts
      login.dto.ts
    strategies/
      jwt.strategy.ts
  user/
    user.module.ts
    user.controller.ts
    user.service.ts
  common/
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
    decorators/
      roles.decorator.ts
    enums/
      role.enum.ts
  prisma/
    prisma.module.ts
    prisma.service.ts
  app.module.ts
  main.ts
```

### 3.2 Modules

| Module | Responsabilité |
|--------|---------------|
| `AppModule` | Module racine, importe tous les autres modules |
| `AuthModule` | Register, login, stratégie JWT, guards |
| `UserModule` | Gestion du profil utilisateur |
| `PrismaModule` | Service Prisma partagé (global) |

### 3.3 Préfixe API

Toutes les routes sont préfixées par `/api/` (configuré globalement dans `main.ts`).

---

## 4. Modèle de données

### 4.1 Table `User`

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | Int | PK, auto-incrémenté |
| `email` | String | Unique, not null |
| `username` | String | Unique, not null |
| `firstName` | String | Not null |
| `lastName` | String | Not null |
| `password` | String | Not null (hashé bcrypt) |
| `role` | Enum(`USER`, `ADMIN`, `MODO`) | Not null, défaut `USER` |
| `createdAt` | DateTime | Généré automatiquement |
| `updatedAt` | DateTime | Mis à jour automatiquement |

### 4.2 Enum `Role`

```
USER  — Utilisateur standard
ADMIN — Administrateur (tous les droits)
MODO  — Modérateur (droits user + modération future)
```

Le rôle est un **enum fixe** (pas de table séparée). Le rôle `MODO` est déclaré mais n'a **aucune permission spécifique** dans cette spec. Les permissions MODO seront définies dans une future spec (forum).

### 4.3 Schéma Prisma

Le fichier `prisma/schema.prisma` doit définir :
- Le datasource MySQL
- Le generator Prisma Client
- Le model `User` avec les champs ci-dessus
- L'enum `Role` avec les valeurs `USER`, `ADMIN`, `MODO`

---

## 5. Endpoints

### 5.1 Auth

#### POST `/api/auth/register`

- **Auth requise** : Non
- **Body** :
  ```json
  {
    "email": "string (format email, obligatoire)",
    "username": "string (obligatoire)",
    "firstName": "string (obligatoire)",
    "lastName": "string (obligatoire)",
    "password": "string (obligatoire, min 6 caractères)"
  }
  ```
- **Validations** :
  - Email : format valide, unique en base
  - Username : unique en base
  - Password : minimum 6 caractères
  - Tous les champs obligatoires
- **Traitement** :
  1. Valider les données (class-validator)
  2. Vérifier unicité email et username
  3. Hasher le password avec bcrypt
  4. Créer le user en base avec rôle `USER` par défaut
  5. Générer et retourner un JWT
- **Réponse 201** :
  ```json
  {
    "access_token": "string (JWT)"
  }
  ```
- **Erreurs** :
  - 400 : Données invalides
  - 409 : Email ou username déjà utilisé

#### POST `/api/auth/login`

- **Auth requise** : Non
- **Body** :
  ```json
  {
    "email": "string (obligatoire)",
    "password": "string (obligatoire)"
  }
  ```
- **Traitement** :
  1. Chercher le user par email
  2. Comparer le password avec bcrypt
  3. Générer et retourner un JWT
- **Réponse 200** :
  ```json
  {
    "access_token": "string (JWT)"
  }
  ```
- **Erreurs** :
  - 401 : Email ou mot de passe incorrect

### 5.2 User

#### GET `/api/user/profile`

- **Auth requise** : Oui (JWT)
- **Rôle** : Tous (USER, ADMIN, MODO)
- **Traitement** :
  1. Extraire le userId du JWT
  2. Récupérer le user en base
  3. Retourner le profil (sans le password)
- **Réponse 200** :
  ```json
  {
    "id": "number",
    "email": "string",
    "username": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string (USER|ADMIN|MODO)",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)"
  }
  ```
- **Erreurs** :
  - 401 : Token manquant ou invalide

### 5.3 Pas d'endpoint logout

Le logout est géré côté client (suppression du token). Aucun endpoint serveur.

### 5.4 Pas d'endpoint refresh

Un seul JWT de 2h. L'utilisateur se reconnecte à expiration.

---

## 6. Authentification & Sécurité

### 6.1 JWT

| Paramètre | Valeur |
|-----------|--------|
| Algorithme | HS256 (défaut) |
| Durée | 2 heures |
| Payload | `{ sub: userId, email: string, role: string }` |
| Secret | Variable d'environnement `JWT_SECRET` |

### 6.2 Guards

| Guard | Rôle | Application |
|-------|------|-------------|
| `JwtAuthGuard` | Vérifie la validité du JWT | Appliqué sur les routes protégées |
| `RolesGuard` | Vérifie que le rôle du user correspond aux rôles autorisés | Utilisé avec le décorateur `@Roles()` |

### 6.3 Décorateur `@Roles()`

Décorateur personnalisé pour annoter les routes avec les rôles autorisés. Utilisé en combinaison avec `RolesGuard`.

Exemple d'usage futur :
```typescript
@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
```

### 6.4 CORS

Activé avec la configuration par défaut (`app.enableCors()`) pour le développement.

---

## 7. Containerisation

### 7.1 Dockerfile

- Build multi-stage :
  - **Stage build** : installe les dépendances, compile TypeScript
  - **Stage production** : copie le build, expose le port 3000
- Support du hot reload en dev via docker-compose (volume monté)

### 7.2 docker-compose.yml

| Service | Image | Port | Détails |
|---------|-------|------|---------|
| `api` | Build depuis Dockerfile | 3000:3000 | Volume monté (code source) pour hot reload, dépend de `db` |
| `db` | mysql:8 | 3306:3306 | Volume persistant pour les données |

### 7.3 Démarrage

Les migrations Prisma sont exécutées **automatiquement** au démarrage du container API (via le script de démarrage ou l'entrypoint).

---

## 8. Configuration

### 8.1 Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion MySQL pour Prisma | `mysql://user:password@db:3306/app_db` |
| `JWT_SECRET` | Clé secrète pour signer les JWT | `my-super-secret-key` |
| `JWT_EXPIRATION` | Durée de validité du JWT | `2h` |
| `PORT` | Port de l'API | `3000` |

### 8.2 Fichiers

- `.env` : variables réelles (gitignored)
- `.env.example` : template avec les clés sans les valeurs sensibles
- `.gitignore` : `node_modules/`, `dist/`, `.env`, `prisma/*.db`

---

## 9. Dépendances npm

### 9.1 Production

| Package | Usage |
|---------|-------|
| `@nestjs/common` | Core NestJS |
| `@nestjs/core` | Core NestJS |
| `@nestjs/platform-express` | Serveur HTTP |
| `@nestjs/config` | Gestion des variables d'environnement |
| `@nestjs/jwt` | Module JWT |
| `@nestjs/passport` | Intégration Passport |
| `passport` | Middleware d'authentification |
| `passport-jwt` | Stratégie JWT pour Passport |
| `@prisma/client` | Client Prisma |
| `bcrypt` | Hashing des mots de passe |
| `class-validator` | Validation des DTOs |
| `class-transformer` | Transformation des DTOs |

### 9.2 Développement

| Package | Usage |
|---------|-------|
| `prisma` | CLI Prisma |
| `@types/bcrypt` | Types TypeScript pour bcrypt |
| `@types/passport-jwt` | Types TypeScript pour passport-jwt |

---

## 10. Hors périmètre

| Élément | Raison |
|---------|--------|
| Tests (Jest) | Reporté à plus tard |
| Swagger | Reporté à plus tard |
| Rate limiting | Reporté à plus tard |
| Helmet | Reporté à plus tard |
| CORS avancé | Reporté à plus tard |
| Forum (messages, commentaires) | Spec future |
| Permissions spécifiques MODO | Spec future (forum) |
| Système de rôles dynamique | Non prévu |
| Endpoint logout | Géré côté client |
| Endpoint refresh token | Non nécessaire (JWT unique 2h) |

---

## 11. Critères de validation

La spec est considérée comme implémentée quand :

1. `docker-compose up` démarre l'API et MySQL sans erreur
2. Les migrations Prisma s'exécutent automatiquement
3. `POST /api/auth/register` crée un user et retourne un JWT
4. `POST /api/auth/login` authentifie un user et retourne un JWT
5. `GET /api/user/profile` retourne le profil de l'utilisateur authentifié
6. Les routes protégées rejettent les requêtes sans JWT valide
7. Le `RolesGuard` est fonctionnel et prêt à l'usage
8. Le hot reload fonctionne en développement
