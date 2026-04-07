# CHANGELOG — Logique Métier Environnementale

| Champ | Valeur |
|-------|--------|
| Date | 2026-04-02 |
| Feature | SPEC_002 — Logique Métier Environnementale |
| Commit | `feat(metier): add communes, air quality, meteo data and cron collection` |

## Feature implémentée

Ajout de la logique métier Breath for All : communes françaises, données de qualité de l'air et météo en temps réel via Open-Meteo, collecte automatique par cron, et endpoints d'historique.

## Fichiers créés

### Prisma
| Fichier | Description |
|---------|-------------|
| `prisma/schema.prisma` | Modifié — ajout Commune, DonneeAir, DonneeMeteo, LogCollecte, nouveaux enums, migration User |
| `prisma/seed.ts` | Seed initial ~35K communes via geo.api.gouv.fr |

### Module Commune
| Fichier | Description |
|---------|-------------|
| `src/commune/commune.module.ts` | Module Commune |
| `src/commune/commune.service.ts` | Recherche (nom/code postal, max 20, min 2 chars) + findById |
| `src/commune/commune.controller.ts` | GET /api/communes?search= et GET /api/communes/:id |
| `src/commune/commune.service.spec.ts` | 5 tests unitaires |

### Module Air Quality
| Fichier | Description |
|---------|-------------|
| `src/air-quality/air-quality.module.ts` | Module Air Quality |
| `src/air-quality/air-quality.service.ts` | getCurrent (API temps réel) + getHistory (BDD, max 90j) |
| `src/air-quality/air-quality.controller.ts` | GET /api/communes/:id/air et /air/history |
| `src/air-quality/air-quality.service.spec.ts` | 7 tests unitaires |

### Module Météo
| Fichier | Description |
|---------|-------------|
| `src/meteo/meteo.module.ts` | Module Météo |
| `src/meteo/meteo.service.ts` | getCurrent (API temps réel) + getHistory (BDD, max 90j) |
| `src/meteo/meteo.controller.ts` | GET /api/communes/:id/meteo et /meteo/history |
| `src/meteo/meteo.service.spec.ts` | 5 tests unitaires |

### Module Collecte
| Fichier | Description |
|---------|-------------|
| `src/collecte/collecte.module.ts` | Module Collecte (HttpModule avec timeout 5s) |
| `src/collecte/collecte.service.ts` | 4 cron jobs (air, météo, population, désactivation) |
| `src/collecte/air-quality-api.service.ts` | Client API Open-Meteo Air Quality |
| `src/collecte/meteo-api.service.ts` | Client API Open-Meteo Weather + mapping WMO |
| `src/collecte/collecte.service.spec.ts` | 4 tests unitaires |

### Common Utils
| Fichier | Description |
|---------|-------------|
| `src/common/utils/haversine.ts` | Calcul distance Haversine + bounding box |
| `src/common/utils/haversine.spec.ts` | 3 tests unitaires |
| `src/common/utils/wmo-codes.ts` | Mapping WMO weather codes → texte français |
| `src/common/utils/wmo-codes.spec.ts` | 4 tests unitaires |

### Fichiers modifiés
| Fichier | Description |
|---------|-------------|
| `src/app.module.ts` | Ajout ScheduleModule, CommuneModule, AirQualityModule, MeteoModule, CollecteModule |
| `src/auth/auth.service.ts` | Migration nom/prenom, vérification estSuspendu (403) |
| `src/auth/dto/register.dto.ts` | firstName/lastName → nom/prenom |
| `src/user/user.service.ts` | Profil avec nom/prenom/adressePostale |
| `package.json` | +3 dépendances, config prisma seed |
| `tsconfig.build.json` | Exclusion prisma/ du build |

## Architecture

```
AppModule
  ├── ConfigModule (global)
  ├── ScheduleModule
  ├── PrismaModule (global)
  ├── AuthModule (modifié — suspension)
  ├── UserModule (modifié — nouveaux champs)
  ├── CommuneModule → recherche + détail
  ├── AirQualityModule → temps réel + historique
  ├── MeteoModule → temps réel + historique
  └── CollecteModule → crons + API clients
```

## APIs externes intégrées

| API | Usage |
|-----|-------|
| geo.api.gouv.fr | Seed communes + cron population |
| air-quality-api.open-meteo.com | Qualité air (PM2.5, PM10, ozone, CO, AQI) |
| api.open-meteo.com | Météo (temp, pression, humidité, vent, ciel) |

## Tests

| Suite | Tests | Résultat |
|-------|-------|----------|
| SPEC_001 (existants) | 12 | PASS |
| CommuneService | 5 | PASS |
| AirQualityService | 7 | PASS |
| MeteoService | 5 | PASS |
| CollecteService | 4 | PASS |
| Haversine | 3 | PASS |
| WMO codes | 4 | PASS |
| **Total** | **41** | **PASS** |

## Décisions techniques

| Décision | Justification |
|----------|---------------|
| Open-Meteo pour air + météo | Gratuit, sans clé API, par lat/lng |
| Timeout HTTP 5s | Évite les crons bloqués par des APIs lentes |
| Seed par batch de 500 + upsert | Performance + idempotence |
| WMO codes mappés côté serveur | Texte français directement dans l'API |
| Decimal(9,6) pour coordonnées | Précision métrique suffisante pour Haversine |
