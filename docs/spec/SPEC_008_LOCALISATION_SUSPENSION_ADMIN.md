# SPEC_008 — Localisation Utilisateur & Interface Admin Suspension

| Champ | Valeur |
|-------|--------|
| **ID** | SPEC_008 |
| **Titre** | Localisation utilisateur (UC12) + Interface admin suspension (UC15) |
| **Date** | 2026-04-08 |
| **Statut** | Validée |
| **Priorité** | P2 / P3 |
| **Dépendances** | SPEC_001 (auth/rôles/suspension backend), SPEC_002 (communes), SPEC_005 (favoris, carte), SPEC_007 (notifications in-app) |
| **UC couverts** | UC12 (gérer sa localisation), UC15 (interface admin suspension) |

---

## 1. Contexte et objectif

Cette spec couvre deux fonctionnalités liées à la gestion des utilisateurs :

- **UC12** : permettre à un utilisateur de renseigner sa commune de référence depuis son profil, afin de pré-remplir la carte, les données et les alertes automatiquement.
- **UC15** : créer une interface admin permettant de suspendre et réactiver des utilisateurs avec motif, historique, et notification.

---

## 2. Modèle de données

### 2.1 Modifications table `User`

Ajouter un champ `communeId` optionnel pour stocker la commune de référence :

```prisma
model User {
  // ... champs existants ...
  communeId      Int?
  commune        Commune? @relation(fields: [communeId], references: [id], onDelete: SetNull)
  suspensions    SuspensionLog[]
}
```

> Note : le champ `adressePostale String?` existant est conservé pour le code postal saisi par l'utilisateur (libellé de saisie).

### 2.2 Nouvelle table `SuspensionLog`

```prisma
model SuspensionLog {
  id          Int       @id @default(autoincrement())
  userId      Int
  adminId     Int
  action      String    // "SUSPEND" | "REACTIVATE"
  motif       String?   @db.Text
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  admin       User      @relation("AdminSuspensions", fields: [adminId], references: [id])
}
```

**Relation à ajouter sur `User` :**
```prisma
suspensions       SuspensionLog[] @relation()
adminActions      SuspensionLog[] @relation("AdminSuspensions")
```

### 2.3 Modifications table `Commune`

Ajouter la relation inverse :
```prisma
model Commune {
  // ... champs existants ...
  usersReference User[]
}
```

---

## 3. UC12 — Gérer sa localisation

### 3.1 Comportement général

- La localisation est **optionnelle** : l'utilisateur peut s'inscrire et utiliser l'app sans la renseigner.
- Elle est accessible et modifiable depuis la page **"Mon Profil"**.
- Elle consiste à choisir une commune parmi celles couvertes par l'application (communes `active = true` dans la base).

### 3.2 Saisie — Recherche par code postal

**Interface :**
1. L'utilisateur saisit un code postal dans un input dédié (section "Ma commune de référence" dans Mon Profil).
2. Au clic sur "Rechercher" (ou à la soumission), l'app appelle le backend.
3. Le backend retourne la liste des communes correspondant à ce code postal dans notre DB (`active = true`).
4. L'utilisateur choisit sa commune dans la liste affichée.
5. Il confirme via un bouton "Enregistrer".

**Cas limites :**
- Aucun résultat : message "Aucune commune couverte pour ce code postal."
- Code postal invalide (non numérique ou ≠ 5 chiffres) : erreur de validation frontend.

### 3.3 Effets de la localisation

| Situation | Effet |
|---|---|
| Commune renseignée | Carte centrée sur la commune au chargement (même niveau de zoom que résultat de recherche) |
| Commune non renseignée | Comportement actuel : centrage sur la France |
| Commune renseignée | Commune auto-ajoutée aux favoris avec cron activé (si pas déjà présente) |
| Commune déjà en favori | On s'assure que le cron est activé, sans créer de doublon |

### 3.4 Changement de commune de référence

- L'utilisateur peut saisir un nouveau code postal et choisir une nouvelle commune.
- L'ancienne commune de référence est **remplacée** dans le profil.
- L'ancien favori auto-ajouté est **retiré** des favoris.
- Le nouveau favori est **ajouté** automatiquement avec cron activé.

