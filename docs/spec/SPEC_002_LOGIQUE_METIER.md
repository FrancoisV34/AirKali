# SPEC_002 — Logique Métier Environnementale

| Champ | Valeur |
|-------|--------|
| **ID** | SPEC_002 |
| **Titre** | Logique Métier — Communes, Données Air/Météo, Collecte Cron |
| **Date** | 2026-04-02 |
| **Statut** | Validée |
| **Priorité** | Haute |
| **Dépendance** | SPEC_001 (Socle Backend NestJS) |

---

## 1. Objectif

Consolider la base backend en ajoutant la logique métier du projet Breath for All :
- Migration du modèle User pour coller à l'ERD BfA
- Entités Commune, DonneeAir, DonneeMeteo, LogCollecte
- Seed initial des communes françaises (~35 000)
- Collecte automatique cron (air, météo, population) sur les communes actives
- Endpoints de consultation temps réel (via APIs externes) et d'historique (via BDD)

---

## 2. Migration du modèle User

### 2.1 Changements

| Action | Champ | Détail |
|--------|-------|--------|
| Renommer | `firstName` → `prenom` | String, not null |
| Renommer | `lastName` → `nom` | String, not null |
| Conserver | `username` | String, unique, not null |
| Modifier | `role` | Enum : `UTILISATEUR`, `ADMIN` (supprime USER, ADMIN, MODO) |
| Ajouter | `adressePostale` | String, nullable |
| Ajouter | `estSuspendu` | Boolean, défaut false |
| Inchangé | `email`, `password`, `createdAt`, `updatedAt` | — |

### 2.2 Password

Règles inchangées par rapport à SPEC_001 : bcrypt salt 10, minimum 6 caractères.

### 2.3 Rôle par défaut

À l'inscription, le rôle est `UTILISATEUR`. Le rôle `ADMIN` est attribué manuellement (seed ou modification directe en base).

### 2.4 Suspension

Un utilisateur avec `estSuspendu = true` :
- Ne peut pas se connecter (login rejeté avec erreur 403)
- Ne peut pas publier sur le forum (spec future)

Le endpoint `POST /api/auth/login` doit vérifier `estSuspendu` et retourner une erreur spécifique.

---

## 3. Nouvelles entités

### 3.1 Commune

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | Int | PK, auto-incrémenté |
| `nom` | String | Not null |
| `codePostal` | String | Not null (PAS unique — plusieurs communes par code postal) |
| `codeInsee` | String | Unique, not null |
| `population` | Int | Nullable |
| `latitude` | Decimal(9,6) | Not null |
| `longitude` | Decimal(9,6) | Not null |
| `active` | Boolean | Défaut false |
| `activatedAt` | DateTime | Nullable (date de dernière activation) |

**Relations :** 1→N avec DonneeAir, DonneeMeteo

### 3.2 DonneeAir

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | Int | PK, auto-incrémenté |
| `communeId` | Int | FK → Commune, not null |
| `ozone` | Float | Nullable |
| `co` | Float | Nullable (monoxyde de carbone) |
| `pm25` | Float | Nullable (particules fines PM2.5) |
| `pm10` | Float | Nullable (particules fines PM10) |
| `indiceQualite` | Int | Nullable (European AQI) |
| `dateHeure` | DateTime | Not null |

**Index :** `(communeId, dateHeure)` pour les requêtes d'historique.

### 3.3 DonneeMeteo

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | Int | PK, auto-incrémenté |
| `communeId` | Int | FK → Commune, not null |
| `temperature` | Float | Nullable (°C) |
| `pression` | Float | Nullable (hPa) |
| `humidite` | Float | Nullable (%) |
| `meteoCiel` | String | Nullable (texte mappé depuis WMO weather code) |
| `vitesseVent` | Float | Nullable (km/h) |
| `dateHeure` | DateTime | Not null |

**Index :** `(communeId, dateHeure)` pour les requêtes d'historique.

### 3.4 LogCollecte

| Champ | Type | Contraintes |
|-------|------|-------------|
| `id` | Int | PK, auto-incrémenté |
| `type` | Enum(`AIR`, `METEO`, `POPULATION`) | Not null |
| `statut` | Enum(`SUCCESS`, `ERROR`) | Not null |
| `communesTraitees` | Int | Not null |
| `communesErreur` | Int | Défaut 0 |
| `dureeMs` | Int | Not null |
| `dateExecution` | DateTime | Not null |

