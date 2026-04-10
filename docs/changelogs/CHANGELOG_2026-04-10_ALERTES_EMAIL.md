# Changelog — Alertes Email & Notifications (UC16)

**Date** : 2026-04-10
**Spec** : SPEC_009_ALERTES_EMAIL.md
**Commit** : feat(alerts): implement email alerts and notifications on environmental thresholds

---

## Feature implementee

Systeme d'alertes email et notifications in-app sur les seuils environnementaux (qualite de l'air et meteo) pour les communes favorites des utilisateurs.

### Deux types d'alertes

1. **Alertes personnalisees** : l'utilisateur configure jusqu'a 3 alertes avec seuils predefinis
   - Air : Moyen (AQI > 50), Mauvais (AQI > 100), Tres mauvais (AQI > 150)
   - Meteo : Severe (vent > 60 km/h, temp > 35°C ou < -10°C, weather codes severes)
2. **Alertes officielles automatiques** : declenchees pour tous les users avec la commune en favori (AQI > 100, meteo severe)

### Cooldown : double condition
- Valeur repassee sous le seuil + 72h minimum entre deux envois

---

## Fichiers crees

| Fichier | Description |
|---------|-------------|
| `src/alert/alert.module.ts` | Module NestJS pour les alertes |
| `src/alert/alert.controller.ts` | 5 endpoints REST (GET, POST, PATCH, DELETE, GET history) |
| `src/alert/alert.service.ts` | CRUD + logique de check seuils + cooldown + declenchement |
| `src/alert/alert.service.spec.ts` | 17 tests unitaires |
| `src/alert/dto/create-alert.dto.ts` | DTO avec validations class-validator |
| `frontend/src/app/core/services/alert.service.ts` | Service Angular pour les appels API |
| `frontend/src/app/pages/profil/alertes/alertes.component.ts` | Composant page "Mes alertes" |
| `frontend/src/app/pages/profil/alertes/alertes.component.html` | Template avec config + historique |
| `frontend/src/app/pages/profil/alertes/alertes.component.scss` | Styles |
| `prisma/migrations/20260410190228_add_alerts_system/` | Migration SQL |
| `docs/spec/SPEC_009_ALERTES_EMAIL.md` | Specification |
| `docs/audits/AUDIT_2026-04-10_ALERTES_EMAIL.md` | Rapport d'audit |

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `prisma/schema.prisma` | Ajout enums AlertType/AlertPalier, models Alert/AlertLog, champ weatherCode sur DonneeMeteo, relations User/Commune |
| `src/app.module.ts` | Import AlertModule |
| `src/mail/mail.service.ts` | Ajout methode sendAlertEmail() |
| `src/collecte/collecte.service.ts` | Appel alertService apres collecte air/meteo, purge logs dans cron minuit |
| `src/collecte/collecte.module.ts` | Import AlertModule |
| `src/collecte/meteo-api.service.ts` | Retour du weatherCode brut dans MeteoData |
| `src/favorite/favorite.service.ts` | Desactivation alertes au retrait d'un favori |
| `src/collecte/collecte.service.spec.ts` | Ajout mock AlertService |
| `src/favorite/favorite.service.spec.ts` | Ajout mock alert.updateMany |
| `frontend/src/app/app.routes.ts` | Ajout route /profil/alertes |
| `frontend/src/app/pages/profil/profil.component.ts` | Import RouterModule |
| `frontend/src/app/pages/profil/profil.component.html` | Ajout section "Mes alertes" avec lien |
| `.env.example` | Ajout variables MAIL_HOST/PORT/USER/PASS/FROM |

## Architecture

- Module `alert/` autonome, exporte AlertService
- AlertService injecte dans CollecteModule pour le check apres collecte
- MailModule global reexploite (ajout methode sendAlertEmail)
- Pattern notification in-app identique a SPEC_007

## Tests

- 17 tests unitaires AlertService (CRUD, validations, cooldown, seuils, purge)
- 146 tests total projet — tous passent, 0 regression

## Securite

- Aucune vulnerabilite detectee
- Auth JWT sur tous les endpoints
- Verification ownership par userId
- Pas d'injection SQL (Prisma ORM)

## Decisions techniques

1. **weatherCode stocke dans DonneeMeteo** : le champ meteoCiel existant stocke le texte WMO, pas le code. Le code brut est necessaire pour le check des alertes meteo.
2. **Brevo SMTP** : plan gratuit 300 emails/jour, suffisant pour MVP. Fallback gracieux si envoi echoue (notification in-app envoyee quand meme).
3. **Cooldown sur AlertLog pour alertes officielles** : pas de table Alert pour les alertes auto, le cooldown est gere via un findFirst sur AlertLog.
