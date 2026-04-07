# CHANGELOG — Base Backend

| Champ | Valeur |
|-------|--------|
| Date | 2026-04-02 |
| Feature | SPEC_001 — Socle Backend NestJS |
| Commit | `feat(backend): initialize NestJS backend with auth, Docker, and Prisma` |

## Feature implémentée

Socle backend complet NestJS from scratch : authentification JWT, gestion de rôles, ORM Prisma avec MySQL 8, et containerisation Docker.

## Fichiers créés

### Configuration projet
| Fichier | Description |
|---------|-------------|
| `package.json` | Dépendances npm (NestJS, Prisma, Passport, bcrypt, class-validator) |
| `tsconfig.json` / `tsconfig.build.json` | Configuration TypeScript |
| `nest-cli.json` | Configuration NestJS CLI |
| `.env.example` | Template variables d'environnement |
| `.gitignore` | Exclusions git (node_modules, dist, .env) |
| `.prettierrc` | Configuration Prettier |
| `eslint.config.mjs` | Configuration ESLint |

### Docker
| Fichier | Description |
|---------|-------------|
| `Dockerfile` | Build multi-stage (build → production) |
| `docker-compose.yml` | Services api (NestJS:3000) + db (MySQL 8:3306) avec healthcheck |

### Prisma
| Fichier | Description |
|---------|-------------|
| `prisma/schema.prisma` | Modèle User + enum Role (USER, ADMIN, MODO) |
| `prisma.config.ts` | Configuration Prisma avec datasource MySQL |

### Source — Auth
| Fichier | Description |
|---------|-------------|
| `src/auth/auth.module.ts` | Module auth (Passport + JWT async config avec validation) |
| `src/auth/auth.controller.ts` | Endpoints POST /api/auth/register et POST /api/auth/login |
| `src/auth/auth.service.ts` | Logique register (bcrypt hash, unicité) et login (validation credentials) |
| `src/auth/dto/register.dto.ts` | DTO validation : email, username, firstName, lastName, password (min 6) |
| `src/auth/dto/login.dto.ts` | DTO validation : email, password |
| `src/auth/strategies/jwt.strategy.ts` | Stratégie Passport JWT (extraction Bearer, validation secret) |

### Source — User
| Fichier | Description |
|---------|-------------|
| `src/user/user.module.ts` | Module user |
| `src/user/user.controller.ts` | Endpoint GET /api/user/profile (protégé JWT) |
| `src/user/user.service.ts` | Récupération profil sans password via Prisma select |

### Source — Common
| Fichier | Description |
|---------|-------------|
| `src/common/guards/jwt-auth.guard.ts` | Guard d'authentification JWT |
| `src/common/guards/roles.guard.ts` | Guard de vérification des rôles via metadata |
| `src/common/decorators/roles.decorator.ts` | Décorateur @Roles() pour annoter les endpoints |
| `src/common/enums/role.enum.ts` | Réexport de l'enum Role depuis Prisma |

### Source — Prisma
| Fichier | Description |
|---------|-------------|
| `src/prisma/prisma.module.ts` | Module global Prisma |
| `src/prisma/prisma.service.ts` | Service PrismaClient avec lifecycle hooks |

### Source — App
| Fichier | Description |
|---------|-------------|
| `src/app.module.ts` | Module racine (ConfigModule global, PrismaModule, AuthModule, UserModule) |
| `src/main.ts` | Bootstrap : préfixe /api, CORS, ValidationPipe (whitelist + forbidNonWhitelisted) |

### Tests
| Fichier | Tests | Résultat |
|---------|-------|----------|
| `src/auth/auth.service.spec.ts` | 7 tests (register + login) | PASS |
| `src/user/user.service.spec.ts` | 2 tests (getProfile) | PASS |
| `src/common/guards/roles.guard.spec.ts` | 3 tests (autorisation) | PASS |

### Documentation
| Fichier | Description |
|---------|-------------|
| `docs/spec/SPEC_001_BASE_BACKEND.md` | Spécification source |
| `docs/alerts/ALERT_2026-04-02_BASE_BACKEND.md` | Alerte reviewer (HIGH → corrigé) |
| `docs/audits/AUDIT_2026-04-02_BASE_BACKEND.md` | Rapport d'audit qualité |

## Architecture

```
AppModule
  ├── ConfigModule (global)
  ├── PrismaModule (global) → PrismaService
  ├── AuthModule → AuthController, AuthService, JwtStrategy
  └── UserModule → UserController, UserService
```

## Décisions techniques

| Décision | Justification |
|----------|---------------|
| Prisma `Role` réexporté | Évite la duplication d'enum entre Prisma et l'app TypeScript |
| JWT_SECRET validé au démarrage | Empêche le démarrage silencieux sans secret configuré |
| `forbidNonWhitelisted: true` | Rejette les champs non déclarés dans les DTOs |
| docker-compose avec `${VAR:-default}` | Les secrets sont dans `.env` (gitignored), avec des defaults pour le dev |
| Password exclu via Prisma `select` | Jamais exposé dans les réponses API |
| bcrypt salt rounds 10 | Standard recommandé, bon compromis sécurité/performance |

## Findings sécurité

Aucune vulnérabilité critique. Audit OWASP passé. Points reportés pour plus tard : rate limiting, Helmet, CORS avancé.

## Résumé audit

Qualité globale : **BONNE**. Conforme à la spec, code idiomatique NestJS, 12/12 tests passés, sécurité validée.
