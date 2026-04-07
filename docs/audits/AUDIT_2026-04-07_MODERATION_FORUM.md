# AUDIT — Modération Forum (SPEC_007)

**Date** : 2026-04-07  
**Feature** : UC13 (soft delete), UC14 (hard delete), fermeture topic, notifications in-app

---

## 1. Conformité architecture

| Composant | Statut | Notes |
|-----------|--------|-------|
| Prisma schema (status, isClosed, Notification) | ✅ | Tous les champs ajoutés |
| Migration SQL | ✅ | 20260407200000_moderation |
| NotificationModule (service + controller) | ✅ | Exporté pour injection |
| TopicService modération | ✅ | 5 méthodes ajoutées |
| CommentService modération | ✅ | 4 méthodes ajoutées |
| Frontend models | ✅ | status, isClosed, Notification |
| Frontend services (forum, comment, notification) | ✅ | Tous les appels API ajoutés |
| NotificationModal bloquante | ✅ | Overlay + bouton OK obligatoire |
| AppComponent check notifications | ✅ | À la connexion |

---

## 2. Qualité du code

- **Séparation des responsabilités** : NotificationService injecté dans TopicService et CommentService — pas de duplication de logique de notification
- **Sécurité raison** : la raison admin dans forum-detail utilise des états séparés (`adminTopicReason` vs `adminCommentReasonMap`) — risque de collision éliminé (correction reviewer)
- **Cascade delete** : hard delete topic récupère les `userId` des commentaires AVANT la suppression physique pour créer les notifications
- **Cron TTL** : `CronExpression.EVERY_DAY_AT_MIDNIGHT` — nettoyage automatique 7j

---

## 3. Couverture de tests

| Suite | Tests | Résultat |
|-------|-------|---------|
| topic.service.spec.ts | 15 | ✅ Tous passent |
| comment.service.spec.ts | 16 | ✅ Tous passent |
| notification.service.spec.ts | 9 | ✅ Tous passent |
| **Total** | **40** | **✅ 40/40** |

Cas couverts : soft delete, hard delete, fermeture, rouverture, ownership enforcement, closed topic block, notifications avec/sans raison, TTL cron, markAsRead wrong user.

---

## 4. Sécurité

- OWASP A01 (Access Control) : ✅ Guards admin sur tous les endpoints sensibles
- OWASP A03 (Injection) : ✅ Prisma ORM uniquement
- OWASP A07 (Auth) : ✅ JWT obligatoire sur toutes les routes protégées
- CSRF : ✅ Bearer token — pas de vulnérabilité CSRF

---

## 5. Décisions techniques

| Décision | Justification |
|----------|--------------|
| `status` field (visible/hidden) plutôt que `deletedAt` | `deletedAt` existant mais non utilisé — évite la confusion entre "soft modération" et "suppression logique" |
| NotificationService exporté depuis NotificationModule | Injection propre dans TopicModule et CommentModule sans couplage circulaire |
| Hard delete physique (non `deletedAt`) | Spec explicite : irréversible, invisible même admin |
| `adminCommentReasonMap` (Map) au lieu d'un string partagé | Un état par commentaire — évite les collisions quand plusieurs commentaires visibles simultanément |
| Notifications collectées AVANT delete cascade | La suppression physique efface les commentaires — impossible de récupérer les userId après |

---

## 6. Points hors scope respectés

- Pas de page admin dédiée
- Pas de notifications email
- Pas d'historique de modération
- Pas de bouton "signaler"
