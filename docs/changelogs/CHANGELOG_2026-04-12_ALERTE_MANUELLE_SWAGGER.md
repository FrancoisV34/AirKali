# Changelog — SPEC_012 Alerte manuelle admin + Swagger

**Date** : 2026-04-12
**Commit** : feat(admin): implement manual alerts and Swagger API documentation
**Spec** : SPEC_012_ALERTE_MANUELLE_SWAGGER.md

---

## Resume

Implementation des alertes manuelles admin et de la documentation Swagger. Un admin peut creer des alertes associees a une commune avec les paliers existants et un message optionnel. Les alertes sont affichees in-app sur la page commune. Swagger documente l'ensemble de l'API.

## Changements

### Alerte manuelle admin — Backend
- **Model Prisma** : `ManualAlert` avec communeId, palier, message optionnel, expiresAt (7 jours), closedAt
- **ManualAlertService** : create, findAll (avec statut calcule), close, getActiveByCommune
- **ManualAlertAdminController** : POST/GET/PATCH sous /admin/alertes, protege par admin guard
- **ManualAlertPublicController** : GET /communes/:id/manual-alerts (public, alertes actives)
- Migration Prisma generee

### Alerte manuelle admin — Frontend
- **Page admin alertes** (`/admin/alertes`) : formulaire de creation (recherche commune, selecteur palier, message optionnel) + tableau des alertes avec statut et bouton cloture
- **Affichage page commune** : bannieres colorees par palier (orange/rouge/bleu) avec icone et message
- **AdminService** : methodes getManualAlerts, createManualAlert, closeManualAlert

### Documentation Swagger
- `@nestjs/swagger` installe et configure dans main.ts
- Swagger UI accessible sur `/api-docs`
- `@ApiTags` sur les 13 controllers (Auth, Communes, Qualite air, Meteo, Favoris, Forum Topics, Forum Commentaires, Forum Categories, Votes, Notifications, Alertes, Admin, Export, Alertes manuelles)
- `@ApiBearerAuth` sur les controllers authentifies
- `@ApiOperation` + `@ApiResponse` detailles sur auth et alertes manuelles

## Fichiers crees

| Fichier | Description |
|---------|-------------|
| `prisma/migrations/.../migration.sql` | Migration ManualAlert |
| `src/manual-alert/manual-alert.module.ts` | Module NestJS |
| `src/manual-alert/manual-alert.controller.ts` | 2 controllers (admin + public) |
| `src/manual-alert/manual-alert.service.ts` | Service CRUD + logique statut |
| `src/manual-alert/manual-alert.service.spec.ts` | 8 tests unitaires |
| `src/manual-alert/dto/create-manual-alert.dto.ts` | DTO validation |
| `frontend/.../admin-alertes/` | 3 fichiers (component, html, scss) |

## Fichiers modifies

| Fichier | Description |
|---------|-------------|
| `prisma/schema.prisma` | Ajout model ManualAlert + relations |
| `src/app.module.ts` | Import ManualAlertModule |
| `src/main.ts` | Setup Swagger |
| 13 controllers | Ajout @ApiTags |
| `frontend/.../admin.service.ts` | Methodes alertes manuelles |
| `frontend/.../data-panel/` | Affichage alertes manuelles |
| `frontend/.../app.routes.ts` | Route /admin/alertes |
| `package.json` | +@nestjs/swagger |

## Tests
- 163/163 tests passent (aucune regression)
- 8 nouveaux tests : create (commune 404, expiration 7j, message), close (404, deja cloturee, succes), getActiveByCommune, findAll statuts

## Securite
- Admin guards sur tous les endpoints CRUD
- Endpoint public en lecture seule
- Validation DTO (class-validator + enums Prisma)

## Note
- Le guard conditionnel Swagger en prod (restriction admin) n'est pas encore implemente — a faire avant mise en production
