# SPEC_005 — Recherche, Carte interactive, Historique & Favoris

| Champ | Valeur |
|-------|--------|
| **ID** | SPEC_005 |
| **Titre** | Page Recherche : carte interactive, recherche commune, courbes historique, favoris |
| **Date** | 2026-04-04 |
| **Statut** | Validée |
| **Priorité** | Haute |
| **Dépendance** | SPEC_001 (auth backend), SPEC_002 (communes, air, météo, cron), SPEC_003 (frontend base), SPEC_004 (auth frontend) |
| **UC couvertes** | UC1, UC2 (frontend), UC5, UC8 |

---

## 1. Objectif

Implémenter la page `/recherche` complète : carte interactive Leaflet avec marqueurs colorés ATMO et MarkerCluster, barre de recherche de communes avec autocomplétion, panneau de données air/météo en temps réel, courbes d'historique avec toggle 7j/30j, et gestion des favoris (backend + frontend).

Ajouter les endpoints backend nécessaires : communes actives, CRUD favoris. Ajouter le modèle Prisma `Favori`. Modifier la page profil pour afficher les favoris.

---

## 2. Modèle de données

### 2.1 Nouvelle table Prisma

```prisma
model Favori {
  id        Int      @id @default(autoincrement())
  userId    Int
  communeId Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  commune   Commune  @relation(fields: [communeId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, communeId])
}
```

**Relations à ajouter :**
- `User` : `favoris Favori[]`
- `Commune` : `favoris Favori[]`

---

## 3. Backend — Nouveaux endpoints

### 3.1 GET `/api/communes/active`

- **Auth requise** : Non
- **Query params** :
  - `page` : number (défaut 1)
  - `limit` : number (défaut 50, max 50)
