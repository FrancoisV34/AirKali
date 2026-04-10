# SPEC_009 — Alertes Email & Notifications Seuils

| Champ | Valeur |
|-------|--------|
| **ID** | SPEC_009 |
| **Titre** | Alertes email et notifications sur seuils environnementaux (UC16) |
| **Date** | 2026-04-10 |
| **Statut** | Validee |
| **Priorite** | P2 |
| **Dependances** | SPEC_001 (auth, guards, suspension), SPEC_002 (collecte horaire, donnees air/meteo), SPEC_005 (favoris, communes), SPEC_007 (notifications in-app pattern) |
| **UC couverts** | UC16 |

---

## 1. Contexte et objectif

Permettre aux utilisateurs de recevoir des alertes par email et notification in-app lorsque des seuils environnementaux sont depasses sur leurs communes favorites. Deux mecanismes coexistent :

- **Alertes personnalisees** : l'utilisateur configure jusqu'a 3 alertes avec des seuils predefinis sur ses communes favorites.
- **Alertes officielles automatiques** : declenchees pour tous les utilisateurs ayant la commune en favori, basees sur les indices de qualite de l'air (European AQI) et les codes meteo severes d'Open-Meteo.

---

## 2. Modele de donnees

### 2.1 Nouvelle table `Alert`

```prisma
model Alert {
  id              Int        @id @default(autoincrement())
  userId          Int
  communeId       Int
  type            AlertType  // AIR | METEO
  palier          AlertPalier // AIR_MOYEN | AIR_MAUVAIS | AIR_TRES_MAUVAIS | METEO_SEVERE
  active          Boolean    @default(true)
  lastTriggeredAt DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  commune         Commune    @relation(fields: [communeId], references: [id], onDelete: Cascade)
  logs            AlertLog[]

  @@unique([userId, communeId, type])
}
```

### 2.2 Nouvelle table `AlertLog`

```prisma
model AlertLog {
  id              Int        @id @default(autoincrement())
  alertId         Int?       // null pour les alertes officielles auto
  userId          Int
  communeId       Int
  type            AlertType
  palier          AlertPalier?
  valeurMesuree   Float
  seuilDeclenche  Float
  unite           String     // "AQI", "km/h", "°C"
  officielle      Boolean    @default(false)
  emailSent       Boolean    @default(false)
  notificationSent Boolean   @default(false)
  createdAt       DateTime   @default(now())

  alert           Alert?     @relation(fields: [alertId], references: [id], onDelete: SetNull)
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  commune         Commune    @relation(fields: [communeId], references: [id], onDelete: Cascade)
}
```

### 2.3 Enums

```prisma
enum AlertType {
  AIR
  METEO
}

enum AlertPalier {
  AIR_MOYEN
  AIR_MAUVAIS
  AIR_TRES_MAUVAIS
  METEO_SEVERE
}
```

### 2.4 Relations a ajouter

```prisma
model User {
  // ... champs existants ...
  alerts          Alert[]
  alertLogs       AlertLog[]
}

model Commune {
  // ... champs existants ...
  alerts          Alert[]
  alertLogs       AlertLog[]
}
```

---

## 3. Seuils de declenchement

### 3.1 Qualite de l'air (European AQI)

| Palier | Seuil AQI | Description |
|--------|-----------|-------------|
| AIR_MOYEN | > 50 | Qualite de l'air moyenne, sensibles concernes |
| AIR_MAUVAIS | > 100 | Mauvaise qualite, population generale affectee |
| AIR_TRES_MAUVAIS | > 150 | Tres mauvaise qualite, alerte sanitaire |

- **Alerte officielle auto** : AQI > 100 (equivalent palier AIR_MAUVAIS)

### 3.2 Meteo

| Palier | Conditions (OR) | Description |
|--------|-----------------|-------------|
| METEO_SEVERE | Vent > 60 km/h OU Temperature > 35°C OU Temperature < -10°C OU Weather code severe* | Conditions meteo dangereuses |

*Weather codes severes Open-Meteo : 65 (pluie forte), 67 (pluie verglacante forte), 75 (neige forte), 77 (grains de neige), 82 (averses violentes), 86 (averses neige forte), 95 (orage), 96 (orage + grele legere), 99 (orage + grele forte).

- **Alerte officielle auto** : memes conditions que METEO_SEVERE

---

## 4. Logique de declenchement et cooldown

### 4.1 Flux de verification

```
Collecte horaire (cron existant)
  → Insertion donnees air/meteo en BDD
  → Appel AlertService.checkAlerts(communeId, donnees)
    → Pour chaque commune avec nouvelles donnees :
      1. Recuperer toutes les alertes personnalisees actives sur cette commune
      2. Verifier les seuils officiels pour tous les users ayant cette commune en favori
      3. Pour chaque alerte declenchee :
         a. Verifier cooldown (lastTriggeredAt + 72h < now ET valeur repassee sous le seuil entre-temps)
         b. Si OK : creer AlertLog + envoyer email + creer notification in-app
         c. Mettre a jour lastTriggeredAt
```

