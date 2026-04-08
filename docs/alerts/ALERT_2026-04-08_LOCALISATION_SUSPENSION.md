# ALERT — 2026-04-08 — LOCALISATION_SUSPENSION

**Sévérité** : HAUTE  
**Feature** : UC12 — Localisation utilisateur  

---

## Problèmes détectés

### 1. [HAUTE] DTO `UpdateCommuneDto` — null non géré par class-validator

**Fichier** : `src/user/dto/update-commune.dto.ts`  
**Description** : Le champ `communeId` est typé `number | null` mais class-validator's `@IsInt()` rejette `null` (seul `undefined` est ignoré par `@IsOptional()`). Envoyer `{ communeId: null }` depuis le frontend déclenche une erreur 400 Bad Request non désirée.  
**Recommandation** : Ajouter `@ValidateIf((o) => o.communeId !== null)` avant `@IsInt()`.

### 2. [MOYENNE] Timing ViewChild dans `RechercheComponent._centerOnUserCommune()`

**Fichier** : `frontend/src/app/pages/recherche/recherche.component.ts`  
**Description** : `_centerOnUserCommune()` est appelé dans `isLoggedIn$.subscribe()` pendant `ngOnInit()`. À ce stade, le ViewChild `mapComponent` peut ne pas être initialisé. L'appel `mapComponent?.centerOn(...)` dans le setTimeout est sécurisé grâce à l'opérateur `?.`, mais l'API call est inutile si le composant n'est pas prêt.  
**Recommandation** : Acceptable pour l'instant (pattern cohérent avec l'existant). Surveiller en cas de régression.

---

## Correction appliquée

Le problème HAUTE est corrigé dans la passe de correction codeur ci-dessous.
