# CHANGELOG — Forum communautaire (SPEC_006)
**Date** : 2026-04-06  
**Commit** : `feat(forum): implement community forum with topics, comments, votes and categories`

---

## Feature implémentée

Forum communautaire global accessible via `/forum`. Gestion des topics, commentaires arborescents (3 niveaux), votes (+1/-1), et catégories. Accès lecture pour tous, écriture pour les utilisateurs connectés non suspendus, modération réservée à l'admin.

---

## Fichiers créés / modifiés

### Backend (NestJS)

| Fichier | Action | Description |
|---------|--------|-------------|
| `prisma/schema.prisma` | Modifié | Ajout des modèles Category, Topic, Comment, Vote + relations User |
| `prisma/migrations/20260406_forum/migration.sql` | Créé | Migration SQL : création des 4 tables + FK + seed catégories |
| `src/app.module.ts` | Modifié | Import des 4 nouveaux modules |
| `src/category/category.module.ts` | Créé | Module CategoryModule |
| `src/category/category.controller.ts` | Créé | GET /api/categories, POST /api/categories (admin) |
| `src/category/category.service.ts` | Créé | Logique CRUD catégories |
| `src/category/category.service.spec.ts` | Créé | Tests unitaires (3 tests) |
| `src/category/dto/create-category.dto.ts` | Créé | Validation name (1-100 car.) |
| `src/topic/topic.module.ts` | Créé | Module TopicModule |
| `src/topic/topic.controller.ts` | Créé | GET/POST/PATCH /api/topics, GET /api/topics/:id |
| `src/topic/topic.service.ts` | Créé | Logique CRUD topics, tri, score, vérifications métier |
| `src/topic/topic.service.spec.ts` | Créé | Tests unitaires (8 tests) |
| `src/topic/dto/create-topic.dto.ts` | Créé | Validation title (5-255), content (2-2000), categoryId |
| `src/topic/dto/update-topic.dto.ts` | Créé | Idem partiel |
| `src/comment/comment.module.ts` | Créé | Module CommentModule |
| `src/comment/comment.controller.ts` | Créé | GET/POST/PATCH /api/topics/:topicId/comments |
| `src/comment/comment.service.ts` | Créé | Logique commentaires arborescents, calcul profondeur |
| `src/comment/comment.service.spec.ts` | Créé | Tests unitaires (8 tests) |
| `src/comment/dto/create-comment.dto.ts` | Créé | Validation content (2-2000), parentId |
| `src/comment/dto/update-comment.dto.ts` | Créé | Validation content (2-2000) |
| `src/vote/vote.module.ts` | Créé | Module VoteModule |
| `src/vote/vote.controller.ts` | Créé | POST /api/votes |
| `src/vote/vote.service.ts` | Créé | Logique vote toggle/flip/annulation |
| `src/vote/vote.service.spec.ts` | Créé | Tests unitaires (7 tests) |
| `src/vote/dto/create-vote.dto.ts` | Créé | Validation targetType, targetId, value (+1/-1) |

### Frontend (Angular 17)

| Fichier | Action | Description |
|---------|--------|-------------|
| `frontend/package.json` | Modifié | Ajout de `marked` et `dompurify` |
| `frontend/src/app/app.routes.ts` | Modifié | Routes /forum, /forum/new, /forum/:id/edit, /forum/:id |
| `frontend/src/app/core/services/auth.service.ts` | Modifié | Ajout getUserId(), getUserRole(), getTokenPayload() + estSuspendu dans UserProfile |
| `frontend/src/app/core/models/forum.models.ts` | Créé | Interfaces TypeScript (Category, Topic, Comment, Vote...) |
| `frontend/src/app/core/services/forum.service.ts` | Créé | getTopics, getTopic, createTopic, updateTopic |
| `frontend/src/app/core/services/comment.service.ts` | Créé | getComments, createComment, updateComment |
| `frontend/src/app/core/services/vote.service.ts` | Créé | vote() |
| `frontend/src/app/core/services/category.service.ts` | Créé | getCategories, createCategory |
| `frontend/src/app/shared/pipes/safe-markdown.pipe.ts` | Créé | Pipe markdown sécurisé (marked + DOMPurify) |
| `frontend/src/app/pages/forum/forum-list/*` | Créé | Liste paginée des topics avec filtres catégorie/tri |
| `frontend/src/app/pages/forum/forum-detail/*` | Créé | Détail topic + arbre commentaires récursif + votes |
| `frontend/src/app/pages/forum/forum-new/*` | Créé | Formulaire création topic avec preview markdown |
| `frontend/src/app/pages/forum/forum-edit/*` | Créé | Formulaire édition topic pré-rempli |

### Documentation

| Fichier | Action | Description |
|---------|--------|-------------|
| `docs/audits/AUDIT_2026-04-06_FORUM.md` | Créé | Rapport d'audit complet |
| `docs/spec/SPEC_006_FORUM.md` | Ajouté au repo | Spec source |

---

## Architecture mise en place

```
Backend :
  CategoryModule → GET /api/categories, POST /api/categories [Admin]
  TopicModule    → GET /api/topics, GET /api/topics/:id, POST, PATCH /api/topics/:id
  CommentModule  → GET/POST/PATCH /api/topics/:topicId/comments[/:id]
  VoteModule     → POST /api/votes

Frontend :
  /forum         → ForumListComponent (liste paginée, filtres)
  /forum/new     → ForumNewComponent (formulaire + preview markdown)
  /forum/:id     → ForumDetailComponent (détail + commentaires + votes)
  /forum/:id/edit → ForumEditComponent (édition pré-remplie)
```

---

## Tests ajoutés

- 26 nouveaux tests unitaires (category: 3, topic: 8, comment: 8, vote: 7)
- Total suite : 79/79 tests passés

---

## Findings de sécurité

| Risque | Mitigation |
|--------|-----------|
| XSS via markdown | DOMPurify avec whitelist HTML stricte |
| Auto-vote | Vérification côté serveur (403) + masquage UI |
| Rate abuse (topics) | 3 topics/jour par user, vérification en base |
| Accès non autorisé | JwtAuthGuard + vérification auteur/admin en service |
| Suspension bypass | Vérification `estSuspendu` en base, non dans le JWT |

---

## Décisions techniques

1. **Markdown** : `marked` + `DOMPurify` plutôt que `ngx-markdown` (plus léger, contrôle total de la sanitization)
2. **Vote optimiste** : mise à jour UI immédiate avec rollback en cas d'erreur API (meilleure UX)
3. **Score tri "popular"** : tri post-pagination sur les topics récupérés (simple, acceptable pour les volumes attendus)
4. **Arbre commentaires** : `ngTemplateOutlet` récursif en Angular, chargé en un seul appel API (pas de lazy loading par niveau)
5. **Migration SQL manuelle** : fichier créé dans `prisma/migrations/` — à appliquer avec `prisma migrate deploy` ou `prisma db execute`
