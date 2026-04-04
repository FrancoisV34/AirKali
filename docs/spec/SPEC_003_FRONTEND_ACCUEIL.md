# SPEC_003 — Frontend Angular — Page d'accueil

| Champ | Valeur |
|-------|--------|
| **ID** | SPEC_003 |
| **Titre** | Frontend Angular — Initialisation + Page d'accueil |
| **Date** | 2026-04-03 |
| **Statut** | Validée |
| **Priorité** | Haute |
| **Dépendance** | SPEC_001, SPEC_002 (backend) |

---

## 1. Objectif

Initialiser le projet frontend Angular 17 dans le même repo (`frontend/`). Créer la page d'accueil avec header sticky, hero section, carte Leaflet en aperçu, et footer. Mettre en place le routing vers les pages existantes (placeholders).

---

## 2. Stack technique

| Élément | Choix |
|---------|-------|
| Framework | Angular 17 |
| UI Library | Angular Material |
| Icônes | Material Icons |
| Carte | Leaflet + OpenStreetMap |
| Proxy dev | proxy.conf.json → backend localhost:3000 |
| Responsive | >= 768px |
| Emplacement | `frontend/` dans le repo existant |

---

## 3. Structure du projet

```
frontend/
  src/
    app/
      core/
        services/
          api.service.ts          → Service HTTP centralisé (prêt pour appels futurs)
      shared/
        components/
          header/
            header.component.ts
            header.component.html
            header.component.scss
          footer/
            footer.component.ts
            footer.component.html
            footer.component.scss
      pages/
        home/
          home.component.ts
          home.component.html
          home.component.scss
          components/
            map-preview/
              map-preview.component.ts
              map-preview.component.html
              map-preview.component.scss
        forum/
          forum.component.ts       → Placeholder
        recherche/
          recherche.component.ts   → Placeholder
        connexion/
          connexion.component.ts   → Placeholder
      app.component.ts             → Layout principal (header + router-outlet + footer)
      app.component.html
      app.component.scss
      app.routes.ts                → Configuration routing
      app.config.ts                → Configuration app (providers)
    styles.scss                    → Styles globaux + thème Angular Material
    index.html
  proxy.conf.json                  → Proxy vers backend
  angular.json
  package.json
```

---

## 4. Header

### 4.1 Comportement

- **Position** : sticky top (`position: sticky; top: 0; z-index: 1000`)
- **Présent sur toutes les pages**
- Composant partagé dans `shared/components/header/`

### 4.2 Contenu

| Élément | Position | Action |
|---------|----------|--------|
| Logo/titre "Breath for All" | Gauche | Lien vers `/` |
| Bouton Accueil (icône `home`) | Droite | Lien vers `/` |
| Bouton Forum (icône `forum`) | Droite | Lien vers `/forum` |
| Bouton Recherche (icône `search`) | Droite | Lien vers `/recherche` |
| Bouton Connexion (icône `login`) | Droite | Lien vers `/connexion` |

### 4.3 Style

- Boutons Angular Material (`mat-button`) avec icône Material Icons + texte
- Fond de couleur contrastée (toolbar Angular Material)
- Le bouton actif est visuellement distingué (couleur accent ou underline)

---

## 5. Footer

### 5.1 Comportement

- En bas de page (pas sticky, suit le contenu)
- Composant partagé dans `shared/components/footer/`

### 5.2 Contenu

| Élément | Détail |
|---------|--------|
| CGU | Lien ou texte "Conditions Générales d'Utilisation" |
| Sources | Liens vers Open-Meteo, geo.api.gouv.fr |
| Copyright | "Breath for All — 2026" |

### 5.3 Style

- Fond sombre, texte clair
- Centré, padding confortable

---

## 6. Page d'accueil

### 6.1 Hero section

- **Titre** : "Breath for All"
- **Sous-titre** : Court texte présentant la plateforme (ex: "Consultez la qualité de l'air et la météo de votre commune en temps réel")
- Centré horizontalement
- Espacement généreux

### 6.2 Carte Leaflet (aperçu)

Composant dédié `map-preview` dans `pages/home/components/`.

