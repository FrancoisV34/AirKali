# TODO — Conformite avec le dossier de conception

Reference : `dossier_de_conception_breath_for_all.txt` (20/03/2026)
Date d'analyse : 2026-04-12

---

## Bloquant — Ecarts fonctionnels et securite

### 1. UC4 — Export PDF/CSV
- **Section dossier** : 9 (Endpoints), diagramme UC (Acces Public)
- **Description** : Permettre a tout visiteur/utilisateur d'exporter les donnees historiques (air + meteo) d'une commune sur une periode donnee, en format PDF et/ou CSV.
- **Travail estime** :
  - Backend : endpoint GET /api/communes/:id/export?format=pdf|csv&from=...&to=...
  - Generation CSV : natif Node.js
  - Generation PDF : librairie type pdfkit ou puppeteer
  - Frontend : bouton "Exporter" sur la page commune (historique)

### 2. Validation complexite mot de passe
- **Section dossier** : 7.1 (Securite — Authentification)
- **Regle** : 8 caracteres minimum, au moins 1 majuscule, 1 chiffre, 1 caractere special
- **Etat actuel** : Aucune validation de complexite, seul le champ est requis
- **Travail** :
  - Backend : ajouter regex dans RegisterDto (class-validator @Matches)
  - Frontend : ajouter validation dans le formulaire d'inscription

### 3. Indicateur de robustesse du mot de passe
- **Section dossier** : 7.1 (Securite — Authentification)
- **Regle** : L'interface affiche un indicateur de robustesse dynamique a la creation de compte
- **Etat actuel** : Non implemente
- **Travail** :
  - Frontend : composant password-strength (barre coloree faible/moyen/fort)
  - Affiche sous le champ mot de passe sur la page inscription

### 4. bcrypt salt rounds 12
- **Section dossier** : 7.1 (Securite — Authentification)
- **Regle** : bcrypt salt rounds >= 12
- **Etat actuel** : Salt rounds = 10 (src/auth/auth.service.ts)
- **Travail** :
  - Modifier `bcrypt.hash(dto.password, 10)` → `bcrypt.hash(dto.password, 12)`
  - Fichier : src/auth/auth.service.ts

### 5. Rate limiting routes sensibles
- **Section dossier** : 7.3 (Securite — Autres mesures)
- **Regle** : Limitation du debit sur les routes sensibles (login, inscription)
- **Etat actuel** : Aucun rate limiting
- **Travail** :
  - Installer @nestjs/throttler
  - Configurer globalement (ex: 10 req/min par IP sur /auth/login et /auth/register)
  - Fichiers : src/app.module.ts, src/auth/auth.controller.ts

---

## Recommande — Documentation et conformite ERD

### 6. Documentation Swagger
- **Section dossier** : 9 (Description des endpoints API)
- **Regle** : Documentation complete via Swagger UI a /api-docs
- **Etat actuel** : Non implemente
- **Travail** :
  - Installer @nestjs/swagger
  - Ajouter SwaggerModule.setup() dans main.ts
  - Ajouter decorateurs @ApiTags, @ApiOperation, @ApiResponse sur les controllers
  - Swagger UI accessible sur http://localhost:3000/api-docs

### 7. Endpoint admin alerte manuelle
- **Section dossier** : 9 (Endpoints — POST /api/alertes), section 4.2 (classe Alerte), ERD (table alerte)
- **Regle** : Un admin peut emettre une alerte textuelle associee a une commune avec un niveau (info, warning, critical)
- **Etat actuel** : On a des alertes automatiques sur seuils (UC16) mais pas d'alerte manuelle admin
- **Travail** :
  - Nouvelle table ou reutilisation d'AlertLog avec champ `message` texte libre
  - Endpoint POST /api/admin/alertes { communeId, message, niveau }
  - Notification a tous les utilisateurs ayant cette commune en favori
  - Frontend : section dans l'interface admin pour emettre une alerte

---

## Mineur — Ajustements non bloquants

### 8. JWT expiration
- **Section dossier** : 7.1 (Securite — Authentification)
- **Regle** : JWT avec expiration 24h
- **Etat actuel** : 2h (plus securise que le dossier)
- **Decision** : Conserver 2h — c'est un choix de securite plus strict, conforme a l'esprit du dossier. Documenter la decision si necessaire.

### 9. Headers de securite HTTP
- **Section dossier** : 7.3 (Securite — Autres mesures)
- **Regle** : CORS restreint, Content-Security-Policy
- **Etat actuel** : CORS active (app.enableCors()) mais sans restriction d'origine, pas de CSP
- **Travail** :
  - Configurer CORS avec origin restreinte (localhost:4200 en dev, domaine en prod)
  - Installer helmet pour les headers de securite (CSP, X-Frame-Options, etc.)
  - Fichier : src/main.ts

---

## Ordre d'implementation recommande

| Priorite | Tache | Complexite | Temps estime |
|----------|-------|------------|-------------|
| 1 | #4 bcrypt salt 12 | Trivial | 1 ligne |
| 2 | #2 Validation MDP backend + frontend | Faible | 2 fichiers |
| 3 | #3 Indicateur robustesse MDP | Faible | 1 composant frontend |
| 4 | #5 Rate limiting | Faible | 1 install + config |
| 5 | #9 Headers securite (helmet + CORS) | Faible | 1 fichier |
| 6 | #6 Swagger | Moyen | Decorateurs sur tous les controllers |
| 7 | #7 Alerte manuelle admin | Moyen | Backend + frontend |
| 8 | #1 Export PDF/CSV | Moyen-eleve | Backend + frontend + librairie |
| 9 | #8 JWT expiration | Aucun | Decision : on garde 2h |
