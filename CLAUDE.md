# TestPipelineC

Ce projet utilise 2 pipelines d'agents Claude Code complementaires.

## Pipeline 1 — Creation de Specs (interactif)
```
/spec-pipeline
```
Interview interactive → analyse → challenge anti-derive → redaction de la spec dans `docs/spec/`.

| Commande | Role |
|----------|------|
| `/spec-pipeline` | Orchestre la pipeline spec complete |
| `/spec-interviewer` | Interview de recueil du besoin |
| `/spec-analyste1` | Analyse et structure le recueil |
| `/spec-anti-derive` | Challenge paranoiaque des zones floues |
| `/spec-analyste2` | Synthese complete post-clarification |
| `/spec-validateur` | Verification coherence et completude |
| `/spec-redacteur` | Redige la spec finale |

## Pipeline 2 — Developpement (autonome)
```
/pipeline
```
Execute les 15 etapes automatiquement a partir des specs dans `docs/spec/`.

| Commande | Role |
|----------|------|
| `/pipeline` | Orchestre la pipeline dev complete |
| `/dispatcher` | Analyse les specs et separe les features |
| `/lecteur` | Lit et analyse un document de spec |
| `/architecte` | Concoit l'architecture technique |
| `/planificateur` | Cree le plan de developpement detaille |
| `/codeur` | Implemente le plan |
| `/reviewer` | Revue de code avec niveaux de severite |
| `/alerteur` | Cree les fichiers d'alerte (critique/haute) |
| `/plan-tests` | Planifie les tests |
| `/testeur` | Implemente et execute les tests |
| `/securite` | Audit de securite OWASP |
| `/auditeur` | Audit global qualite |
| `/integrateur` | Verification de non-regression |
| `/commiteur` | Cree le commit git |
| `/documentaliste` | Genere le changelog complet |

## Workflow complet
`/spec-pipeline` → produit `docs/spec/SPEC_*.md` → `/pipeline` → developpe la feature

## Structure des dossiers
```
docs/
  spec/        → Specifications (output pipeline 1, input pipeline 2)
  alerts/      → Alertes generees par le reviewer
  audits/      → Rapports d'audit
  changelogs/  → Documentation des changements
  reviews/     → Rapports de review
```

## Stack par defaut
Angular 17, NestJS, MySQL 8, Docker — les pipelines s'adaptent automatiquement a d'autres stacks.

## Execution
```bash
claude                                # Pipeline spec (interactif)
claude --dangerously-skip-permissions # Pipeline dev (autonome)
```

## Guide complet
Voir `docs/GUIDE_PIPELINE.md`
