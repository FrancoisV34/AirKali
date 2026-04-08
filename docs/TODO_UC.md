# TODO — Cas d'utilisation Breath for All

Référence : Dossier des spécifications générales BfA (20/03/2026)

## P1 — Priorité haute

| UC | Titre | Statut | Spec |
|----|-------|--------|------|
| UC6 | Créer un compte | DONE | SPEC_001 + SPEC_004 |
| UC7 | Se connecter | DONE | SPEC_001 + SPEC_004 |
| UC2 | Rechercher une commune (backend) | DONE | SPEC_002 |
| UC17 | Récupérer données qualité de l'air (cron) | DONE | SPEC_002 |
| UC18 | Récupérer données météo (cron) | DONE | SPEC_002 |
| UC19 | Récupérer données recensement (cron) | DONE | SPEC_002 |
| UC20 | Historiser les données | DONE | SPEC_002 |
| UC1 | Consulter la carte interactive (marqueurs ATMO, MarkerCluster, popups) | DONE | SPEC_005 |
| UC2 | Rechercher une commune (frontend : barre recherche, résultats, affichage données) | DONE | SPEC_005 |
| UC5 | Voir courbes d'historique (graphes air/météo, sélection période, max 90j) | DONE | SPEC_005 |

## P2 — Priorité moyenne

| UC | Titre | Statut | Spec |
|----|-------|--------|------|
| UC8 | Gérer ses favoris (ajout/suppression communes, activation cron) | DONE | SPEC_005 |
| UC9 | Créer un topic (forum, titre max 255 car., contenu obligatoire) | DONE | SPEC_006 |
| UC10 | Poster un commentaire (réponse à topic actif) | DONE | SPEC_006 |
| UC11 | Voter sur le forum (+/- toggle, pas d'auto-vote) | DONE | SPEC_006 |
| UC13 | Modérer le forum (soft delete messages) | DONE | SPEC_007 |
| UC14 | Supprimer des messages (admin) | DONE | SPEC_007 |
| UC15 | Suspendre un utilisateur (mécanisme backend) | DONE | SPEC_001 |
| UC15 | Suspendre un utilisateur (interface admin) | DONE | SPEC_008 |
| UC16 | Émettre alertes/notifications email (admin, niveaux INFO/WARNING/CRITICAL) | TODO | — |

## P3 — Priorité basse

| UC | Titre | Statut | Spec |
|----|-------|--------|------|
| UC4 | Exporter PDF/CSV (données historiques commune + période) | TODO | — |
| UC12 | Gérer sa localisation (adresse postale → commune/département/région) | DONE | SPEC_008 |
| UC_DISCO | Se déconnecter | DONE | SPEC_004 |

## Résumé

- **DONE** : 21 UC
- **TODO** : 2 UC (UC16 alertes/notifications email admin, UC4 export PDF/CSV)
- **Specs rédigées** : SPEC_001 à SPEC_008
