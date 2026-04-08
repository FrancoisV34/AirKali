# AUDIT — 2026-04-08 — UC12 Localisation utilisateur

## 1. Cohérence avec l'architecture

✅ Architecture respectée : CommuneModule étendu (findByCodePostal), UserModule étendu (updateCommune), frontend via services découplés.  
✅ Pattern Repository via PrismaService cohérent avec le reste du projet.  
✅ Pas de logique métier dans les contrôleurs.

## 2. Respect du plan

✅ Toutes les étapes du plan exécutées.  
✅ Endpoint `GET /communes/par-code-postal` implémenté et ordonné avant `/:id`.  
✅ `PATCH /user/commune` gère les 3 cas (nouvelle commune, remplacement, suppression).  
✅ Favori auto-ajouté sans doublon (findUnique avant create).  
✅ Ancien favori retiré lors du changement de commune.  
⚠️ `_centerOnUserCommune()` dans RechercheComponent : appel à `getCurrentUser()` redondant. Acceptable (pattern existant dans le projet).

## 3. Qualité du code

✅ Méthode privée `_activateCommune` réutilisable dans UserService.  
✅ DTOs avec validation class-validator.  
✅ Null géré correctement via `@ValidateIf`.  
⚠️ `MatListModule` importé inutilement dans ProfilComponent (BASSE).

## 4. Sécurité

✅ Aucune vulnérabilité détectée (voir rapport ETAPE 8).

## 5. Tests

✅ 26 tests unitaires couvrent tous les cas nominaux, limites et erreurs.  
✅ Couverture : findByCodePostal (5 tests), updateCommune (7 tests), getProfile (3 tests), updateProfile (5 tests).

## 6. Décisions techniques

- **Upsert favori via findUnique + create** (vs prisma upsert) : cohérent avec le reste du FavoriteService qui évite aussi les conflits avec des erreurs explicites.
- **Activation commune dupliquée dans UserService** (_activateCommune) : évite la dépendance circulaire FavoriteModule ↔ UserModule.
- **adressePostale nullifiée lors de la suppression de commune** : logique — le code postal est lié à la commune de référence.

## Verdict

**PASS** — Feature UC12 conforme à la spec. Aucun problème bloquant.
