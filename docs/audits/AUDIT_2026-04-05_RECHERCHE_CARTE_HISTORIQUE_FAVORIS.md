# AUDIT — Recherche, Carte interactive, Historique & Favoris

| Champ | Valeur |
|-------|--------|
| Date | 2026-04-05 |
| Feature | SPEC_005 — Recherche, Carte, Historique, Favoris |
| Qualité globale | BONNE |

## 1. Cohérence architecture

| Point | Statut |
|-------|--------|
| Module Favorite backend (CRUD + activation Haversine) | Conforme |
| Endpoint GET /communes/active (paginé) | Conforme |
| Carte Leaflet interactive + MarkerCluster | Conforme |
| Marqueurs colorés selon indice ATMO | Conforme |
| Barre de recherche avec autocomplétion (debounce 300ms) | Conforme |
| Panneau données 2 onglets (Air / Météo) | Conforme |
| Courbes historique Chart.js (toggle Air/Météo, 7j/30j) | Conforme |
| Select favoris (visible si connecté) | Conforme |
| Boutons ajouter/retirer favoris avec limite 10 | Conforme |
| Section favoris dans page profil | Conforme |
| Désactivation commune si plus aucun favori | Conforme |

## 2. Sécurité

- JwtAuthGuard sur tous endpoints favoris
- UserId extrait du JWT (pas d'IDOR)
- Limite de 10 favoris vérifiée côté serveur
- Prisma paramétrisé, pas de raw SQL
- Angular sanitize natif

## 3. Tests

- 7 tests FavoriteService (getFavorites, add nominal/404/400/409, remove nominal/404)
- Build frontend et backend OK

## 4. Points d'attention

- Budget initial Angular augmenté à 800kb/1.5mb (Chart.js)
- MarkerCluster + Chart.js ajoutés aux allowedCommonJsDependencies
