# SPEC_012 — Alerte manuelle admin et documentation Swagger

**Date** : 2026-04-12
**Statut** : A developper
**Priorite** : Moyenne (conformite dossier de conception)
**Reference** : Dossier de conception Breath For All (20/03/2026), sections 4.2, 9

---

## 1. Contexte et objectif

Le dossier de conception prevoit deux fonctionnalites manquantes :
1. **Alerte manuelle admin** : un administrateur peut emettre une alerte textuelle associee a une commune (item #7 du TODO conformite)
2. **Documentation Swagger** : documentation complete de l'API via Swagger UI (item #6 du TODO conformite)

---

## 2. Fonctionnalite A — Alerte manuelle admin

### 2.1 Principe

Un administrateur peut creer une alerte manuelle associee a une commune, en utilisant les paliers existants (`AIR_MOYEN`, `AIR_MAUVAIS`, `AIR_TRES_MAUVAIS`, `METEO_SEVERE`) avec un message personnalise optionnel. L'alerte est affichee in-app aux utilisateurs, au meme endroit que les alertes automatiques.

### 2.2 Modele de donnees

Extension du schema Prisma — nouvelle table `ManualAlert` :

```prisma
model ManualAlert {
  id          Int       @id @default(autoincrement())
  communeId   Int
  commune     Commune   @relation(fields: [communeId], references: [id])
  palier      AlertPalier
  message     String?   @db.Text
  createdBy   Int
  admin       User      @relation(fields: [createdBy], references: [id])
  expiresAt   DateTime
  closedAt    DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Champs** :
| Champ | Type | Description |
|-------|------|-------------|
| communeId | Int | Commune concernee |
| palier | AlertPalier (enum existant) | Niveau de l'alerte |
| message | String? | Message personnalise optionnel (texte libre) |
| createdBy | Int | ID de l'admin createur |
| expiresAt | DateTime | Date d'expiration automatique (creation + 7 jours) |
| closedAt | DateTime? | Date de cloture manuelle (null si active) |

### 2.3 Endpoints backend

#### Creer une alerte manuelle
```
POST /api/admin/alertes
```
**Body** :
```json
{
  "communeId": 1,
  "palier": "AIR_MAUVAIS",
  "message": "Incendie industriel en cours, restez a l'interieur"
}
```
**Reponse** : 201 Created avec l'alerte creee
**Auth** : Admin uniquement (guard role)

#### Lister les alertes manuelles
```
GET /api/admin/alertes
```
**Reponse** : Liste de toutes les alertes manuelles (actives + cloturees), triees par date de creation decroissante
**Auth** : Admin uniquement

#### Cloturer une alerte
```
PATCH /api/admin/alertes/:id/close
```
**Reponse** : 200 OK avec l'alerte mise a jour (closedAt = now)
**Auth** : Admin uniquement
**Validation** : 404 si alerte inexistante, 400 si deja cloturee

### 2.4 Logique metier

| Regle | Detail |
|-------|--------|
| MANUAL_ALERT_EXPIRY | expiresAt = createdAt + 7 jours |
| MANUAL_ALERT_ACTIVE | Une alerte est active si closedAt IS NULL ET expiresAt > NOW |
| MANUAL_ALERT_CLOSE | L'admin peut cloturer manuellement (set closedAt = now) |
| MANUAL_ALERT_DISPLAY | Affichee au meme endroit que les alertes automatiques |
| MANUAL_ALERT_MESSAGE | Le message personnalise est optionnel |

### 2.5 Affichage cote utilisateur

- Les alertes manuelles actives apparaissent au meme endroit que les alertes automatiques sur la page commune
- Affichage : icone palier + label du palier + message personnalise (si present)
- Pas de distinction visuelle entre alerte automatique et manuelle (meme style)

### 2.6 Interface admin

**Nouvelle page** : "Alertes" dans l'espace admin (a cote de la page suspension/gestion users)

**Formulaire de creation** :
- Selecteur de commune (dropdown ou recherche)
- Selecteur de palier (AIR_MOYEN, AIR_MAUVAIS, AIR_TRES_MAUVAIS, METEO_SEVERE)
- Champ texte optionnel pour le message personnalise
- Bouton "Creer l'alerte"

**Tableau des alertes** :
| Colonne | Description |
|---------|-------------|
| Commune | Nom de la commune |
| Palier | Niveau de l'alerte |
| Message | Message personnalise (ou "-") |
| Creee le | Date de creation |
| Expire le | Date d'expiration |
| Statut | Active / Cloturee / Expiree |
| Action | Bouton "Cloturer" (si active) |

---

## 3. Fonctionnalite B — Documentation Swagger

### 3.1 Installation et configuration

- Installer `@nestjs/swagger`
- Configurer `SwaggerModule.setup()` dans `src/main.ts`
- URL : `/api-docs`

### 3.2 Niveau de detail

- `@ApiTags` sur chaque controller (grouper par domaine : Auth, Communes, Forum, Alertes, Admin, Export...)
- `@ApiOperation({ summary: '...' })` sur chaque endpoint avec description du role
- `@ApiResponse` pour les codes de retour principaux (200, 201, 400, 401, 403, 404)
- Descriptions enrichies mais pas d'exemples exhaustifs sur chaque endpoint

### 3.3 Acces

| Environnement | Acces |
|---------------|-------|
| Developpement | Ouvert a tous (pas de guard) |
| Production | Restreint aux admins via guard JWT + role check |

**Implementation** :
- Middleware ou guard conditionnel sur la route `/api-docs`
- En dev (`NODE_ENV=development`) : pas de verification
- En prod (`NODE_ENV=production`) : verification JWT + role admin

### 3.4 Controllers a documenter

Tous les controllers existants + les nouveaux de cette spec :
- AuthController
- CommuneController
- ForumController (topics, posts)
- AlertController
- AdminController (users, suspension)
- ExportController (SPEC_011)
- ManualAlertController (cette spec)

---

## 4. Fichiers impactes

| Fichier | Modification |
|---------|-------------|
| `prisma/schema.prisma` | Ajout model ManualAlert |
| `src/manual-alert/manual-alert.module.ts` | Nouveau module |
| `src/manual-alert/manual-alert.controller.ts` | Nouveau controller (CRUD alertes manuelles) |
| `src/manual-alert/manual-alert.service.ts` | Nouveau service |
| `src/manual-alert/dto/create-manual-alert.dto.ts` | DTO creation |
| `src/app.module.ts` | Import ManualAlertModule + SwaggerModule |
| `src/main.ts` | Setup Swagger + guard conditionnel |
| Tous les controllers existants | Ajout decorateurs Swagger |
| Frontend : nouvelle page admin alertes | Formulaire + tableau |
| Frontend : page commune | Affichage alertes manuelles avec les automatiques |
| `package.json` | Ajout @nestjs/swagger |

---

## 5. Regles metier

| Regle | Detail |
|-------|--------|
| MANUAL_ALERT_ADMIN_ONLY | Seuls les admins peuvent creer/cloturer des alertes manuelles |
| MANUAL_ALERT_7D | Expiration automatique apres 7 jours |
| MANUAL_ALERT_CLOSE | Cloture manuelle possible avant expiration |
| MANUAL_ALERT_DISPLAY | Affichee comme les alertes automatiques |
| SWAGGER_DEV_OPEN | Swagger ouvert en dev |
| SWAGGER_PROD_ADMIN | Swagger restreint admin en prod |

---

## 6. Criteres d'acceptation

### Alerte manuelle
- [ ] Un admin peut creer une alerte manuelle avec commune + palier
- [ ] Le message personnalise est optionnel
- [ ] L'alerte apparait sur la page commune, au meme endroit que les alertes automatiques
- [ ] L'alerte expire automatiquement apres 7 jours
- [ ] L'admin peut cloturer une alerte manuellement
- [ ] La page admin "Alertes" affiche le formulaire de creation et le tableau des alertes
- [ ] Le tableau affiche le statut (active/cloturee/expiree) et permet de cloturer
- [ ] Un utilisateur non-admin ne peut pas acceder aux endpoints admin

### Swagger
- [ ] Swagger UI est accessible a /api-docs
- [ ] Tous les endpoints sont documentes avec tags et descriptions
- [ ] En dev : acces libre
- [ ] En prod : seuls les admins connectes accedent a Swagger
- [ ] Les codes de retour principaux sont documentes

---

## 7. Hors scope

- Notification email pour les alertes manuelles (spec future)
- Notification push
- Historique complet des alertes passees cote utilisateur
- Swagger : exemples de requetes/reponses detailles sur chaque endpoint
- Swagger : generation automatique de SDK client
