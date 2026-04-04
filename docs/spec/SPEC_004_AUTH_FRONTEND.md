# SPEC_004 — Authentification Frontend + Profil

| Champ | Valeur |
|-------|--------|
| **ID** | SPEC_004 |
| **Titre** | Auth Frontend — Login, Register, Déconnexion, Profil |
| **Date** | 2026-04-04 |
| **Statut** | Validée |
| **Priorité** | Haute |
| **Dépendance** | SPEC_001 (backend auth), SPEC_003 (frontend base) |

---

## 1. Objectif

Implémenter l'authentification complète côté frontend : pages login et register fonctionnelles connectées au backend, déconnexion, page profil avec modification des informations, header dynamique selon l'état de connexion, guard pour routes protégées, intercepteur HTTP pour le JWT.

Ajouter un endpoint backend `PATCH /api/user/profile` pour la modification du profil.

---

## 2. Pages

### 2.1 Register — `/inscription`

**Champs du formulaire :**

| Champ | Type | Validation | Obligatoire |
|-------|------|-----------|-------------|
| Email | email | Format email valide | Oui |
| Username | text | Non vide | Oui |
| Nom | text | Non vide | Oui |
| Prénom | text | Non vide | Oui |
| Mot de passe | password | Min 6 caractères | Oui |
| Confirmer mot de passe | password | Doit correspondre au mot de passe | Oui |

**Indicateur de robustesse du mot de passe :**
- Affiché dynamiquement sous le champ mot de passe
- Informatif uniquement (pas bloquant)
- Niveaux visuels : faible (rouge), moyen (orange), fort (vert)
- Critères évalués : longueur, majuscule, chiffre, caractère spécial

**Comportement :**
1. L'utilisateur remplit le formulaire
2. Validation front avant envoi (tous champs requis, email format, password match, min 6 chars)
3. `POST /api/auth/register` avec `{ email, username, nom, prenom, password }`
4. Succès (201) → stocker `access_token` dans localStorage → rediriger vers `/`
5. Erreur 409 → afficher "Email déjà utilisé" ou "Username déjà utilisé"
6. Erreur 400 → afficher les erreurs de validation

**Lien :** "Déjà un compte ? Se connecter" → lien vers `/connexion`

### 2.2 Login — `/connexion`

**Champs du formulaire :**

| Champ | Type | Validation | Obligatoire |
|-------|------|-----------|-------------|
| Email | email | Format email valide | Oui |
| Mot de passe | password | Non vide | Oui |

**Comportement :**
1. L'utilisateur remplit le formulaire
2. Validation front avant envoi
3. `POST /api/auth/login` avec `{ email, password }`
4. Succès (200) → stocker `access_token` dans localStorage → rediriger vers `/`
5. Erreur 401 → afficher "Email ou mot de passe incorrect"
6. Erreur 403 → afficher "Votre compte a été suspendu. Contactez un administrateur."

**Lien :** "Pas encore de compte ? S'inscrire" → lien vers `/inscription`

### 2.3 Profil — `/profil` (route protégée)

**Affichage :**
- Charge le profil via `GET /api/user/profile`
- Affiche toutes les infos dans un formulaire pré-rempli

**Champs modifiables :**

| Champ | Type | Validation | Obligatoire |
|-------|------|-----------|-------------|
| Nom | text | Non vide | Oui |
| Prénom | text | Non vide | Oui |
| Username | text | Non vide | Oui |
| Email | email | Format email valide | Oui |
| Adresse postale | text | — | Non |

**Champs non modifiables (affichés en lecture seule) :**
- Rôle
- Date de création du compte

**Comportement :**
1. Au chargement : `GET /api/user/profile` → pré-remplir le formulaire
2. L'utilisateur modifie les champs
3. Bouton "Sauvegarder" → `PATCH /api/user/profile` avec les champs modifiés
4. Succès → message de confirmation "Profil mis à jour"
5. Erreur 409 → "Email ou username déjà utilisé"

### 2.4 Déconnexion

- Pas de page dédiée
- Action déclenchée par le bouton "Déconnexion" dans le header
- Supprime le JWT du localStorage
- Redirige vers `/`
- Le header revient à l'état non connecté

---

## 3. Header dynamique

### 3.1 État non connecté

| Élément | Position | Action |
|---------|----------|--------|
| Logo "Breath for All" | Gauche | Lien vers `/` |
| Bouton Accueil (`home`) | Droite | Lien vers `/` |
| Bouton Forum (`forum`) | Droite | Lien vers `/forum` |
| Bouton Recherche (`search`) | Droite | Lien vers `/recherche` |
| Bouton Connexion (`login`) | Droite | Lien vers `/connexion` |

### 3.2 État connecté

| Élément | Position | Action |
|---------|----------|--------|
| Logo "Breath for All" | Gauche | Lien vers `/` |
| Bouton Accueil (`home`) | Droite | Lien vers `/` |
| Bouton Forum (`forum`) | Droite | Lien vers `/forum` |
| Bouton Recherche (`search`) | Droite | Lien vers `/recherche` |
| Bouton Mon profil (`person`) | Droite | Lien vers `/profil` |
| Bouton Déconnexion (`logout`) | Droite | Appelle AuthService.logout() |

---

## 4. Services Angular