---

## 4. APIs externes

### 4.1 geo.api.gouv.fr — Communes & Population

**URL seed :** `https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,centre,population&format=json`

**Mapping :**
| Réponse API | Champ BDD |
|-------------|-----------|
| `code` | `codeInsee` |
| `nom` | `nom` |
| `codesPostaux[0]` | `codePostal` (premier code postal) |
| `centre.coordinates[1]` | `latitude` |
| `centre.coordinates[0]` | `longitude` |
| `population` | `population` |

**Usage :**
- **Seed initial** : charge toutes les communes, `active = false`
- **Cron quotidien** : met à jour `population` pour les communes actives uniquement

### 4.2 Open-Meteo Air Quality

**URL :** `https://air-quality-api.open-meteo.com/v1/air-quality`

**Paramètres :**
```
?latitude={lat}&longitude={lng}&current=pm10,pm2_5,carbon_monoxide,ozone,european_aqi
```

**Mapping :**
| Réponse API | Champ BDD |
|-------------|-----------|
| `current.pm2_5` | `pm25` |
| `current.pm10` | `pm10` |
| `current.carbon_monoxide` | `co` |
| `current.ozone` | `ozone` |
| `current.european_aqi` | `indiceQualite` |

**Usage :**
- **Temps réel** : appel à chaque consultation `GET /api/communes/:id/air` (résultat non stocké)
- **Cron horaire** : collecte et stockage en BDD pour communes actives

### 4.3 Open-Meteo Weather

**URL :** `https://api.open-meteo.com/v1/forecast`

**Paramètres :**
```
?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code
```

**Mapping :**
| Réponse API | Champ BDD |
|-------------|-----------|
| `current.temperature_2m` | `temperature` |
| `current.surface_pressure` | `pression` |
| `current.relative_humidity_2m` | `humidite` |
| `current.wind_speed_10m` | `vitesseVent` |
| `current.weather_code` | `meteoCiel` (mappé via table WMO → texte) |

**Mapping WMO weather codes → texte :**
| Code | Texte |
|------|-------|
| 0 | Ciel dégagé |
| 1, 2, 3 | Peu nuageux / Partiellement nuageux / Couvert |
| 45, 48 | Brouillard |
| 51, 53, 55 | Bruine légère / modérée / forte |
| 61, 63, 65 | Pluie légère / modérée / forte |
| 71, 73, 75 | Neige légère / modérée / forte |
| 80, 81, 82 | Averses légères / modérées / fortes |
| 95, 96, 99 | Orage / Orage avec grêle |

**Usage :**
- **Temps réel** : appel à chaque consultation `GET /api/communes/:id/meteo` (résultat non stocké)
- **Cron horaire** : collecte et stockage en BDD pour communes actives

---

## 5. Endpoints

### 5.1 Communes

#### GET `/api/communes?search=...`

- **Auth requise** : Non
- **Query params** :
  - `search` : string, minimum 2 caractères (recherche par nom OU code postal)
- **Traitement** :
  1. Recherche en BDD avec LIKE sur `nom` et `codePostal`
  2. Tri par pertinence (match exact en premier)
  3. Limite à 20 résultats
- **Réponse 200** :
  ```json
  [
    {
      "id": 1,
      "nom": "Paris",
      "codePostal": "75001",
      "codeInsee": "75056",
      "population": 2133111,
      "latitude": 48.856614,
      "longitude": 2.352222
    }
  ]
  ```
- **Erreurs** :
  - 400 : Paramètre `search` manquant ou moins de 2 caractères

#### GET `/api/communes/:id`

- **Auth requise** : Non
- **Réponse 200** : Détail complet de la commune
- **Erreurs** :
  - 404 : Commune introuvable

### 5.2 Qualité de l'air

#### GET `/api/communes/:id/air`

- **Auth requise** : Non
- **Traitement** :
  1. Récupérer la commune en BDD (lat/lng)
  2. Appeler l'API Open-Meteo Air Quality en temps réel
  3. Retourner les données **sans les stocker**
