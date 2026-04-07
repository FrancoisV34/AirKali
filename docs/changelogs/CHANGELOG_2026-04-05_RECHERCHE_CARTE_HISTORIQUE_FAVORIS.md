# CHANGELOG — Recherche, Carte interactive, Historique & Favoris

| Champ | Valeur |
|-------|--------|
| Date | 2026-04-05 |
| Feature | SPEC_005 — Recherche, Carte, Historique, Favoris |
| Commit | `feat(recherche): implement interactive map, search, history charts and favorites` |

## Feature implémentée

Page `/recherche` complète : carte Leaflet interactive avec marqueurs ATMO colorés et MarkerCluster, barre de recherche avec autocomplétion (debounce 300ms), panneau de données temps réel (2 onglets Air/Météo), courbes d'historique Chart.js (toggle Air/Météo, 7j/30j), gestion complète des favoris (max 10, activation/désactivation communes Haversine 10km). Section favoris ajoutée à la page profil.

## Fichiers créés

### Backend
| Fichier | Description |
|---------|-------------|
| `prisma/schema.prisma` | Modifié — ajout model Favori + relations User/Commune |
| `src/favorite/favorite.module.ts` | Module Favorite |
| `src/favorite/favorite.controller.ts` | GET/POST/DELETE /favorites, JwtAuthGuard |
| `src/favorite/favorite.service.ts` | CRUD favoris, activation/désactivation communes Haversine |
| `src/favorite/favorite.service.spec.ts` | 7 tests unitaires |

### Frontend — Services
| Fichier | Description |
|---------|-------------|
| `core/services/commune.service.ts` | search, getActive (paginé), getById |
| `core/services/air-quality.service.ts` | getCurrent, getHistory |
| `core/services/meteo.service.ts` | getCurrent, getHistory |
| `core/services/favorite.service.ts` | CRUD favoris, BehaviorSubject, isFavorite |

### Frontend — Composants page recherche
| Fichier | Description |
|---------|-------------|
| `recherche/recherche.component.*` | Layout assemblage des 5 sous-composants |
| `components/search-bar/` | Input autocomplete mat-autocomplete, debounce 300ms |
| `components/map/` | Carte Leaflet interactive, circleMarker colorés, MarkerCluster |
| `components/data-panel/` | 2 onglets mat-tab-group, boutons favoris, bouton récupérer données |
| `components/history-charts/` | Chart.js line charts, toggle Air/Météo, période 7j/30j |
| `components/favorites-select/` | mat-select visible si connecté |

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/app.module.ts` | Import FavoriteModule |
| `src/commune/commune.controller.ts` | Ajout GET /communes/active (paginé) |
| `src/commune/commune.service.ts` | Ajout getActiveCommunes |
| `frontend/angular.json` | CSS MarkerCluster, budget 800kb, allowedCommonJsDeps |
| `frontend/package.json` | +leaflet.markercluster, chart.js, ng2-charts |
| `frontend/src/app/app.config.ts` | provideCharts(withDefaultRegisterables()) |
| `frontend/src/app/core/services/api.service.ts` | Ajout méthode delete<T> |
| `frontend/src/app/pages/profil/*` | Section favoris avec cards + suppression |

## Tests

- 7 tests FavoriteService (CRUD + erreurs)
- 53/53 tests totaux passent, 0 régressions

## Sécurité

- Aucune vulnérabilité
- JwtAuthGuard sur tous endpoints favoris
- Limite 10 favoris vérifiée côté serveur
- Désactivation commune vérifie tous les users

## Décisions techniques

| Décision | Justification |
|----------|---------------|
| L.circleMarker (pas d'images) | Léger, colorable dynamiquement, pas de sprites |
| Chart.js + ng2-charts | Léger (~200kb), pro, bien intégré Angular |
| BehaviorSubject pour favoris | Réactivité immédiate du select et boutons |
| Debounce 300ms sur recherche | Réduit les appels API sans latence perceptible |
| Budget Angular 800kb | Chart.js augmente le bundle, acceptable |
| forkJoin pour données temps réel | Appels air+météo en parallèle |