### 3.5 Suppression de la localisation

- Bouton "Retirer ma commune" dans la section profil.
- Si la commune de référence est **uniquement** dans les favoris via l'auto-ajout : elle est retirée des favoris automatiquement.
- Si la commune est **aussi présente manuellement** dans les favoris : afficher une confirmation :
  > "Cette commune est également dans vos favoris. Souhaitez-vous la supprimer de vos favoris ? [Oui] [Non]"
- Le champ `communeId` et `adressePostale` sont remis à `null` dans `User`.

### 3.6 Backend — Nouveaux endpoints

#### GET `/api/communes/par-code-postal`

- **Auth requise** : Oui (JWT)
- **Query params** : `codePostal` (string, requis)
- **Validation** : format 5 chiffres
- **Traitement** : SELECT communes WHERE codePostal = ? AND active = true
- **Réponse 200** :
  ```json
  [
    { "id": 42, "nom": "Lyon 1er", "codePostal": "69001", "codeInsee": "69381" },
    { "id": 43, "nom": "Lyon 2ème", "codePostal": "69002", "codeInsee": "69382" }
  ]
  ```
- **Réponse 200 liste vide** : `[]`

#### PATCH `/api/users/me/commune`

- **Auth requise** : Oui (JWT)
- **Body** : `{ "communeId": 42 }` ou `{ "communeId": null }` (suppression)
- **Validation** : communeId doit exister en DB et être `active = true` (si non null)
- **Traitement** :
  1. Mettre à jour `User.communeId`
  2. Si remplacement : retirer l'ancien favori auto (sauf si l'utilisateur veut le garder → géré côté frontend avec confirmation)
  3. Ajouter le nouveau favori si `communeId` non null (upsert `Favori`, activer cron si besoin)
- **Réponse 200** : profil utilisateur mis à jour
- **Réponse 400** : commune invalide ou inactive

> Note : la logique de suppression conditionnelle du favori (confirmation si manuel) est gérée côté frontend. Le backend expose un endpoint favori standard (DELETE `/api/favoris/:id`) déjà existant.

### 3.7 Frontend — Modifications "Mon Profil"

**Nouvelle section "Ma commune de référence" dans la page profil :**

```
┌─────────────────────────────────────────────┐
│  Ma commune de référence                    │
│                                             │
│  [Actuellement : Lyon 1er (69001)]          │
│                                             │
│  Code postal : [_________] [Rechercher]     │
│                                             │
│  Résultats :                                │
│  ○ Lyon 1er                                 │
│  ○ Lyon 2ème                                │
│                                             │
│  [Enregistrer]          [Retirer ma commune]│
└─────────────────────────────────────────────┘
```

**Modification de la carte (page `/recherche`) :**
- Au chargement, si `user.communeId` est défini : appeler `GET /api/communes/:id` et centrer la carte sur les coordonnées avec le zoom standard.
- Si non défini : comportement actuel.

---

## 4. UC15 — Interface admin suspension utilisateur

### 4.1 Accès et route

- Nouvelle route Angular : `/admin/utilisateurs`
- Accessible uniquement aux utilisateurs avec `role = ADMIN`
- Guard frontend `AdminGuard` (déjà existant ou à créer si absent)
- Lien dans le menu de navigation pour les admins

### 4.2 Liste des utilisateurs

**Affichage :**

| Colonne | Contenu |
|---|---|
| Nom | `prenom nom` |
| Email | email |
| Rôle | badge UTILISATEUR / ADMIN |
| Statut | badge ACTIF (vert) / SUSPENDU (rouge) |
| Actions | Bouton "Suspendre" ou "Réactiver" selon statut |

**Recherche :**
- Input "Rechercher par nom" : filtrage en temps réel (ou au submit) sur `prenom` + `nom` (LIKE %terme%)
- Pagination : 20 utilisateurs par page

