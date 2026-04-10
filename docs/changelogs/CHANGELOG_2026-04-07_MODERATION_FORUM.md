# CHANGELOG — Modération Forum (UC13/UC14)

**Date** : 2026-04-07  
**Commit** : `feat(forum): implement moderation, topic closure and in-app notifications`  
**Spec source** : `docs/spec/SPEC_007_MODERATION_FORUM.md`

---

## Feature implémentée

Système complet de modération du forum :
- **UC13** : Soft delete (masquage réversible) par l'admin, avec raison optionnelle
- **UC14** : Hard delete (suppression physique) par l'admin, avec cascade et modale de confirmation
- **Fermeture de topic** : par le créateur ou l'admin, avec badge visible et blocage des commentaires
- **Auto-modération** : le créateur peut soft-supprimer ses propres commentaires
- **Notifications in-app** : modale bloquante au prochain login, TTL 7 jours, cron de nettoyage

---

## Fichiers créés

| Fichier | Description |
|---------|-------------|
| `prisma/migrations/20260407200000_moderation/migration.sql` | Migration : ajout status/isClosed sur Topic et Comment, création table Notification |
| `src/notification/notification.service.ts` | Service : create, getUnread, markAsRead, cleanOld (Cron) |
| `src/notification/notification.controller.ts` | GET /notifications, PATCH /notifications/:id/read |
| `src/notification/notification.module.ts` | Module NestJS, exporte NotificationService |
| `src/notification/notification.service.spec.ts` | 9 tests unitaires (create, getUnread, markAsRead, cleanOld) |
| `frontend/src/app/core/services/notification.service.ts` | Service Angular : getUnread, markAsRead |
| `frontend/src/app/shared/components/notification-modal/notification-modal.component.ts` | Composant modal bloquante |
| `frontend/src/app/shared/components/notification-modal/notification-modal.component.html` | Template overlay + bouton OK |
| `frontend/src/app/shared/components/notification-modal/notification-modal.component.scss` | Styles overlay |
| `docs/spec/SPEC_007_MODERATION_FORUM.md` | Spec complète (générée par spec-pipeline) |
| `docs/audits/AUDIT_2026-04-07_MODERATION_FORUM.md` | Rapport d'audit |

## Fichiers modifiés

| Fichier | Modifications |
|---------|--------------|
| `prisma/schema.prisma` | +status/isClosed sur Topic, +status sur Comment, +Notification model, +User.notifications relation |
| `src/app.module.ts` | Import NotificationModule |
| `src/topic/topic.service.ts` | +NotificationService injection, +hideTopic, showTopic, deleteTopic, closeTopic, reopenTopic, update findAll/findOne pour filtrer status et isClosed |
| `src/topic/topic.controller.ts` | +PATCH hide/show/close/reopen, +DELETE (admin), ModerateBodyDto |
| `src/topic/topic.module.ts` | Import NotificationModule |
| `src/topic/topic.service.spec.ts` | +NotificationService mock, +15 tests modération |
| `src/comment/comment.service.ts` | +NotificationService injection, +hideComment, showComment, deleteComment, selfDeleteComment, isClosed check dans create, isAdmin filter dans findAll |
| `src/comment/comment.controller.ts` | +PATCH hide/show, +DELETE (admin), +DELETE self (creator), ModerateBodyDto |
| `src/comment/comment.module.ts` | Import NotificationModule |
| `src/comment/comment.service.spec.ts` | +NotificationService mock, +16 tests modération |
| `frontend/src/app/core/models/forum.models.ts` | +status, isClosed sur TopicSummary/TopicDetail, +status sur CommentNode, +Notification interface, +ModerateBody |
| `frontend/src/app/core/services/api.service.ts` | Ajout body optionnel sur delete() |
| `frontend/src/app/core/services/forum.service.ts` | +hideTopic, showTopic, deleteTopic, closeTopic, reopenTopic |
| `frontend/src/app/core/services/comment.service.ts` | +hideComment, showComment, deleteComment, selfDeleteComment |
| `frontend/src/app/app.component.ts` | Injection AuthService + NotificationService, check notifications au login |
| `frontend/src/app/app.component.html` | Ajout `<app-notification-modal>` |
| `frontend/src/app/pages/forum/forum-list/forum-list.component.ts` | +isAdmin() |
| `frontend/src/app/pages/forum/forum-list/forum-list.component.html` | +badges Fermé/Masqué, +classe topic-hidden |
| `frontend/src/app/pages/forum/forum-list/forum-list.component.scss` | +styles closed-badge, hidden-badge, topic-hidden |
| `frontend/src/app/pages/forum/forum-detail/forum-detail.component.ts` | Refonte modération : 10 méthodes ajoutées, gestion état confirmDelete, adminTopicReason, adminCommentReasonMap |
| `frontend/src/app/pages/forum/forum-detail/forum-detail.component.html` | Boutons admin/créateur contextuels, modale de confirmation, reason selector, badge Fermé, notice topic fermé, styles hidden |
| `frontend/src/app/pages/forum/forum-detail/forum-detail.component.scss` | +styles closed/hidden badges, confirm modal, reason-field, comment-reason-select |

---

## Architecture mise en place

```
src/notification/           ← Module indépendant, exporté
frontend/notification-modal ← Composant standalone, intégré dans AppComponent
```

Injection : `NotificationModule` → importé dans `TopicModule`, `CommentModule`, `AppModule`.

---

## Tests ajoutés

- **40 nouveaux tests** (15 topic, 16 comment, 9 notification)
- **103 tests totaux** — 0 régression

---

## Sécurité

- Aucune vulnérabilité détectée
- Tous endpoints admin protégés par `JwtAuthGuard + RolesGuard + @Roles(Role.ADMIN)`
- Ownership vérifié côté service (pas uniquement côté guard)

---

## Décisions techniques

| Décision | Justification |
|----------|--------------|
| Champ `status` distinct de `deletedAt` | `deletedAt` = suppression logique existante, `status` = masquage modération — sémantiques différentes |
| Notifications créées AVANT hard delete cascade | Les commentaires sont supprimés par cascade → `userId` inaccessibles après |
| `adminCommentReasonMap` (Map<id, string>) | Évite les collisions d'état quand plusieurs commentaires sont visibles simultanément |
| Cron `EVERY_DAY_AT_MIDNIGHT` pour TTL | Nettoyage nocturne — impact minimal sur les performances |