| Paramètre | Valeur |
|-----------|--------|
| Centre | Latitude 46.6, Longitude 2.2 (France métropolitaine) |
| Zoom initial | 6 |
| Tiles | OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) |
| Zoom molette | Activé |
| Boutons +/- | Activés |
| Clic sur carte | Désactivé (pas de marqueurs, pas de popup) |
| Dragging | Activé (on peut déplacer la carte) |
| Largeur | 75% du conteneur, centré (`margin: 0 auto`) |
| Hauteur | Responsive (voir section 9) |

### 6.3 Pas d'appel backend

La page d'accueil est statique. Seuls les tiles OpenStreetMap sont chargés.

---

## 7. Routing

### 7.1 Configuration

Fichier `app.routes.ts` avec lazy loading pour chaque page.

### 7.2 Routes

| Route | Composant | Description |
|-------|-----------|-------------|
| `/` | HomeComponent | Page d'accueil (hero + carte) |
| `/forum` | ForumComponent | Placeholder |
| `/recherche` | RechercheComponent | Placeholder |
| `/connexion` | ConnexionComponent | Placeholder |
| `**` | Redirect vers `/` | Route wildcard |

### 7.3 Pages placeholder

Chaque placeholder affiche un simple message centré :
- Forum : "Forum — Bientôt disponible"
- Recherche : "Recherche — Bientôt disponible"
- Connexion : "Connexion — Bientôt disponible"

---

## 8. Service API (préparation)

### 8.1 ApiService

Service centralisé dans `core/services/api.service.ts` :
- Inject `HttpClient`
- Base URL configurable (`/api/` via proxy en dev)
- Méthodes génériques `get<T>()`, `post<T>()`
- Prêt pour les appels futurs (pas utilisé sur la page d'accueil)

### 8.2 Proxy dev

Fichier `frontend/proxy.conf.json` :
```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false
  }
}
```

Configuré dans `angular.json` → `serve` → `options` → `proxyConfig`.

---

## 9. Responsive

### 9.1 Breakpoints

| Largeur | Contexte |
|---------|----------|
| >= 1400px | Desktop large |
| 768px — 1399px | Desktop / tablette |
| < 768px | Non supporté |

### 9.2 Carte — Hauteur responsive

| Largeur écran | Hauteur carte |
|---------------|---------------|
| >= 1400px | 500px |
| 768px — 1399px | 350px |

### 9.3 Header

- Navigation horizontale sur toutes les tailles supportées
- Pas de menu burger (desktop only)
- Boutons : texte + icône sur >= 1400px, icône seule possible sur 768px–1399px si manque de place

### 9.4 Conteneur principal

- Max-width : 1200px
- Centré (`margin: 0 auto`)
- Padding latéral : 24px

---

## 10. Dépendances npm

| Package | Usage |
|---------|-------|
| `@angular/material` | Composants UI |
| `@angular/cdk` | Angular CDK (dépendance Material) |
| `leaflet` | Carte interactive |
| `@types/leaflet` | Types TypeScript pour Leaflet |

---

## 11. Angular Material — Configuration

- Importer un thème prédéfini (ex: `indigo-pink` ou thème custom)
- Modules nécessaires : `MatToolbarModule`, `MatButtonModule`, `MatIconModule`
- Enregistrer Material Icons dans `index.html` :
  ```html
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  ```

---

## 12. Hors périmètre

| Élément | Raison |
|---------|--------|
| Auth fonctionnelle (login/register) | Spec future |
| Forum fonctionnel | Spec future |
| Recherche fonctionnelle | Spec future |
| Marqueurs / interactions carte | Spec future |
| Responsive < 768px | Non prévu |
| Docker pour le frontend | Frontend en local |
| Tests unitaires frontend | Pas demandé pour cette itération |

---

## 13. Critères de validation

1. `ng serve` démarre sans erreur dans `frontend/`
2. La page d'accueil affiche le header sticky avec les 4 boutons de navigation
3. Le hero section affiche le titre et le sous-titre
4. La carte Leaflet s'affiche centrée sur la France avec zoom fonctionnel
5. Le footer affiche les CGU et les sources
6. Les routes `/forum`, `/recherche`, `/connexion` affichent les placeholders
7. Le proxy redirige `/api/*` vers le backend
8. Le responsive fonctionne entre 768px et 1400px+
9. Le build Angular passe sans erreur (`ng build`)