### 4.2 Cooldown — double condition

Un nouvel email/notification est envoye uniquement si :
1. La valeur est **repassee sous le seuil** au moins une fois depuis le dernier declenchement
2. **72 heures minimum** se sont ecoulees depuis le dernier envoi

Les deux conditions doivent etre remplies simultanement.

### 4.3 Tracking du repassage sous seuil

Ajouter un champ `wasUnderThreshold` (Boolean, default true) sur la table `Alert` :
- Mis a `false` quand l'alerte se declenche
- Remis a `true` quand la collecte detecte que la valeur est repassee sous le seuil
- Le declenchement suivant necessite `wasUnderThreshold = true` ET `lastTriggeredAt + 72h < now`

### 4.4 Utilisateur suspendu

- **Pas d'email, pas de notification in-app** pendant la suspension
- Les alertes restent configurees mais sont ignorees par le check
- Filtre : `WHERE user.estSuspendu = false`

---

## 5. Service email — Brevo (SMTP)

### 5.1 Configuration

Variables d'environnement a ajouter :

```env
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=<email-compte-brevo>
BREVO_SMTP_PASS=<cle-smtp-brevo>
BREVO_FROM_EMAIL=alertes@breathforall.fr
BREVO_FROM_NAME=Breath for All
```

### 5.2 Implementation

Utiliser `nodemailer` (deja installe) avec la configuration SMTP Brevo :

```typescript
// mail.service.ts — ajouter methode
async sendAlertEmail(to: string, data: {
  communeName: string;
  type: 'AIR' | 'METEO';
  valeur: number;
  seuil: number;
  unite: string;
  officielle: boolean;
  communeId: number;
}): Promise<void>
```

### 5.3 Contenu de l'email

**Sujet** : `[Breath for All] Alerte ${type} — ${communeName}`

**Corps** (HTML simple) :
```
Alerte ${officielle ? 'officielle' : ''} ${type === 'AIR' ? 'qualite de l\'air' : 'meteo'}

Commune : ${communeName}
Valeur mesuree : ${valeur} ${unite}
Seuil declenche : ${seuil} ${unite}

Consultez les donnees detaillees :
[Voir la commune] → lien vers /recherche/commune/${communeId}

---
Pour gerer vos alertes, rendez-vous sur votre espace personnel
dans la section "Mes alertes".
```

### 5.4 Limites

- Plan gratuit Brevo : 300 emails/jour
- Suffisant pour un MVP
- Si saturation : les emails en echec sont logues (AlertLog.emailSent = false) mais la notification in-app est quand meme envoyee

---

## 6. Notification in-app

Reprend le pattern existant (SPEC_007, table `Notification`) :

```typescript
await this.prisma.notification.create({
  data: {
    userId: user.id,
    type: 'ALERTE_AIR' | 'ALERTE_METEO',
    titre: `Alerte ${type} — ${communeName}`,
    message: `${indicateur} a ${valeur} ${unite} (seuil: ${seuil} ${unite})`,
    lien: `/recherche/commune/${communeId}`,
  },
});
```

Ajouter les types de notification a l'enum existante :
```prisma
enum NotificationType {
  // ... types existants ...
  ALERTE_AIR
  ALERTE_METEO
}
```

---

## 7. API Backend

### 7.1 Endpoints alertes

| Methode | Route | Description | Auth | Acces |
|---------|-------|-------------|------|-------|
| GET | `/api/alerts` | Liste mes alertes configurees | Oui | User |
| POST | `/api/alerts` | Creer une alerte | Oui | User (non suspendu) |
| PATCH | `/api/alerts/:id` | Toggle actif/inactif | Oui | User (non suspendu, proprio) |
| DELETE | `/api/alerts/:id` | Supprimer une alerte | Oui | User (non suspendu, proprio) |
| GET | `/api/alerts/history` | Historique des alertes declenchees | Oui | User |

### 7.2 DTOs

**CreateAlertDto** :
```typescript
{
  communeId: number;    // doit etre une commune favorite de l'utilisateur
  type: 'AIR' | 'METEO';
  palier: 'AIR_MOYEN' | 'AIR_MAUVAIS' | 'AIR_TRES_MAUVAIS' | 'METEO_SEVERE';
}
```

**Validations** :
- `communeId` doit etre dans les favoris de l'utilisateur
- `palier` doit etre coherent avec le `type` (AIR_* pour AIR, METEO_* pour METEO)
- Max 3 alertes par utilisateur (count avant insert)
- Unicite : 1 seule alerte par couple (userId, communeId, type)

**Reponse GET /api/alerts** :
```json
[
  {
    "id": 1,
    "communeId": 123,
    "commune": { "id": 123, "nom": "Lyon", "codePostal": "69001" },
    "type": "AIR",
    "palier": "AIR_MAUVAIS",
    "active": true,
    "lastTriggeredAt": "2026-04-09T14:00:00Z",
    "createdAt": "2026-04-08T10:00:00Z"
  }
]
```

