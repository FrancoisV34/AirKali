# SPEC_006 — Forum communautaire (Topics, Commentaires, Votes)

| Champ | Valeur |
|-------|--------|
| **ID** | SPEC_006 |
| **Titre** | Forum communautaire : topics, commentaires arborescents, votes, catégories |
| **Date** | 2026-04-06 |
| **Statut** | Validée |
| **Priorité** | Moyenne (P2) |
| **Dépendance** | SPEC_001 (auth backend, rôles, suspension), SPEC_003 (frontend base, navbar), SPEC_004 (auth frontend) |
| **UC couvertes** | UC9, UC10, UC11 |

---

## 1. Objectif

Implémenter un forum communautaire global accessible via une nouvelle route `/forum` dans la navbar. Les utilisateurs connectés (user et admin) peuvent créer des topics, commenter en arborescence (type Reddit, 3 niveaux max), et voter (+1/-1) sur les topics et commentaires. Les visiteurs non connectés ont un accès en lecture seule. Les utilisateurs suspendus sont en lecture seule. La modération (soft delete) est préparée structurellement mais pas implémentée (UC13/UC14 futures).

---

## 2. Modèle de données

### 2.1 Nouvelle table `Category`

```prisma
model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique @db.VarChar(100)
  createdAt DateTime @default(now())
  topics    Topic[]
}
```

### 2.2 Nouvelle table `Topic`

```prisma
model Topic {
  id         Int        @id @default(autoincrement())
  title      String     @db.VarChar(255)
  content    String     @db.Text
  userId     Int
  categoryId Int?
  deletedAt  DateTime?
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  category   Category?  @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  comments   Comment[]
}
```

### 2.3 Nouvelle table `Comment`

```prisma
model Comment {
  id        Int        @id @default(autoincrement())
  content   String     @db.Text
  userId    Int
  topicId   Int
  parentId  Int?
  deletedAt DateTime?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  topic     Topic      @relation(fields: [topicId], references: [id], onDelete: Cascade)
  parent    Comment?   @relation("CommentTree", fields: [parentId], references: [id], onDelete: Cascade)
  children  Comment[]  @relation("CommentTree")
}
```

### 2.4 Nouvelle table `Vote`

```prisma
model Vote {
  id         Int      @id @default(autoincrement())
  userId     Int
  targetType String   // "TOPIC" ou "COMMENT"
  targetId   Int
  value      Int      // +1 ou -1
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, targetType, targetId])
}
```

### 2.5 Relations à ajouter sur `User`

```prisma
// Dans le model User existant, ajouter :
topics   Topic[]
comments Comment[]
votes    Vote[]
```

### 2.6 Seed — Catégories initiales

```
- "Qualité de l'air"
- "Météo"
- "Général"
```

---

## 3. Droits & rôles

| Action | Visiteur | User | User suspendu | Admin |
|--------|----------|------|---------------|-------|
| Lire topics/commentaires | Oui | Oui | Oui | Oui |
| Créer un topic | Non | Oui (max 3/jour) | Non | Oui |
| Éditer un topic | Non | Oui (auteur seul) | Non | Oui (tous) |
| Commenter | Non | Oui | Non | Oui |
| Éditer un commentaire | Non | Oui (auteur seul) | Non | Oui (tous) |
| Voter (+1/-1) | Non | Oui | Non | Oui |
| Créer une catégorie | Non | Non | Non | Oui |

**User suspendu** : peut lire tout le forum, ne peut pas créer/commenter/voter/éditer. Ses contenus existants restent visibles.

---

## 4. Backend — Endpoints

### 4.1 Categories

#### GET `/api/categories`
- **Auth** : Non requise
- **Réponse 200** :
```json
[
  { "id": 1, "name": "Qualité de l'air", "createdAt": "..." },
  { "id": 2, "name": "Météo", "createdAt": "..." },
  { "id": 3, "name": "Général", "createdAt": "..." }
]
```

#### POST `/api/categories`
- **Auth** : Admin uniquement (JwtAuthGuard + RolesGuard)
- **Body** :
```json
{ "name": "string (1-100 car., unique)" }
```
- **Réponse 201** : la catégorie créée
- **Erreurs** : 409 si nom déjà existant, 400 si validation échoue

### 4.2 Topics

#### GET `/api/topics`
- **Auth** : Non requise
- **Query params** :
  - `page` : number (défaut 1)
  - `limit` : number (défaut 20, max 20)
  - `sort` : `recent` (défaut) | `popular` | `active`
  - `categoryId` : number (optionnel, filtre par catégorie)