- **Réponse 200** :
  ```json
  {
    "communeId": 1,
    "communeNom": "Paris",
    "ozone": 45.2,
    "co": 230.5,
    "pm25": 12.3,
    "pm10": 18.7,
    "indiceQualite": 3,
    "dateHeure": "2026-04-02T14:00:00Z"
  }
  ```
- **Erreurs** :
  - 404 : Commune introuvable
  - 502 : Erreur de l'API externe

#### GET `/api/communes/:id/air/history?from=...&to=...`

- **Auth requise** : Non
- **Query params** :
  - `from` : date ISO 8601, obligatoire
  - `to` : date ISO 8601, obligatoire
- **Validations** :
  - `from` et `to` obligatoires
  - `to` >= `from`
  - Plage maximale de 90 jours
- **Traitement** :
  1. Récupérer les données stockées en BDD (collectées par cron)
  2. Données agrégées par heure
- **Réponse 200** :
  ```json
  {
    "communeId": 1,
    "communeNom": "Paris",
    "from": "2026-03-01T00:00:00Z",
    "to": "2026-03-31T23:59:59Z",
    "data": [
      {
        "ozone": 45.2,
        "co": 230.5,
        "pm25": 12.3,
        "pm10": 18.7,
        "indiceQualite": 3,
        "dateHeure": "2026-03-01T00:00:00Z"
      }
    ]
  }
  ```
- **Erreurs** :
  - 400 : Paramètres invalides (dates manquantes, plage > 90j, from > to)
  - 404 : Commune introuvable

### 5.3 Météo

#### GET `/api/communes/:id/meteo`

- **Auth requise** : Non
- **Traitement** :
  1. Récupérer la commune en BDD (lat/lng)
  2. Appeler l'API Open-Meteo Weather en temps réel
  3. Mapper le weather_code WMO → texte
  4. Retourner les données **sans les stocker**
- **Réponse 200** :
  ```json
  {
    "communeId": 1,
    "communeNom": "Paris",
    "temperature": 18.5,
    "pression": 1013.2,
    "humidite": 65.0,
    "meteoCiel": "Peu nuageux",
    "vitesseVent": 12.3,
    "dateHeure": "2026-04-02T14:00:00Z"
  }
  ```
- **Erreurs** :
  - 404 : Commune introuvable
  - 502 : Erreur de l'API externe

#### GET `/api/communes/:id/meteo/history?from=...&to=...`

- **Auth requise** : Non
- **Query params et validations** : identiques à `/air/history`
- **Réponse 200** :
  ```json
  {
    "communeId": 1,
    "communeNom": "Paris",
    "from": "2026-03-01T00:00:00Z",
    "to": "2026-03-31T23:59:59Z",
    "data": [
      {
        "temperature": 18.5,
        "pression": 1013.2,
        "humidite": 65.0,
        "meteoCiel": "Peu nuageux",
        "vitesseVent": 12.3,
        "dateHeure": "2026-03-01T00:00:00Z"
      }
    ]
  }
  ```
- **Erreurs** : identiques à `/air/history`

---

## 6. Cron Jobs

### 6.1 Technologie

`@nestjs/schedule` (module natif NestJS basé sur `cron`).

### 6.2 Jobs

| Job | Expression cron | Action |
|-----|----------------|--------|
| `collecteAir` | `0 * * * *` (chaque heure) | Pour chaque commune `active = true` : appel Open-Meteo Air Quality → stockage en BDD |
| `collecteMeteo` | `0 * * * *` (chaque heure) | Pour chaque commune `active = true` : appel Open-Meteo Weather → stockage en BDD |
| `miseAJourPopulation` | `0 0 * * *` (minuit) | Pour chaque commune `active = true` : appel geo.api.gouv.fr → mise à jour `population` |
| `desactivationCommunes` | `0 0 * * *` (minuit) | Désactive les communes dont `activatedAt` < now() - 7 jours |

### 6.3 Gestion d'erreurs

- Si l'appel API échoue pour une commune, **log l'erreur et continue** avec les suivantes
- Un seul `LogCollecte` par cycle avec :
  - Nombre de communes traitées avec succès
  - Nombre de communes en erreur
  - Durée totale du cycle
  - Statut `ERROR` si toutes les communes ont échoué, `SUCCESS` sinon