**Reponse GET /api/alerts/history** :
```json
[
  {
    "id": 1,
    "commune": { "id": 123, "nom": "Lyon" },
    "type": "AIR",
    "palier": "AIR_MAUVAIS",
    "valeurMesuree": 120.5,
    "seuilDeclenche": 100,
    "unite": "AQI",
    "officielle": false,
    "createdAt": "2026-04-09T14:00:00Z"
  }
]
```

---

## 8. Interface Frontend — Page "Mes alertes"

### 8.1 Acces

- Depuis la page profil : tab ou bouton "Mes alertes"
- Route : `/profil/alertes`

### 8.2 Section configuration

**Liste des alertes** :
- Card par alerte : nom de la commune, type (Air/Meteo), palier, toggle actif/inactif, bouton supprimer
- Si aucune alerte : message "Aucune alerte configuree"
- Si 3 alertes atteintes : le bouton "Nouvelle alerte" est desactive avec message "Limite de 3 alertes atteinte"

**Formulaire de creation** (modale ou inline) :
1. Select commune (parmi les favoris uniquement)
2. Select type : Air / Meteo
3. Select palier (filtre selon le type choisi) :
   - Si Air : Moyen / Mauvais / Tres mauvais
   - Si Meteo : Severe (seul choix)
4. Bouton "Creer l'alerte"

### 8.3 Section historique

- Tableau chronologique (plus recent en haut)
- Colonnes : Date, Commune, Type, Valeur mesuree, Seuil, Officielle (badge oui/non)
- Pagination si necessaire
- Les entrees de plus de 30 jours sont purgees automatiquement (pas affichees)

### 8.4 Etats particuliers

- Utilisateur suspendu : page accessible en lecture seule, tous les boutons de creation/modification/suppression desactives
- Commune retiree des favoris : alerte affichee comme "inactive" avec mention "(commune retiree des favoris)"

---

## 9. Cron — Integration dans les jobs existants

### 9.1 Check des alertes (apres collecte)

Integrer l'appel dans les crons de collecte existants (air + meteo) :

```
Cron collecte air (toutes les heures) :
  → collecte donnees
  → insertion BDD
  → [NOUVEAU] AlertService.checkAirAlerts(communeId, aqi)

Cron collecte meteo (toutes les heures) :
  → collecte donnees
  → insertion BDD
  → [NOUVEAU] AlertService.checkMeteoAlerts(communeId, { vent, temperature, weatherCode })
```

### 9.2 Purge historique (cron minuit existant)

Integrer dans le cron de desactivation des communes (minuit) :

```typescript
// Ajout dans le cron minuit existant
await this.prisma.alertLog.deleteMany({
  where: {
    createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  }
});
```

---

## 10. Gestion du retrait de favori

Quand un utilisateur retire une commune de ses favoris (endpoint existant) :

```typescript
// Dans FavoriteService.remove() — ajouter :
await this.prisma.alert.updateMany({
  where: { userId, communeId },
  data: { active: false },
});
```

Les alertes sont **desactivees** (pas supprimees). Si l'utilisateur remet la commune en favori, il peut reactiver ses alertes manuellement.

---

## 11. Structure des fichiers

### Backend
```
src/
  alert/
    alert.module.ts
    alert.controller.ts
    alert.service.ts        // CRUD alertes + check seuils + cooldown
    dto/
      create-alert.dto.ts
  mail/
    mail.service.ts         // existant — ajouter sendAlertEmail()
    mail.module.ts          // existant
```

### Frontend
```
frontend/src/app/
  pages/
    profil/
      alertes/
        alertes.component.ts
        alertes.component.html
        alertes.component.scss
  core/
    services/
      alert.service.ts      // appels API alerts
```

---

## 12. Variables d'environnement a ajouter

```env
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=<email-compte-brevo>
BREVO_SMTP_PASS=<cle-smtp-brevo>
BREVO_FROM_EMAIL=alertes@breathforall.fr
BREVO_FROM_NAME=Breath for All
```

Ajouter dans `.env.example` avec des valeurs placeholder.

---

## 13. Regles metier resumees

1. Max 3 alertes personnalisees par utilisateur (toutes communes confondues)
2. 1 seule alerte par couple (utilisateur, commune, type)
3. Alertes officielles hors quota, declenchees automatiquement pour tous les users avec la commune en favori
4. Cooldown : repassage sous le seuil + 72h minimum entre 2 envois
5. Utilisateur suspendu : pas d'email, pas de notif, alertes gelee, page en lecture seule
6. Retrait favori : alertes desactivees (pas supprimees)
7. Purge AlertLog > 30 jours dans le cron minuit
8. Email en echec : logue mais notification in-app envoyee quand meme
9. Nom de l'alerte = nom de la commune