- **Tri `recent`** : createdAt DESC
- **Tri `popular`** : score net DESC (somme des votes)
- **Tri `active`** : date du dernier commentaire DESC
- **Réponse 200** :
```json
{
  "data": [
    {
      "id": 1,
      "title": "Titre du topic",
      "excerpt": "Les 100 premiers caractères du contenu...",
      "category": { "id": 1, "name": "Général" } | null,
      "author": { "id": 5, "pseudo": "user1" },
      "score": 12,
      "commentCount": 8,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

#### GET `/api/topics/:id`
- **Auth** : Non requise
- **Réponse 200** :
```json
{
  "id": 1,
  "title": "Titre du topic",
  "content": "Contenu complet en markdown...",
  "category": { "id": 1, "name": "Général" } | null,
  "author": { "id": 5, "pseudo": "user1" },
  "score": 12,
  "userVote": 1 | -1 | null,
  "isEdited": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```
- `userVote` : le vote du user connecté sur ce topic (null si pas connecté ou pas voté)
- `isEdited` : true si updatedAt > createdAt
- **Erreur** : 404 si topic inexistant

#### POST `/api/topics`
- **Auth** : JwtAuthGuard, user non suspendu
- **Body** :
```json
{
  "title": "string (5-255 car.)",
  "content": "string (2-2000 car.)",
  "categoryId": "number | null (optionnel)"
}
```
- **Vérifications** :
  1. User non suspendu
  2. Max 3 topics/jour calendaire (minuit à minuit, timezone serveur) — compter les topics du user où `createdAt >= début du jour`
  3. Si `categoryId` fourni, vérifier qu'il existe
- **Réponse 201** : le topic créé
- **Erreurs** : 400 validation, 403 si suspendu, 429 si limite 3/jour atteinte

#### PATCH `/api/topics/:id`
- **Auth** : JwtAuthGuard, auteur du topic OU admin
- **Body** :
```json
{
  "title": "string (5-255 car., optionnel)",
  "content": "string (2-2000 car., optionnel)",
  "categoryId": "number | null (optionnel)"
}
```
- **Réponse 200** : le topic mis à jour
- **Erreurs** : 403 si ni auteur ni admin, 404

### 4.3 Comments

#### GET `/api/topics/:topicId/comments`
- **Auth** : Non requise
- **Query params** :
  - `page` : number (défaut 1)
  - `limit` : number (défaut 20, max 20)
- **Traitement** :
  1. Récupérer les commentaires racine (parentId = null) du topic
  2. Trier par score net DESC
  3. Paginer (la pagination s'applique sur les commentaires racine)
  4. Pour chaque commentaire racine, charger récursivement les enfants (niveaux 2 et 3), triés par score net DESC
- **Réponse 200** :
```json
{
  "data": [
    {
      "id": 1,
      "content": "Contenu markdown...",
      "author": { "id": 5, "pseudo": "user1" },
      "score": 7,
      "userVote": 1 | -1 | null,
      "isEdited": false,
      "parentId": null,
      "createdAt": "...",
      "updatedAt": "...",
      "children": [
        {
          "id": 2,
          "content": "Réponse niveau 2...",
          "author": { "id": 8, "pseudo": "user2" },
          "score": 3,
          "userVote": null,
          "isEdited": false,
          "parentId": 1,
          "createdAt": "...",
          "updatedAt": "...",
          "children": [
            {
              "id": 3,
              "content": "Réponse niveau 3...",
              "author": { "id": 5, "pseudo": "user1" },
              "score": 0,
              "userVote": null,
              "isEdited": false,
              "parentId": 2,
              "createdAt": "...",
              "updatedAt": "...",
              "children": []
            }
          ]
        }
      ]
    }
  ],
  "total": 35,
  "page": 1,
  "limit": 20
}
```

#### POST `/api/topics/:topicId/comments`
- **Auth** : JwtAuthGuard, user non suspendu
- **Body** :
```json
{
  "content": "string (2-2000 car.)",
  "parentId": "number | null (optionnel)"
}
```
- **Vérifications** :
  1. User non suspendu
  2. Topic existe
  3. Si `parentId` fourni : le commentaire parent existe, appartient au même topic, et sa profondeur est < 3 (on ne peut pas répondre à un commentaire de niveau 3)
- **Calcul de profondeur** : remonter la chaîne des parentId pour déterminer le niveau
- **Réponse 201** : le commentaire créé
- **Erreurs** : 400 validation, 403 si suspendu, 404 si topic/parent inexistant, 422 si profondeur max atteinte

#### PATCH `/api/topics/:topicId/comments/:id`
- **Auth** : JwtAuthGuard, auteur du commentaire OU admin
- **Body** :
```json
{
  "content": "string (2-2000 car.)"
}
```
- **Réponse 200** : le commentaire mis à jour
- **Erreurs** : 403, 404

### 4.4 Votes

#### POST `/api/votes`
- **Auth** : JwtAuthGuard, user non suspendu
- **Body** :
```json
{
  "targetType": "TOPIC" | "COMMENT",
  "targetId": "number",
  "value": 1 | -1
}
```
- **Logique toggle** :
  1. Vérifier que la cible existe
  2. Vérifier que le user n'est pas l'auteur de la cible (403 si auto-vote)
  3. Chercher un vote existant du user sur cette cible
  4. **Pas de vote existant** → créer le vote
  5. **Vote existant avec même valeur** → supprimer le vote (annulation)
  6. **Vote existant avec valeur opposée** → mettre à jour la valeur (bascule)
- **Réponse 200** :
```json
{
  "vote": { "id": 1, "value": 1 } | null,
  "newScore": 15
}
```
- `vote` : le vote actuel du user (null si annulé)
- `newScore` : le nouveau score net de la cible
- **Erreurs** : 400 validation, 403 si suspendu ou auto-vote, 404 si cible inexistante

---

## 5. Frontend

### 5.1 Nouvelle route

| Route | Composant | Description |
|-------|-----------|-------------|
| `/forum` | ForumListComponent | Liste paginée des topics |
| `/forum/:id` | ForumDetailComponent | Détail topic + commentaires |
| `/forum/new` | ForumNewComponent | Formulaire création topic |
| `/forum/:id/edit` | ForumEditComponent | Formulaire édition topic |

Ajouter l'entrée "Forum" dans la navbar (entre les éléments existants, visible pour tous).

### 5.2 Services Angular

#### ForumService
- `getTopics(page, sort, categoryId?)` → GET /api/topics
- `getTopic(id)` → GET /api/topics/:id
- `createTopic(body)` → POST /api/topics
- `updateTopic(id, body)` → PATCH /api/topics/:id

#### CommentService
- `getComments(topicId, page)` → GET /api/topics/:topicId/comments
- `createComment(topicId, body)` → POST /api/topics/:topicId/comments
- `updateComment(topicId, commentId, body)` → PATCH /api/topics/:topicId/comments/:commentId

#### VoteService
- `vote(targetType, targetId, value)` → POST /api/votes
- Met à jour le score et l'état du vote localement après réponse

#### CategoryService
- `getCategories()` → GET /api/categories
- `createCategory(name)` → POST /api/categories (admin)

### 5.3 Page liste des topics (`/forum`)

**Éléments :**
- **Header** : titre "Forum", bouton "Nouveau topic" (visible si connecté et non suspendu)
- **Filtres** : dropdown catégorie (optionnel), tri (Plus récent / Plus populaire / Plus actif)
- **Liste** : cards ou lignes avec pour chaque topic :
  - Titre (lien vers détail)
  - Extrait du contenu (100 premiers caractères, texte brut sans markdown)
  - Badge catégorie (si définie, sinon rien)
  - Auteur (pseudo)
  - Date de création
  - Score net (avec icône)
  - Nombre de commentaires (avec icône)
- **Pagination** : 20 par page, navigation bas de page

### 5.4 Page détail topic (`/forum/:id`)

**Éléments :**
- **Topic** :
  - Titre
  - Badge catégorie (si définie)
  - Auteur, date, "(modifié)" si isEdited
  - Contenu rendu en markdown (lib `ngx-markdown` ou `marked`)
  - Score net + boutons vote ↑/↓ (masqués si auteur du topic)
  - Bouton "Modifier" (visible si auteur ou admin)
- **Section commentaires** :
  - Textarea pour nouveau commentaire (visible si connecté et non suspendu)
  - Arbre de commentaires paginé :
    - **Desktop** : indentation visuelle sur 3 niveaux (padding-left croissant)
    - **Tablette** : pas d'indentation, tag "en réponse à @pseudo" affiché à la place
    - Chaque commentaire : auteur, date, "(modifié)" si isEdited, contenu markdown, score net + boutons vote (masqués si auteur), bouton "Répondre" (masqué au niveau 3), bouton "Modifier" (si auteur ou admin)
  - Pagination : 20 commentaires racine par page, navigation bas de section

### 5.5 Formulaires

**Création topic (`/forum/new`)** :
- Champ titre : input text, min 5 / max 255 caractères
- Champ catégorie : mat-select optionnel, options chargées depuis GET /api/categories
- Champ contenu : textarea, min 2 / max 2000 caractères, avec preview markdown en temps réel (toggle "Écrire / Aperçu")
- Bouton "Publier" : désactivé tant que la validation échoue
- Validation front : champs non vides (après trim), longueurs min/max, feedback visuel immédiat (messages d'erreur sous les champs)

**Édition topic (`/forum/:id/edit`)** :
- Même formulaire que création, pré-rempli
- Bouton "Enregistrer"

**Commentaire (inline dans le détail topic)** :
- Textarea, min 2 / max 2000 caractères
- Bouton "Commenter" / "Répondre"
- Validation identique

### 5.6 Comportement des votes côté UI

1. Boutons ↑ et ↓ affichés à côté du score
2. **Masqués** si le contenu appartient au user connecté
3. **Masqués** si user non connecté ou suspendu
4. État visuel : bouton actif surligné (↑ en vert si user a voté +1, ↓ en rouge si -1)
5. Clic sur ↑ quand pas voté → +1, score +1
6. Clic sur ↑ quand déjà +1 → annule, score -1
7. Clic sur ↓ quand déjà +1 → bascule -1, score -2
8. Mise à jour optimiste du score côté front, rollback si erreur API

### 5.7 Détection breakpoint tablette

- Utiliser un breakpoint CSS (ex: `max-width: 1024px`) ou `BreakpointObserver` Angular CDK
- En mode tablette : remplacer l'indentation des commentaires par le tag "en réponse à @pseudo"

---

## 6. Validation — Récapitulatif

| Champ | Min | Max | Obligatoire | Trim |
|-------|-----|-----|-------------|------|
| Topic titre | 5 car. | 255 car. | Oui | Oui |
| Topic contenu | 2 car. | 2000 car. | Oui | Oui |
| Topic catégorie | — | — | Non | — |
| Comment contenu | 2 car. | 2000 car. | Oui | Oui |
| Category name | 1 car. | 100 car. | Oui | Oui |
| Vote value | — | — | Oui | — |
| Vote targetType | — | — | Oui (TOPIC/COMMENT) | — |

Toutes les validations sont appliquées côté front (feedback immédiat) ET côté back (sécurité).

---

## 7. Limites & contraintes

| Contrainte | Valeur | Vérification |
|------------|--------|--------------|
| Topics par jour par user | 3 max | Côté serveur, jour calendaire (minuit à minuit) |
| Profondeur commentaires | 3 niveaux max | Côté serveur, calcul de profondeur par remontée parentId |
| Longueur contenu | 2000 car. | Front + back |
| Longueur titre | 255 car. | Front + back |
| Pas d'auto-vote | userId != auteur | Côté serveur, bouton masqué côté front |
| Un vote par cible | unique(userId, targetType, targetId) | Contrainte DB |

---

## 8. Markdown — Règles de rendu

- **Autorisé** : gras (`**`), italique (`*`), listes (`-`, `1.`), liens (`[text](url)`)
- **Interdit** : images, HTML brut, code blocks (optionnel : à activer si pertinent)
- **Sanitization** : tout HTML brut échappé côté rendu pour éviter XSS
- **Lib suggérée** : `ngx-markdown` ou `marked` + DOMPurify

---

## 9. Modules backend

| Module | Contenu |
|--------|---------|
| `CategoryModule` | CategoryController, CategoryService |
| `TopicModule` | TopicController, TopicService |
| `CommentModule` | CommentController, CommentService |
| `VoteModule` | VoteController, VoteService |

Tous importés dans `AppModule`.

---

## 10. Prérequis & dépendances

- **SPEC_001** : modèle User (id, rôle, suspension), JwtAuthGuard, RolesGuard
- **SPEC_003** : navbar frontend, routing Angular
- **SPEC_004** : AuthService frontend (token, user connecté, rôle)
- **Nouvelles dépendances npm** :
  - Backend : aucune (Prisma + NestJS suffisent)
  - Frontend : `ngx-markdown` (ou `marked` + `DOMPurify`)