### 6.4 Note importante

Dans cette itération, **aucune commune ne sera active** car l'activation dépend des favoris (spec future). Le cron tourne mais ne traite aucune commune. Les endpoints `/history` retournent des tableaux vides.

---

## 7. Seed initial des communes

### 7.1 Commande

Script Prisma seed (`prisma/seed.ts`) exécutable via `npx prisma db seed`.

### 7.2 Source

`https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,centre,population&format=json`

### 7.3 Traitement

1. Appeler l'API (retourne ~35 000 communes en un seul appel)
2. Pour chaque commune : insérer en BDD avec `active = false`, `activatedAt = null`
3. Ignorer les communes sans coordonnées GPS (centre = null)
4. Log le résultat : nombre de communes insérées

### 7.4 Idempotence

Le seed utilise `upsert` sur `codeInsee` pour pouvoir être relancé sans créer de doublons.

---

## 8. Mécanisme d'activation des communes

### 8.1 Activation (spec future — favoris)

Quand un utilisateur connecté ajoute une commune en favori :
1. La commune passe à `active = true`, `activatedAt = now()`
2. Toutes les communes dans un rayon de **10 km** (calcul Haversine sur lat/lng) passent aussi à `active = true`, `activatedAt = now()`

### 8.2 Désactivation (cron quotidien)

Les communes dont `activatedAt` est plus ancien que **7 jours** passent à `active = false`.

### 8.3 Calcul Haversine

Formule de distance à vol d'oiseau entre deux points (lat1, lng1) et (lat2, lng2) :
```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
distance = 2 × R × arctan2(√a, √(1−a))
```
Où R = 6371 km (rayon de la Terre).

**Implémentation** : fonction utilitaire `haversineDistance(lat1, lng1, lat2, lng2): number` en km.

Pour la performance : pré-filtrer les communes avec une bounding box SQL avant d'appliquer Haversine (±0.09° de latitude ≈ ±10 km).

---

## 9. Modules NestJS à créer

| Module | Contenu |
|--------|---------|
| `CommuneModule` | CommuneController, CommuneService, entité Commune |
| `AirQualityModule` | AirQualityController, AirQualityService, entité DonneeAir |
| `MeteoModule` | MeteoController, MeteoService, entité DonneeMeteo |
| `CollecteModule` | CollecteService (cron jobs), entité LogCollecte, services d'appels API externes |

---

## 10. Dépendances npm à ajouter

| Package | Usage |
|---------|-------|
| `@nestjs/schedule` | Cron jobs |
| `@nestjs/axios` | Appels HTTP aux APIs externes |
| `axios` | Client HTTP |

---

## 11. Modification du login (suspension)

Le endpoint `POST /api/auth/login` doit ajouter une vérification :
```
Si user.estSuspendu === true → throw ForbiddenException("Compte suspendu")
```

---

## 12. Hors périmètre

| Élément | Raison |
|---------|--------|
| Favoris | Prochaine spec (déclencheur de l'activation) |
| Forum | Spec future |
| Alertes admin | Spec future |
| Export PDF/CSV | Spec future |
| Frontend | Spec future |
| Carte interactive | Spec future |
| Swagger | Reporté |

---

## 13. Critères de validation

La spec est considérée comme implémentée quand :

1. Le modèle User est migré (nom, prenom, adressePostale, estSuspendu, nouveaux rôles)
2. Le login rejette les comptes suspendus
3. Le seed charge ~35 000 communes depuis geo.api.gouv.fr
4. `GET /api/communes?search=paris` retourne des résultats (max 20, autocomplétion dès 2 chars)
5. `GET /api/communes/:id/air` appelle l'API Open-Meteo et retourne les données temps réel
6. `GET /api/communes/:id/meteo` appelle l'API Open-Meteo et retourne les données temps réel
7. `GET /api/communes/:id/air/history` et `/meteo/history` retournent les données stockées avec filtre dates
8. Les cron jobs sont configurés et fonctionnels (même s'ils ne traitent aucune commune active)
9. La table LogCollecte enregistre chaque cycle de collecte
10. La fonction Haversine est implémentée et testée
11. Le build TypeScript passe sans erreur
12. `docker-compose up` démarre sans erreur avec les nouvelles migrations
