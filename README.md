# Breath for All — Backend API

Plateforme de consultation de la qualite de l'air et de la meteo par commune en France.

## Stack

NestJS (TypeScript) / Prisma / MySQL 8 / Docker

## Demarrage rapide

```bash
# 1. Copier les variables d'environnement
cp .env.example .env

# 2. Lancer les containers (API + MySQL)
docker-compose up -d

# 3. Appliquer les migrations
npx prisma migrate deploy

# 4. Charger les ~35 000 communes francaises
npx prisma db seed

# 5. (Optionnel) Charger des donnees de demo pour le forum
npx ts-node prisma/seed-forum.ts

# 6. L'API est disponible sur http://localhost:3000
```

## Demarrage sans Docker

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npx ts-node prisma/seed-forum.ts  # optionnel, donnees de demo forum
npm run start:dev
```

## Endpoints

### Auth

| Methode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/api/auth/register` | Inscription | Non |
| POST | `/api/auth/login` | Connexion | Non |

### User

| Methode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/user/profile` | Mon profil | Oui |

### Communes

| Methode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/communes?search=...` | Recherche (min 2 chars, max 20 resultats) | Non |
| GET | `/api/communes/:id` | Detail d'une commune | Non |

### Qualite de l'air

| Methode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/communes/:id/air` | Donnees temps reel (Open-Meteo) | Non |
| GET | `/api/communes/:id/air/history?from=&to=` | Historique (max 90 jours) | Non |

### Meteo

| Methode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/communes/:id/meteo` | Donnees temps reel (Open-Meteo) | Non |
| GET | `/api/communes/:id/meteo/history?from=&to=` | Historique (max 90 jours) | Non |

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL de connexion MySQL |
| `JWT_SECRET` | Cle secrete JWT |
| `JWT_EXPIRATION` | Duree du token (defaut: `2h`) |
| `PORT` | Port API (defaut: `3000`) |

## Cron jobs

| Job | Frequence | Action |
|-----|-----------|--------|
| Collecte air | Toutes les heures | Open-Meteo Air Quality → BDD (communes actives) |
| Collecte meteo | Toutes les heures | Open-Meteo Weather → BDD (communes actives) |
| MAJ population | Minuit | geo.api.gouv.fr → BDD (communes actives) |
| Desactivation | Minuit | Desactive les communes inactives depuis 7 jours |

## Troubleshooting

### 500 Internal Server Error sur `GET /api/user/profile`

Si l'endpoint `/api/user/profile` retourne un 500 alors que le backend tourne normalement, c'est probablement un **token JWT expire ou corrompu** stocke dans le `localStorage` du navigateur. Le JWT guard echoue a decoder le token et NestJS retourne un 500 generique au lieu d'un 401.

**Solution** : se deconnecter et se reconnecter (ou vider le `localStorage` dans les DevTools du navigateur). Un nouveau token sera genere au login.

### Port 3000 deja utilise au `docker compose up`

Si le container API ne demarre pas avec `bind: address already in use`, un process Node (NestJS local) tourne deja sur le port 3000. Deux options :
- **Mode Docker** : `lsof -i :3000` pour trouver le PID, puis `kill <PID>`, et relancer `docker compose up -d`
- **Mode local** : lancer uniquement la DB avec `docker compose up -d db` et NestJS en local avec `npm run start:dev`

## Tests

```bash
npm test
```

## Structure du projet

```
src/
  auth/           Authentification JWT (register, login)
  user/           Profil utilisateur
  commune/        Recherche et detail des communes
  air-quality/    Qualite de l'air (temps reel + historique)
  meteo/          Meteo (temps reel + historique)
  collecte/       Cron jobs + clients API externes
  common/         Guards, decorators, enums, utils
  prisma/         Service Prisma (global)
```
