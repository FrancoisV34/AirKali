# Guide d'utilisation des Pipelines

Ce projet contient 2 pipelines complementaires :
- **Pipeline Spec** (`/spec-pipeline`) — Cree les documents de specification via interview interactive
- **Pipeline Dev** (`/pipeline`) — Developpe automatiquement a partir des specs

Workflow complet : `/spec-pipeline` → produit la spec → `/pipeline` → developpe la feature

---

# PIPELINE 1 — Creation de Specs

## Demarrage rapide

### 1. Lancer Claude Code
```bash
cd /Users/fv/Desktop/TestPipelineC
claude
```

### 2. Lancer la pipeline de spec
```
/spec-pipeline
```

### 3. Repondre aux questions
L'interviewer puis l'anti-derive te poseront des questions. Reponds avec precision.
Le document final sera genere dans `docs/spec/`.

## Commandes individuelles (spec)

| Commande | Description | Interactif |
|----------|-------------|-----------|
| `/spec-interviewer` | Interview de recueil du besoin | Oui |
| `/spec-analyste1` | Analyse et structure le recueil | Non |
| `/spec-anti-derive` | Challenge chaque point avec paranoia | Oui |
| `/spec-analyste2` | Synthese complete post-clarification | Non |
| `/spec-validateur` | Verification coherence et completude | Oui (si probleme) |
| `/spec-redacteur` | Redige la spec finale dans `docs/spec/` | Non |

## Ordre d'execution (spec)

```
/spec-interviewer        ← Interactif : tu reponds
    ↓
/spec-analyste1          ← Automatique
    ↓
/spec-anti-derive        ← Interactif : il te challenge, tu reponds
    ↓
/spec-analyste2          ← Automatique
    ↓
/spec-validateur         ← Interactif si probleme
    ↓
/spec-redacteur          ← Automatique → fichier dans docs/spec/
```

---

# PIPELINE 2 — Developpement

## Demarrage rapide

### 1. Preparer les specs
Placer les documents de specification dans le dossier :
```
docs/spec/
```
Formats acceptes : `.md`, `.txt`, ou tout fichier texte.

### 2. Lancer Claude Code en mode autonome
```bash
cd /Users/fv/Desktop/TestPipelineC
claude --dangerously-skip-permissions
```

### 3. Lancer le pipeline complet
```
/pipeline
```
C'est tout. Le pipeline execute les 15 etapes automatiquement, feature par feature.

---

## Commandes individuelles

Chaque agent peut etre lance independamment pour du debug ou un usage standalone.

### Analyse et conception
| Commande | Description |
|----------|-------------|
| `/dispatcher` | Analyse `docs/spec/` et separe les features |
| `/lecteur [fichier ou contexte]` | Lit et structure une spec |
| `/architecte [analyse du lecteur]` | Concoit l'architecture technique |
| `/planificateur [architecture]` | Cree le plan de developpement detaille |

### Implementation
| Commande | Description |
|----------|-------------|
| `/codeur [plan de dev]` | Implemente le plan etape par etape |

### Validation
| Commande | Description |
|----------|-------------|
| `/reviewer [resume implementation]` | Revue de code avec niveaux de severite |
| `/alerteur [rapport review]` | Cree un fichier d'alerte dans `docs/alerts/` |
| `/plan-tests [resume implementation]` | Planifie les tests a ecrire |
| `/testeur [plan de tests]` | Implemente les tests, execute, corrige (5 iterations max) |
| `/securite [resume implementation]` | Audit securite OWASP, corrige les failles critiques |
| `/auditeur [contexte complet]` | Audit global, rapport dans `docs/audits/` |
| `/integrateur` | Verifie la non-regression sur tous les tests existants |

### Finalisation
| Commande | Description |
|----------|-------------|
| `/commiteur` | Cree le commit git structure |
| `/documentaliste` | Genere le changelog dans `docs/changelogs/` |

---

## Ordre d'execution du pipeline

```
/dispatcher
    └── Pour chaque feature :
        /lecteur
        /architecte
        /planificateur
        /codeur
        /reviewer ──→ si probleme ──→ /alerteur + retour /codeur (1 retry)
        /plan-tests
        /testeur (boucle jusqu'a 5x)
        /securite
        /auditeur
        /integrateur (boucle jusqu'a 3x)
        /commiteur
        /documentaliste
```

---

## Structure des dossiers

```
TestPipelineC/
├── docs/
│   ├── spec/        ← Deposer les specs ici (INPUT)
│   ├── alerts/      ← Alertes generees automatiquement
│   ├── audits/      ← Rapports d'audit
│   ├── changelogs/  ← Documentation des changements
│   └── reviews/     ← Rapports de review
└── .claude/
    └── commands/    ← Les 22 agents (7 spec + 15 dev)
```

---

## Fichiers generes par le pipeline

| Fichier | Dossier | Genere par |
|---------|---------|------------|
| `ALERT_YYYY-MM-DD_FEAT-XXX.md` | `docs/alerts/` | Alerteur |
| `AUDIT_YYYY-MM-DD_FEAT-XXX.md` | `docs/audits/` | Auditeur |
| `CHANGELOG_YYYY-MM-DD_FEAT-XXX.md` | `docs/changelogs/` | Documentaliste |
| `SPEC_YYYY-MM-DD_feature-slug.md` | `docs/spec/` | Redacteur (pipeline spec) |

---

## Notes importantes

- **Mode autonome obligatoire** : le flag `--dangerously-skip-permissions` est necessaire pour que le pipeline s'execute sans interruption
- **Retry limites** : le reviewer retente 1 fois, le testeur 5 fois, l'integrateur 3 fois — apres quoi le pipeline continue
- **Multi-stack** : le pipeline detecte automatiquement la stack du projet (Angular, NestJS, etc.) mais fonctionne avec n'importe quelle stack
- **Multi-features** : si le document de spec contient plusieurs features, le dispatcher les separe et le pipeline boucle sur chacune