**Règles d'affichage :**
- Les admins ne disposent PAS d'un bouton "Suspendre" (l'action est désactivée côté frontend et bloquée côté backend).
- L'admin connecté ne voit pas de bouton sur sa propre ligne.

### 4.3 Action "Suspendre"

1. Clic sur "Suspendre" → modale de confirmation :
   ```
   ┌──────────────────────────────────────────┐
   │  Suspendre [Prénom Nom] ?                │
   │                                          │
   │  Motif (obligatoire) :                   │
   │  [                                     ] │
   │                                          │
   │              [Annuler] [Confirmer]        │
   └──────────────────────────────────────────┘
   ```
2. Le motif est obligatoire (validation frontend + backend).
3. À la confirmation :
   - `User.estSuspendu` passe à `true`
   - Un `SuspensionLog` est créé (`action: "SUSPEND"`, `motif`, `adminId`)
   - Une notification in-app est créée pour l'utilisateur
   - Un email est envoyé à l'utilisateur

### 4.4 Action "Réactiver"

1. Clic sur "Réactiver" → confirmation simple (pas de motif requis).
2. À la confirmation :
   - `User.estSuspendu` passe à `false`
   - Un `SuspensionLog` est créé (`action: "REACTIVATE"`, `adminId`)
   - Une notification in-app est créée pour l'utilisateur
   - Un email est envoyé à l'utilisateur

### 4.5 Historique des suspensions

- Accessible via un bouton "Voir l'historique" sur chaque ligne de la liste.
- S'affiche dans un panel latéral ou une modale.
- Visible par : l'admin (toutes lignes) + l'utilisateur concerné (depuis "Mon Profil" → section "Historique de suspension").

**Contenu de l'historique :**

