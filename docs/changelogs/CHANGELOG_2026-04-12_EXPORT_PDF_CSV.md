# Changelog — SPEC_011 Export PDF/CSV

**Date** : 2026-04-12
**Commit** : feat(export): implement PDF/CSV data export for commune history
**Spec** : SPEC_011_EXPORT_PDF_CSV.md

---

## Resume

Implementation de l'export des donnees historiques (qualite de l'air et meteo) d'une commune, en format PDF ou CSV. Fonctionnalite UC4 du dossier de conception.

## Changements

### Backend — ExportModule
- **ExportController** : endpoint `GET /api/communes/:id/export` protege par JwtAuthGuard
- **ExportService** : generation CSV (separateur `;`, BOM UTF-8) et PDF (pdfkit avec titre, sous-titre, tableaux)
- **ExportQueryDto** : validation des parametres (format, type, from, to)
- Validations : periode max 1 mois, date debut < date fin, commune existante
- Response : fichier en telechargement (Content-Disposition: attachment)

### Frontend — Panneau d'export
- Ajout dans `history-charts.component` : bouton "Exporter" visible pour les utilisateurs connectes
- Panneau avec selecteurs : type de donnees (Air/Meteo/Les deux), format (CSV/PDF), periode (date debut/fin)
- Validation client-side de la periode
- Telechargement via blob + createElement('a')

### Frontend — ExportService
- Service Angular pour appeler l'endpoint d'export
- Gestion des erreurs et du cas "aucune donnee"

## Fichiers crees

| Fichier | Description |
|---------|-------------|
| `src/export/export.module.ts` | Module NestJS |
| `src/export/export.controller.ts` | Controller avec endpoint export |
| `src/export/export.service.ts` | Service generation CSV + PDF |
| `src/export/export.service.spec.ts` | Tests unitaires (9 tests) |
| `src/export/dto/export-query.dto.ts` | DTO validation query params |
| `frontend/.../export.service.ts` | Service Angular export |

## Fichiers modifies

| Fichier | Description |
|---------|-------------|
| `src/app.module.ts` | Import ExportModule |
| `frontend/.../history-charts.component.ts` | Logique export + imports |
| `frontend/.../history-charts.component.html` | UI panneau export |
| `frontend/.../history-charts.component.scss` | Styles panneau export |
| `package.json` | +pdfkit |

## Tests
- 155/155 tests passent (aucune regression)
- 9 nouveaux tests : validation dates, commune 404, CSV air/meteo/both, valeurs null

## Securite
- Endpoint protege par auth JWT
- Periode limitee a 1 mois (anti-DoS)
- Pas d'injection possible (donnees numeriques, Prisma parametre)
