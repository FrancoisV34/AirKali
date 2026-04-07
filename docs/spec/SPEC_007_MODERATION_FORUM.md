# SPEC_007 — Modération Forum

**Version** : 1.0  
**Date** : 2026-04-07  
**UC couverts** : UC13 (soft delete / masquage), UC14 (suppression définitive admin)  
**Dépendances** : SPEC_006 (Forum), SPEC_001 (Auth / rôles)

---

## 1. Contexte et objectif

Le forum dispose de topics et de commentaires créés par les utilisateurs. Il est nécessaire de permettre à l'administration de modérer les contenus inappropriés, et aux créateurs de gérer leur propre contenu. Cette spec couvre l'ensemble des actions de modération : masquage réversible, suppression définitive, fermeture de topic, et notification in-app des auteurs.

---

## 2. Acteurs et permissions

| Acteur | Permissions |
|--------|-------------|
| **Admin** | Masquer/restaurer tout message, supprimer définitivement tout message, fermer/rouvrir tout topic |
| **Créateur de topic** | Fermer/rouvrir son propre topic, supprimer ses propres commentaires (soft delete) |
| **Créateur de commentaire** | Supprimer son propre commentaire (soft delete) |
| **Utilisateur lambda** | Aucune action de modération |

---

## 3. Modèle de données

### 3.1 Statuts message (topic ou commentaire)

Le champ `status` sur les entités `Topic` et `Comment` (déjà existantes en SPEC_006) prend les valeurs :

| Valeur | Description |
|--------|-------------|
| `visible` | État normal, visible par tous |
| `hidden` | Soft-deleted, visible uniquement par l'admin (fond grisé) |

Le **hard delete** est une suppression physique en base de données (pas de statut).

### 3.2 Statuts topic

Le champ `isClosed` (boolean) sur l'entité `Topic` :

| Valeur | Description |
|--------|-------------|
| `false` | Topic ouvert, commentaires autorisés |
| `true` | Topic fermé, lecture seule |

### 3.3 Table `Notification`

Nouvelle table à créer :

```
Notification {
  id         Int       @id @default(autoincrement())
  userId     Int                          // destinataire
  message    String                       // texte affiché dans la modale
  reason     String?                      // raison (nullable si non sélectionnée)
  readAt     DateTime?                    // null = non lue
  createdAt  DateTime  @default(now())
}
```

**TTL** : suppression automatique des notifications après 7 jours (cron quotidien).

---

## 4. UC13 — Soft delete (masquage)

### 4.1 Masquage par l'admin

**Déclencheur** : Admin clique "Masquer" sur un topic ou commentaire visible.

**Comportement backend** :
- `status` passe de `visible` à `hidden`
- Création d'une `Notification` pour l'auteur du message

**Comportement frontend** :
- Le message disparaît de la vue des utilisateurs lambda (aucun placeholder)
- Pour l'admin : le message reste affiché avec un fond grisé, le bouton "Masquer" est remplacé par "Rendre visible"

**Raison** (sélection facultative dans l'UI) :
- `spam`
- `contenu inapproprié`
- `hors sujet`

Si aucune raison sélectionnée → notification envoyée avec message générique.

### 4.2 Restauration par l'admin

**Déclencheur** : Admin clique "Rendre visible" sur un message grisé.

**Comportement** :
- `status` repasse à `visible`
- Message réapparaît pour tous les utilisateurs
- Aucune notification envoyée

### 4.3 Soft delete par le créateur (son propre commentaire)

**Déclencheur** : Créateur clique "Supprimer" sur son propre commentaire → modale "Êtes-vous sûr ?" (Oui / Non).

**Comportement** :
- Identique au soft delete admin : `status` → `hidden`
- Invisible pour tous les users
- Visible pour l'admin en grisé (indéfiniment, sans délai d'expiration automatique)
- Aucune raison demandée au créateur
- Aucune notification envoyée (action sur son propre contenu)
- L'admin peut restaurer ce commentaire comme tout autre message masqué

---

## 5. UC14 — Hard delete (suppression définitive)

### 5.1 Suppression par l'admin

**Déclencheur** : Admin clique "Supprimer" sur un topic ou commentaire.

**Confirmation** : Modale "Êtes-vous sûr de supprimer ce contenu ?" avec boutons **Oui** / **Non**.

**Comportement backend** :
- **Si commentaire** : suppression physique du commentaire en BDD
- **Si topic** : suppression physique en cascade du topic ET de tous ses commentaires
- Création d'une `Notification` pour l'auteur (et pour chaque auteur de commentaire si topic supprimé en cascade)

**Comportement frontend** :
- Le contenu disparaît immédiatement pour tous, y compris l'admin
- Irréversible

**Raison** (sélection facultative, même liste que UC13) :
- Si raison sélectionnée → affichée dans la notification
- Si aucune raison → message : "Votre contenu a été supprimé par un admin"

---

## 6. Fermeture de topic

### 6.1 Fermeture

**Déclencheurs** :
- Créateur clique "Fermer" sur son propre topic
- Admin clique "Fermer" sur n'importe quel topic

**Comportement** :
- `isClosed` passe à `true`
- Les commentaires existants restent lisibles
- La saisie de nouveaux commentaires est désactivée (champ grisé + message "Topic fermé")
- Badge "Fermé" visible dans la liste des topics ET dans le détail du topic

### 6.2 Réouverture

**Déclencheurs** :
- Créateur clique "Rouvrir" sur son propre topic
- Admin clique "Rouvrir" sur n'importe quel topic