- **Traitement** :
  1. Récupérer les communes avec `active = true`
  2. Pour chaque commune, inclure la dernière `DonneeAir` (pour l'indice ATMO) si disponible
  3. Paginer les résultats
- **Réponse 200** :
  ```json
  {
    "data": [
      {
        "id": 1,
        "nom": "Paris",
        "codePostal": "75001",
        "codeInsee": "75056",
        "latitude": 48.8566,
        "longitude": 2.3522,
        "population": 2165423,
        "derniereQualiteAir": {
          "europeanAqi": 3,
          "dateHeure": "2026-04-04T14:00:00Z"
        }
      }
    ],
    "total": 120,
    "page": 1,
    "limit": 50
  }
  ```

### 3.2 GET `/api/favorites`

- **Auth requise** : Oui (JWT)
- **Traitement** : Récupérer tous les favoris de l'utilisateur avec les données commune
- **Réponse 200** :
  ```json
  [
    {
      "id": 1,
      "communeId": 42,
      "commune": {
        "id": 42,
        "nom": "Lyon",
        "codePostal": "69001",
        "codeInsee": "69123",
        "latitude": 45.764,
        "longitude": 4.8357
      },
      "createdAt": "2026-04-04T10:00:00Z"
    }
  ]
  ```

### 3.3 POST `/api/favorites/:communeId`

- **Auth requise** : Oui (JWT)
- **Params** : `communeId` (number)
- **Traitement** :
  1. Vérifier que la commune existe
  2. Vérifier que l'utilisateur n'a pas déjà 10 favoris → sinon 400
  3. Vérifier que la commune n'est pas déjà en favori → sinon 409
  4. Créer le favori en base
  5. **Activer la commune** : mettre `active = true`, `activatedAt = now()`
  6. **Activer les communes dans un rayon de 10km** (Haversine, cf SPEC_002)
  7. Retourner le favori créé
- **Réponse 201** : favori créé
- **Erreurs** :
  - 400 : Limite de 10 favoris atteinte
  - 404 : Commune introuvable
  - 409 : Déjà en favori

### 3.4 DELETE `/api/favorites/:communeId`

- **Auth requise** : Oui (JWT)
- **Params** : `communeId` (number)
- **Traitement** :
  1. Vérifier que le favori existe pour cet utilisateur → sinon 404
  2. Supprimer le favori
  3. **Vérifier si la commune est encore en favori chez un autre utilisateur**
     - Si NON → désactiver la commune (`active = false`, `activatedAt = null`)
     - Si OUI → la commune reste active
  4. Faire la même vérification pour les communes activées dans le rayon de 10km
- **Réponse 200** : `{ "message": "Favori supprimé" }`
- **Erreurs** :
  - 404 : Favori introuvable

---

## 4. Page `/recherche` — Layout

```
┌──────────────────────────────────────────────────┐
│  [Barre de recherche]    [Select favoris (si co)]│
├──────────────────────────┬───────────────────────┤
│                          │                       │
│      Carte Leaflet       │   Panneau données     │
│   (marqueurs ATMO +      │   [Onglet Air|Météo]  │
│    MarkerCluster)        │   + Bouton favoris    │
│                          │                       │
├──────────────────────────┴───────────────────────┤
│             Courbes d'historique                  │
│         [Toggle Air / Météo] [7j | 30j]          │
└──────────────────────────────────────────────────┘
```

---

## 5. Composants Frontend

### 5.1 Barre de recherche

- Input avec autocomplétion (Angular Material `mat-autocomplete`)
- Appel `GET /api/communes/search?q=...` dès 2 caractères (debounce 300ms)
- Résultats affichés : `{nom} — {codePostal}`
- Clic sur un résultat :
  1. Recentre la carte sur la commune (zoom 12)
  2. Appel API temps réel `GET /api/air-quality/current/:communeId` + `GET /api/meteo/current/:communeId`
  3. Affiche les données dans le panneau latéral
  4. Si commune active → affiche les courbes d'historique
  5. Si commune non active → message "Ajoutez en favori pour voir l'historique" + bouton "Récupérer les données"

### 5.2 Select favoris

- Visible **uniquement si l'utilisateur est connecté**
- `mat-select` avec la liste des favoris (`GET /api/favorites`)
- Clic sur un favori → même comportement que clic résultat recherche (recentre, charge données)
- Se rafraîchit quand on ajoute/supprime un favori

### 5.3 Carte interactive

- Leaflet + OpenStreetMap, pleine interaction (zoom, drag, clic)
- Centre initial : France [46.6, 2.2], zoom 6
- **Chargement des marqueurs** :
  1. Au chargement de la page : `GET /api/communes/active?page=1&limit=50`
  2. Pour chaque commune active, placer un marqueur coloré
- **Couleur des marqueurs selon indice ATMO européen** :
  | Indice ATMO | Couleur |
  |-------------|---------|
  | 1–3 | Vert (#4CAF50) |
  | 4–6 | Jaune (#FFC107) |
  | 7–8 | Orange (#FF9800) |
  | 9–10 | Rouge (#F44336) |
  | Pas de données | Gris (#9E9E9E) |
- **MarkerCluster** : utiliser `leaflet.markercluster` pour regrouper les marqueurs proches
- **Clic sur marqueur** :
  1. Appel API temps réel (air + météo)
  2. Affiche un popup Leaflet avec résumé : nom, indice ATMO, température, description météo
  3. Met à jour le panneau latéral avec les données complètes

### 5.4 Panneau de données

- Affiché quand une commune est sélectionnée (recherche, clic marqueur, ou select favoris)
- **2 onglets** (`mat-tab-group`) :
  - **Onglet Qualité de l'air** :
    | Donnée | Source |
    |--------|--------|
    | Indice ATMO européen | europeanAqi |
    | PM2.5 (µg/m³) | pm2_5 |
    | PM10 (µg/m³) | pm10 |
    | NO₂ (µg/m³) | nitrogenDioxide |
    | O₃ (µg/m³) | ozone |
    | SO₂ (µg/m³) | sulphurDioxide |
    | CO (µg/m³) | carbonMonoxide |
  - **Onglet Météo** :
    | Donnée | Source |
    |--------|--------|
    | Température (°C) | temperature |
    | Humidité (%) | humidity |
    | Vitesse du vent (km/h) | windSpeed |
    | Direction du vent (°) | windDirection |
    | Description | weatherDescription |
- **Bouton "Ajouter aux favoris"** :
  - Visible si connecté ET commune pas déjà en favori
  - `POST /api/favorites/:communeId`
  - Après ajout → bouton devient "Retirer des favoris" (ou icône coeur plein)
  - Si 10 favoris atteints → bouton grisé + tooltip "Limite de 10 favoris atteinte"
- **Bouton "Retirer des favoris"** :
  - Visible si connecté ET commune déjà en favori
  - `DELETE /api/favorites/:communeId`
- **Bouton "Récupérer les données"** :
  - Visible si commune non active ET pas de données affichées
  - Déclenche un appel API temps réel (air + météo) one-shot
  - N'active PAS la commune en base
  - Affiche les résultats dans le panneau
- **État vide** : "Sélectionnez une commune pour voir ses données"

### 5.5 Courbes d'historique

- Affichées **sous la carte** quand une commune **active** est sélectionnée
- **Librairie** : Chart.js + ng2-charts
- **Toggle** : bouton pour basculer entre graphe Air et graphe Météo
- **Période** : 2 boutons radio/toggle — "7 derniers jours" (défaut) / "Dernier mois"
- **Graphe Air** :
  - Type : line chart
  - Séries : PM2.5, PM10, indice ATMO européen
  - Axe X : date/heure
  - Axe Y : valeur
  - Données : `GET /api/air-quality/history/:communeId?start=...&end=...`
- **Graphe Météo** :
  - Type : line chart
  - Séries : température, humidité
  - Axe X : date/heure
  - Axe Y : valeur (double axe si nécessaire — °C et %)
  - Données : `GET /api/meteo/history/:communeId?start=...&end=...`
- **Commune non active** : pas de courbes, message "Ajoutez cette commune en favori pour consulter l'historique des données"

---

## 6. Dépendances à installer (frontend)

| Package | Usage |
|---------|-------|
| `leaflet.markercluster` | Regroupement de marqueurs |
| `@types/leaflet.markercluster` | Types TS |
| `chart.js` | Moteur de graphes |
| `ng2-charts` | Wrapper Angular pour Chart.js |

---

## 7. Services Angular

### 7.1 CommuneService

```typescript
@Injectable({ providedIn: 'root' })
export class CommuneService {
  searchCommunes(query: string): Observable<Commune[]>
  getActiveCommunes(page: number, limit: number): Observable<PaginatedResult<CommuneWithAqi>>
  getCommuneById(id: number): Observable<Commune>
}
```

### 7.2 AirQualityService

```typescript
@Injectable({ providedIn: 'root' })
export class AirQualityService {
  getCurrent(communeId: number): Observable<AirQualityData>
  getHistory(communeId: number, start: string, end: string): Observable<AirQualityData[]>
}
```

### 7.3 MeteoService

```typescript
@Injectable({ providedIn: 'root' })
export class MeteoService {
  getCurrent(communeId: number): Observable<MeteoData>
  getHistory(communeId: number, start: string, end: string): Observable<MeteoData[]>
}
```

### 7.4 FavoriteService

```typescript
@Injectable({ providedIn: 'root' })
export class FavoriteService {
  getFavorites(): Observable<Favorite[]>
  addFavorite(communeId: number): Observable<Favorite>
  removeFavorite(communeId: number): Observable<void>
}
```

---

## 8. Routing

| Route | Composant | Guard | Modification |
|-------|-----------|-------|-------------|
| `/recherche` | RechercheComponent | — | Remplace le placeholder existant |

Pas de nouvelles routes, mais le composant `RechercheComponent` est entièrement réécrit.

---

## 9. Structure des fichiers

### Frontend (nouveaux/modifiés)

```
src/app/
  core/
    services/
      commune.service.ts          → Nouveau (search, getActive, getById)
      air-quality.service.ts      → Nouveau (getCurrent, getHistory)
      meteo.service.ts            → Nouveau (getCurrent, getHistory)
      favorite.service.ts         → Nouveau (CRUD favoris)
  pages/
    recherche/
      recherche.component.ts/html/scss  → Réécrit (layout complet)
      components/
        search-bar/
          search-bar.component.ts/html/scss  → Nouveau (autocomplétion)
        map/
          map.component.ts/html/scss         → Nouveau (carte interactive complète)
        data-panel/
          data-panel.component.ts/html/scss  → Nouveau (onglets air/météo + favoris)
        history-charts/
          history-charts.component.ts/html/scss → Nouveau (courbes Chart.js)
        favorites-select/
          favorites-select.component.ts/html/scss → Nouveau (select favoris)
    profil/
      profil.component.ts/html/scss → Modifié (ajout section favoris)
```

### Backend (nouveaux/modifiés)

```
prisma/
  schema.prisma                   → Modifié (ajout model Favori + relations)
src/
  favorite/
    favorite.module.ts            → Nouveau
    favorite.controller.ts        → Nouveau (GET, POST, DELETE)
    favorite.service.ts           → Nouveau (logique favoris + activation)
  commune/
    commune.controller.ts         → Modifié (ajout GET /active)
    commune.service.ts            → Modifié (ajout getActiveCommunes)
```

---

## 10. Marqueurs colorés — Implémentation

Utiliser des `L.circleMarker` ou des `L.divIcon` avec une couleur de fond dynamique basée sur l'indice ATMO. Pas d'images custom — des cercles colorés suffisent.

```typescript
function getMarkerColor(europeanAqi: number | null): string {
  if (europeanAqi === null) return '#9E9E9E';
  if (europeanAqi <= 3) return '#4CAF50';
  if (europeanAqi <= 6) return '#FFC107';
  if (europeanAqi <= 8) return '#FF9800';
  return '#F44336';
}
```

---

## 11. Hors périmètre

| Élément | Raison |
|---------|--------|
| Géolocalisation navigateur | Spec future |
| Pagination infinie carte | Limité à 50, affiné plus tard |
| Alertes email (UC16) | Spec P2 future |
| Forum (UC9/10/11) | Spec P2 future |
| Export PDF/CSV (UC4) | Spec P3 future |

---

## 12. Critères de validation

1. La page `/recherche` affiche la carte centrée sur la France avec les marqueurs des communes actives
2. Les marqueurs sont colorés selon l'indice ATMO avec MarkerCluster
3. La barre de recherche propose des résultats dès 2 caractères
4. Clic sur un résultat ou marqueur → recentre carte + affiche données temps réel dans le panneau
5. Le panneau affiche 2 onglets (Air / Météo) avec toutes les données
6. Les courbes d'historique s'affichent pour les communes actives (toggle Air/Météo, 7j/30j)
7. Le bouton favoris fonctionne (ajout/suppression) avec limite de 10
8. L'ajout en favori active la commune + communes dans 10km
9. La suppression d'un favori désactive la commune si plus aucun utilisateur ne l'a en favori
10. Le select favoris recentre la carte au clic
11. La page profil affiche les favoris avec possibilité de suppression
12. Le build Angular passe sans erreur
13. Le build backend passe sans erreur
14. Les tests backend passent sans régression
