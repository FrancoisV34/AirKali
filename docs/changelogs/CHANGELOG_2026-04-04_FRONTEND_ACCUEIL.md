# CHANGELOG — Frontend Accueil

| Champ | Valeur |
|-------|--------|
| Date | 2026-04-04 |
| Feature | SPEC_003 — Frontend Angular — Page d'accueil |
| Commit | `feat(frontend): initialize Angular 17 with home page, header, footer and map` |

## Feature implémentée

Initialisation du projet frontend Angular 17 avec page d'accueil complète : header sticky avec navigation Angular Material, hero section, carte Leaflet/OpenStreetMap en aperçu, footer avec CGU et sources, routing lazy-loaded.

## Fichiers créés

### Configuration
| Fichier | Description |
|---------|-------------|
| `frontend/angular.json` | Config Angular (Material theme, Leaflet CSS, proxy, CommonJS allowlist) |
| `frontend/package.json` | Dépendances (Angular 17, Material, Leaflet) |
| `frontend/proxy.conf.json` | Proxy dev /api → localhost:3000 |
| `frontend/tsconfig.json` | Config TypeScript Angular |

### Composants partagés
| Fichier | Description |
|---------|-------------|
| `shared/components/header/` | Header sticky, Material toolbar, 4 boutons nav avec icônes |
| `shared/components/footer/` | Footer sombre, CGU, liens sources, copyright |

### Pages
| Fichier | Description |
|---------|-------------|
| `pages/home/home.component` | Hero section + carte Leaflet |
| `pages/home/components/map-preview/` | Carte Leaflet centrée France (zoom, pas d'interaction) |
| `pages/forum/forum.component` | Placeholder "Bientôt disponible" |
| `pages/recherche/recherche.component` | Placeholder "Bientôt disponible" |
| `pages/connexion/connexion.component` | Placeholder "Bientôt disponible" |

### Core
| Fichier | Description |
|---------|-------------|
| `core/services/api.service.ts` | Service HTTP centralisé (get/post), prêt pour usage futur |

### App
| Fichier | Description |
|---------|-------------|
| `app.component` | Layout : header + router-outlet + footer |
| `app.routes.ts` | 4 routes lazy-loaded + wildcard redirect |
| `app.config.ts` | Providers (router, HttpClient, animations) |
| `styles.scss` | Styles globaux (.container) |

## Décisions techniques

| Décision | Justification |
|----------|---------------|
| Angular standalone components | Angular 17 recommandé, pas de NgModules |
| Lazy loading toutes les routes | Performance, chunks séparés |
| Leaflet CommonJS allowlist | Leaflet n'est pas ESM, supprime le warning |
| Media query 1399px pour header | Labels masqués sous 1400px, icônes seules |
| Carte 75%/500px vs 90%/350px | Responsive entre desktop et tablette |
| `rel="noopener"` sur liens externes | Sécurité (empêche window.opener) |