| Colonne | Contenu |
|---|---|
| Date | `createdAt` formatée |
| Action | "Suspendu" / "Réactivé" |
| Motif | texte libre (vide pour réactivation) |
| Par | "Administrateur" (on n'affiche pas le nom de l'admin à l'utilisateur) |

> L'admin voit la même vue. Il peut voir `adminId` mais on affiche "Administrateur" dans les deux cas pour simplifier.

### 4.6 Notifications in-app

Utiliser le système `Notification` existant (SPEC_007) :

**Suspension :**
```json
{
  "message": "Votre compte a été suspendu par un administrateur.",
  "reason": "[motif libre saisi par l'admin]"
}
```

**Réactivation :**
```json
{
  "message": "Votre compte a été réactivé par un administrateur.",
  "reason": null
}
```

### 4.7 Notifications email

**Configuration :**
- Installer `nodemailer` côté NestJS.
- Créer un `MailModule` + `MailService` (singleton).
- Configuration SMTP via `.env` :
  ```
  MAIL_HOST=smtp.example.com
  MAIL_PORT=587
  MAIL_USER=no-reply@breathforall.fr
  MAIL_PASS=xxxx
  MAIL_FROM="Breath for All <no-reply@breathforall.fr>"
  ```
- En l'absence de configuration SMTP (env non défini), le service log l'email sans l'envoyer (mode dégradé).

**Email de suspension :**
- Objet : `Votre compte Breath for All a été suspendu`
- Corps (texte simple) :
  ```
  Bonjour [Prénom],

  Votre compte a été suspendu par un administrateur.

  Motif : [motif]

  Si vous pensez qu'il s'agit d'une erreur, contactez-nous.

  L'équipe Breath for All
  ```

**Email de réactivation :**
- Objet : `Votre compte Breath for All a été réactivé`
- Corps :
  ```
  Bonjour [Prénom],

  Votre compte a été réactivé. Vous pouvez à nouveau vous connecter.

  L'équipe Breath for All
  ```

### 4.8 Backend — Nouveaux endpoints

#### GET `/api/admin/users`

- **Auth requise** : Oui (JWT + rôle ADMIN)
- **Query params** :
  - `search` : string optionnel (filtre sur `prenom` + `nom`)
  - `page` : number (défaut 1)
  - `limit` : number (défaut 20)
- **Réponse 200** :
  ```json
  {
    "data": [
      {
        "id": 1,
        "prenom": "Jean",
        "nom": "Dupont",
        "email": "jean@example.com",
        "role": "UTILISATEUR",
        "estSuspendu": false,
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
  ```

#### POST `/api/admin/users/:id/suspend`

- **Auth requise** : Oui (JWT + rôle ADMIN)
- **Body** : `{ "motif": "Contenu inapproprié répété" }`
- **Validation** :
  - `motif` : string, obligatoire, non vide
  - L'utilisateur cible ne doit pas être ADMIN
  - L'admin ne peut pas se suspendre lui-même
- **Traitement** :
  1. `User.estSuspendu = true`
  2. Créer `SuspensionLog` (action: SUSPEND)
  3. Créer `Notification` in-app
  4. Envoyer email
- **Réponse 200** : `{ "message": "Utilisateur suspendu." }`
- **Réponse 400** : cible admin ou auto-suspension
- **Réponse 404** : utilisateur introuvable

#### POST `/api/admin/users/:id/reactivate`

- **Auth requise** : Oui (JWT + rôle ADMIN)
- **Body** : aucun
- **Validation** : utilisateur doit être suspendu
- **Traitement** :
  1. `User.estSuspendu = false`
  2. Créer `SuspensionLog` (action: REACTIVATE)
  3. Créer `Notification` in-app
  4. Envoyer email
- **Réponse 200** : `{ "message": "Utilisateur réactivé." }`
- **Réponse 400** : utilisateur non suspendu

#### GET `/api/admin/users/:id/suspension-history`

- **Auth requise** : Oui (JWT + rôle ADMIN)
- **Réponse 200** :
  ```json
  [
    {
      "id": 1,
      "action": "SUSPEND",
      "motif": "Spam répété",
      "createdAt": "2026-04-08T10:00:00Z"
    },
    {
      "id": 2,
      "action": "REACTIVATE",
      "motif": null,
      "createdAt": "2026-04-09T14:00:00Z"
    }
  ]
  ```

#### GET `/api/users/me/suspension-history`

- **Auth requise** : Oui (JWT, utilisateur lui-même)
- **Réponse 200** : même format que ci-dessus (même données, même vue)

---

## 5. Architecture — Nouveaux modules

### 5.1 Backend NestJS

```
src/
  admin/
    admin.module.ts
    admin.controller.ts     ← endpoints /admin/users/*
    admin.service.ts
  mail/
    mail.module.ts
    mail.service.ts         ← envoi email via nodemailer
```

- `AdminModule` importe `PrismaModule`, `MailModule`, `UserModule`
- `MailModule` est global (peut être injecté partout)

### 5.2 Frontend Angular

```
src/app/
  admin/
    admin-routing.module.ts
    users/
      admin-users.component.ts      ← liste + recherche
      admin-users.component.html
      suspension-modal.component.ts ← modale motif
      suspension-history.component.ts
  profile/
    profile.component.ts            ← ajout section commune + historique suspension
```

---

## 6. Règles métier récapitulatives

| Règle | Détail |
|---|---|
| UC12 — Commune optionnelle | Aucun bloc à l'inscription ni à la navigation |
| UC12 — Couverture limitée | Seules les communes `active = true` sont proposées |
| UC12 — Doublon favori | Upsert : pas de doublon, cron activé si absent |
| UC12 — Suppression conditionnelle | Confirmation si commune aussi en favori manuel |
| UC15 — Admin → non-admin uniquement | Guard backend + masquage bouton frontend |
| UC15 — Auto-suspension interdite | Vérification `adminId !== userId` |
| UC15 — Motif obligatoire pour suspension | Validation backend et frontend |
| UC15 — Historique partagé | Admin + utilisateur concerné (mais pas le nom de l'admin visible) |
| UC15 — Email dégradé | Si SMTP non configuré, log console sans planter |

---

## 7. Migration Prisma

```bash
npx prisma migrate dev --name add_commune_ref_and_suspension_log
```

Changements :
- `User.communeId Int?` + relation `Commune`
- Nouvelle table `SuspensionLog`
- Relations `User.suspensions` et `User.adminActions`