### 4.1 AuthService

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  register(data: RegisterData): Observable<void>   // POST /api/auth/register → store token
  login(data: LoginData): Observable<void>          // POST /api/auth/login → store token
  logout(): void                                    // Remove token → redirect /
  isAuthenticated(): boolean                        // Check token exists and not expired
  getToken(): string | null                         // Get token from localStorage
  getCurrentUser(): Observable<UserProfile>          // GET /api/user/profile
  updateProfile(data: UpdateProfileData): Observable<UserProfile>  // PATCH /api/user/profile
}
```

**Stockage JWT :**
- Clé localStorage : `access_token`
- Le token JWT contient `exp` — vérifier côté client si expiré via décodage du payload (sans librairie, juste `atob` sur la partie payload)

### 4.2 AuthGuard

- Vérifie `AuthService.isAuthenticated()`
- Si non authentifié → redirige vers `/connexion`
- Appliqué sur la route `/profil`

### 4.3 AuthInterceptor

- Intercepte toutes les requêtes HTTP
- Si un token existe dans localStorage → ajoute le header `Authorization: Bearer <token>`
- Si la réponse est 401 → appelle `AuthService.logout()` (token expiré)

---

## 5. Routing mis à jour

| Route | Composant | Guard | Description |
|-------|-----------|-------|-------------|
| `/` | HomeComponent | — | Page d'accueil |
| `/forum` | ForumComponent | — | Placeholder |
| `/recherche` | RechercheComponent | — | Placeholder |
| `/connexion` | LoginComponent | — | Login |
| `/inscription` | RegisterComponent | — | Register |
| `/profil` | ProfilComponent | AuthGuard | Profil utilisateur |
| `**` | Redirect → `/` | — | Wildcard |

---

## 6. Backend — Nouvel endpoint

### PATCH `/api/user/profile`

- **Auth requise** : Oui (JWT)
- **Body** :
  ```json
  {
    "nom": "string (optionnel)",
    "prenom": "string (optionnel)",
    "username": "string (optionnel)",
    "email": "string (optionnel)",
    "adressePostale": "string (optionnel, nullable)"
  }
  ```
- **Validations** :
  - Email : format valide si fourni
  - Username : non vide si fourni
  - Unicité email et username vérifiée
- **Traitement** :
  1. Extraire userId du JWT
  2. Vérifier unicité email/username si modifiés
  3. Mettre à jour les champs fournis
  4. Retourner le profil mis à jour (sans password)
- **Réponse 200** : profil mis à jour
- **Erreurs** :
  - 400 : Données invalides
  - 401 : Token manquant ou invalide
  - 409 : Email ou username déjà utilisé

### DTO Backend

```typescript
// update-profile.dto.ts
export class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() nom?: string;
  @IsOptional() @IsString() @IsNotEmpty() prenom?: string;
  @IsOptional() @IsString() @IsNotEmpty() username?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() adressePostale?: string;
}
```

---

## 7. Structure des fichiers

### Frontend (nouveaux/modifiés)

```
src/app/
  core/
    services/
      auth.service.ts              → AuthService (login, register, logout, profile)
    guards/
      auth.guard.ts                → AuthGuard (canActivate)
    interceptors/
      auth.interceptor.ts          → Ajoute Bearer token + gère 401
  pages/
    login/
      login.component.ts/html/scss → Page connexion
    register/
      register.component.ts/html/scss → Page inscription + indicateur robustesse
    profil/
      profil.component.ts/html/scss → Page profil (lecture + modification)
  shared/
    components/
      header/                       → Modifié (header dynamique connecté/non connecté)
  app.routes.ts                     → Modifié (nouvelles routes + guard)
  app.config.ts                     → Modifié (ajout intercepteur)
```

### Backend (nouveaux/modifiés)

```
src/
  user/
    user.controller.ts              → Modifié (ajout PATCH profile)
    user.service.ts                 → Modifié (ajout updateProfile)
    dto/
      update-profile.dto.ts         → Nouveau
```

---

## 8. Style des formulaires

- Utiliser Angular Material : `mat-form-field`, `mat-input`, `mat-button`
- Formulaires centrés, max-width 450px
- Messages d'erreur sous chaque champ (Angular Material `mat-error`)
- Message global d'erreur (bandeau rouge) pour les erreurs serveur (401, 403, 409)
- Indicateur robustesse : barre de progression colorée sous le champ mot de passe

---

## 9. Hors périmètre

| Élément | Raison |
|---------|--------|
| Changement de mot de passe | Spec future |
| Upload avatar | Non prévu |
| Suppression de compte | Non prévu |
| OAuth / connexion sociale | Non prévu |
| "Mot de passe oublié" | Non prévu |

---

## 10. Critères de validation

1. La page `/inscription` permet de créer un compte et redirige vers l'accueil connecté
2. La page `/connexion` permet de se connecter et redirige vers l'accueil
3. Le message "Votre compte a été suspendu" s'affiche sur erreur 403
4. Le header affiche "Mon profil" + "Déconnexion" quand connecté
5. La déconnexion supprime le token et redirige vers l'accueil
6. La page `/profil` affiche les infos et permet de les modifier
7. Le `PATCH /api/user/profile` met à jour le profil en base
8. L'AuthGuard redirige vers `/connexion` si non authentifié
9. L'intercepteur ajoute le Bearer token et gère les 401
10. Les formulaires affichent les erreurs de validation
11. Le build Angular passe sans erreur
12. Le build backend passe sans erreur
