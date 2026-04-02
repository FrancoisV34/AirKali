# ALERTE — Logique Métier

| Champ | Valeur |
|-------|--------|
| Date | 2026-04-02 |
| Feature | SPEC_002 — Logique Métier Environnementale |
| Sévérité globale | HIGH |

## Problèmes identifiés

### 1. Timeout HTTP manquant sur les appels API externes (HIGH)
Les services AirQualityApiService et MeteoApiService n'ont pas de timeout configuré. Un appel bloquant peut paralyser le cron.

### 2. Import HttpService inutilisé dans CollecteService (LOW)
Import direct de HttpService alors que les API services sont injectés.

### 3. Decimal → Number pour les coordonnées (MEDIUM)
Prisma retourne des Decimal, convertis en Number. Acceptable pour la précision requise (Haversine) mais à surveiller.

## Corrections à appliquer
1. Ajouter timeout HTTP dans le HttpModule (5s)
2. Supprimer l'import HttpService inutilisé dans CollecteService