**Comportement** :
- `isClosed` repasse à `false`
- Les commentaires sont de nouveau autorisés
- Badge "Fermé" disparaît

---

## 7. Système de notifications in-app

### 7.1 Stockage

- Une notification est créée en BDD à chaque action de masquage ou suppression admin
- Champs : `userId` (auteur du contenu), `message` (texte affiché), `reason` (nullable), `readAt` (null si non lue), `createdAt`

### 7.2 Affichage

- Déclenchement : à chaque connexion de l'utilisateur, le backend vérifie l'existence de notifications non lues (`readAt IS NULL`)
- Si notification(s) non lue(s) : affichage d'une **modale bloquante** (non fermable autrement que par le bouton)
- Contenu de la modale :
  - Titre : "Un message vous a été adressé"
  - Corps : message de la notification + raison si présente
  - Bouton : "OK" (obligatoire pour fermer)
- Au clic "OK" : `readAt` mis à jour avec la date/heure courante

### 7.3 Suppression automatique

- Cron quotidien : suppression des notifications dont `createdAt < now() - 7 jours`

### 7.4 Messages de notification

| Action | Raison présente | Message affiché |
|--------|----------------|-----------------|
| Masquage admin | Oui | "Votre contenu a été masqué par un admin. Raison : [raison]" |
| Masquage admin | Non | "Votre contenu a été masqué par un admin" |
| Suppression admin | Oui | "Votre contenu a été supprimé par un admin. Raison : [raison]" |
| Suppression admin | Non | "Votre contenu a été supprimé par un admin" |

---

## 8. Interface utilisateur

### 8.1 Boutons contextuels — Vue admin

Visibles uniquement lorsque l'utilisateur connecté a le rôle `admin`.

**Sur chaque topic :**
| Bouton | Condition d'affichage | Action |
|--------|----------------------|--------|
| "Masquer" | `status === 'visible'` | Soft delete + notif |
| "Rendre visible" | `status === 'hidden'` | Restauration |
| "Supprimer" | Toujours | Hard delete + modale |
| "Fermer" | `isClosed === false` | Fermeture topic |
| "Rouvrir" | `isClosed === true` | Réouverture topic |

**Sur chaque commentaire :**
| Bouton | Condition d'affichage | Action |
|--------|----------------------|--------|
| "Masquer" | `status === 'visible'` | Soft delete + notif |
| "Rendre visible" | `status === 'hidden'` | Restauration |
| "Supprimer" | Toujours | Hard delete + modale |

### 8.2 Boutons contextuels — Vue créateur

Visibles uniquement sur le propre contenu de l'utilisateur connecté.

**Sur son topic :**
| Bouton | Condition d'affichage | Action |
|--------|----------------------|--------|
| "Fermer" | `isClosed === false` | Fermeture topic |
| "Rouvrir" | `isClosed === true` | Réouverture topic |

**Sur son commentaire :**
| Bouton | Condition d'affichage | Action |
|--------|----------------------|--------|
| "Supprimer" | `status === 'visible'` | Soft delete + modale confirmation |

### 8.3 Affichage des messages masqués

- Messages avec `status === 'hidden'` : **invisibles** pour tous les utilisateurs lambda
- Pour l'admin : affichés avec un **fond grisé** distinctif
- Aucun placeholder ni texte de remplacement côté utilisateur

### 8.4 Affichage du badge "Fermé"

- Badge visible dans la **liste des topics** et dans la **vue détail** du topic
- Champ de saisie de commentaire désactivé avec message "Topic fermé"

---

## 9. API Backend — Endpoints

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `PATCH` | `/forum/topics/:id/hide` | Admin | Masquer un topic |
| `PATCH` | `/forum/topics/:id/show` | Admin | Restaurer un topic masqué |
| `DELETE` | `/forum/topics/:id` | Admin | Hard delete topic + cascade |
| `PATCH` | `/forum/topics/:id/close` | Admin + Créateur | Fermer un topic |
| `PATCH` | `/forum/topics/:id/reopen` | Admin + Créateur | Rouvrir un topic |
| `PATCH` | `/forum/comments/:id/hide` | Admin | Masquer un commentaire |
| `PATCH` | `/forum/comments/:id/show` | Admin | Restaurer un commentaire masqué |
| `DELETE` | `/forum/comments/:id` | Admin | Hard delete commentaire |
| `DELETE` | `/forum/comments/:id/self` | Créateur | Soft delete son propre commentaire |
| `GET` | `/notifications` | Authentifié | Récupérer les notifs non lues |
| `PATCH` | `/notifications/:id/read` | Authentifié | Marquer une notif comme lue |

---

## 10. Règles métier

1. Un message `hidden` est exclu de toutes les requêtes de listing sauf pour l'admin
2. La suppression physique d'un topic entraîne la suppression physique de tous ses commentaires (cascade BDD)
3. Un topic `closed` refuse tout nouveau commentaire (validation backend, pas seulement frontend)
4. La raison est facultative lors du masquage/suppression admin
5. Une notification est toujours créée lors d'un masquage ou hard delete admin, même sans raison
6. Le créateur ne reçoit pas de notification quand il supprime son propre contenu
7. Les notifications expirent automatiquement après 7 jours
8. Un seul admin ou créateur peut fermer/rouvrir un topic (pas de conflit à gérer, last write wins)

---

## 11. Hors scope

- Page d'administration dédiée (pas dans cette spec)
- Notifications email (couvert par UC16 / SPEC future)
- Historique des actions de modération (audit log)
- Modération des votes
- Signalement de contenu par les utilisateurs (pas de bouton "signaler")
