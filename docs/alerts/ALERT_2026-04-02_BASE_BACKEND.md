# ALERTE — Base Backend

| Champ | Valeur |
|-------|--------|
| Date | 2026-04-02 |
| Feature | SPEC_001 — Socle Backend NestJS |
| Sévérité globale | HIGH |

## Problèmes identifiés

### 1. docker-compose.yml — Credentials en dur (HIGH)
Les secrets (DATABASE_URL, JWT_SECRET, mots de passe MySQL) sont hardcodés dans docker-compose.yml au lieu de référencer le fichier `.env`.

### 2. Validation JWT_SECRET manquante (HIGH)
Les fichiers `auth.module.ts` et `jwt.strategy.ts` utilisent `!` (non-null assertion) sans valider que JWT_SECRET est bien défini. L'app pourrait démarrer silencieusement sans secret valide.

### 3. Type safety — Role (MEDIUM)
`auth.service.ts` et `jwt.strategy.ts` utilisent `string` au lieu de l'enum `Role` pour le typage du rôle.

### 4. ValidationPipe — forbidNonWhitelisted (MEDIUM)
Le ValidationPipe n'a pas `forbidNonWhitelisted: true`, ce qui permet d'envoyer des champs supplémentaires sans erreur.

## Fichiers concernés
- `docker-compose.yml`
- `src/auth/auth.module.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/auth/auth.service.ts`
- `src/main.ts`

## Recommandations
Corriger les 4 points ci-dessus. Les autres findings (rate limiting, CORS avancé, password complexity) sont explicitement hors périmètre de cette spec.
