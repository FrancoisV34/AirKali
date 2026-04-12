# SPEC_011 — Export PDF/CSV des donnees historiques

**Date** : 2026-04-12
**Statut** : A developper
**Priorite** : Haute (conformite dossier de conception)
**Reference** : Dossier de conception Breath For All (20/03/2026), section 9 (Endpoints), diagramme UC (Acces Public)

---

## 1. Contexte et objectif

Le dossier de conception prevoit qu'un utilisateur puisse exporter les donnees historiques (qualite de l'air et meteo) d'une commune sur une periode donnee, en format PDF ou CSV. Cette fonctionnalite n'est pas encore implementee (item #1 du TODO conformite — UC4).

---

## 2. Fonctionnalite

### 2.1 Acces

- Utilisateurs connectes uniquement (guard auth JWT)
- Visiteurs non connectes : pas d'acces a l'export

### 2.2 Interface utilisateur

**Emplacement** : Page historique d'une commune, bouton "Exporter" (reutiliser les composants boutons existants).

**Panneau d'export** (au clic sur le bouton) :
- **Type de donnees** : selecteur Air / Meteo / Les deux
- **Periode** : date debut + date fin (maximum 1 mois)
- **Format** : selecteur PDF / CSV
- **Bouton** : "Telecharger"

### 2.3 Export CSV

**Separateur** : Point-virgule (`;`) — standard francais, compatible Excel FR.

**Nom du fichier** : `export_[type]_[NomCommune]_[dateDebut]_[dateFin].csv`
- Exemples :
  - `export_air_Lyon_2026-03-01_2026-03-31.csv`
  - `export_meteo_Lyon_2026-03-01_2026-03-31.csv`
  - `export_complet_Lyon_2026-03-01_2026-03-31.csv`

**Colonnes Air** :
| Colonne | Description |
|---------|-------------|
| Date | Date de la mesure (YYYY-MM-DD) |
| AQI | Indice de qualite de l'air global |
| PM2.5 | Particules fines PM2.5 (ug/m3) |
| PM10 | Particules PM10 (ug/m3) |
| O3 | Ozone (ug/m3) |
| NO2 | Dioxyde d'azote (ug/m3) |
| + autres | Tous les polluants disponibles en base |

**Colonnes Meteo** :
| Colonne | Description |
|---------|-------------|
| Date | Date de la mesure (YYYY-MM-DD) |
| Temperature | Temperature (°C) |
| Humidite | Humidite relative (%) |
| Vent | Vitesse du vent (km/h) |
| Pression | Pression atmospherique (hPa) |
| + autres | Toutes les donnees meteo disponibles en base |

**Mode "Les deux"** : Les colonnes air et meteo sont combinees par date dans un seul fichier.

### 2.4 Export PDF

**Mise en page** :
- Titre : "Donnees [Air/Meteo/Completes] — [Nom Commune]"
- Sous-titre : "Periode du [dateDebut] au [dateFin]"
- Tableau(x) de donnees avec en-tetes (memes colonnes que le CSV)
- Mise en page soignee si la librairie le permet facilement, sinon tableau de donnees brutes

**Nom du fichier** : meme convention que CSV avec extension `.pdf`

**Librairie suggeree** : pdfkit ou pdfmake (plus leger que puppeteer)

---

## 3. Backend

### 3.1 Endpoint

```
GET /api/communes/:id/export?format=pdf|csv&type=air|meteo|both&from=YYYY-MM-DD&to=YYYY-MM-DD
```

**Parametres** :
| Parametre | Type | Requis | Description |
|-----------|------|--------|-------------|
| id | number | Oui | ID de la commune |
| format | string | Oui | `pdf` ou `csv` |
| type | string | Oui | `air`, `meteo` ou `both` |
| from | string | Oui | Date debut (YYYY-MM-DD) |
| to | string | Oui | Date fin (YYYY-MM-DD) |

**Reponse** :
- Succes : fichier en telechargement (Content-Disposition: attachment)
- Content-Type : `text/csv; charset=utf-8` ou `application/pdf`

### 3.2 Validations

| Regle | Comportement |
|-------|-------------|
| Periode > 1 mois | HTTP 400 : "La periode ne peut pas depasser 1 mois" |
| Date debut > date fin | HTTP 400 : "La date de debut doit etre anterieure a la date de fin" |
| Commune inexistante | HTTP 404 |
| Non authentifie | HTTP 401 |
| Aucune donnee | HTTP 200 avec message "Aucune donnee disponible pour cette periode" (pas de fichier genere) |

### 3.3 Architecture

- Nouveau module `ExportModule` avec `ExportController` et `ExportService`
- Le service recupere les donnees via les repositories existants (DonneeAir, DonneeMeteo)
- Generation CSV : natif Node.js (construction string avec separateur `;`)
- Generation PDF : librairie pdfkit ou pdfmake

---

## 4. Fichiers impactes

| Fichier | Modification |
|---------|-------------|
| `src/export/export.module.ts` | Nouveau module |
| `src/export/export.controller.ts` | Nouveau controller avec endpoint GET |
| `src/export/export.service.ts` | Nouveau service (generation CSV + PDF) |
| `src/app.module.ts` | Import ExportModule |
| Frontend : page historique commune | Ajout bouton "Exporter" + panneau de selection |
| `package.json` | Ajout dependance pdfkit ou pdfmake |

---

## 5. Regles metier

| Regle | Detail |
|-------|--------|
| EXPORT_AUTH | Seuls les utilisateurs connectes peuvent exporter |
| EXPORT_PERIOD | Periode max 1 mois |
| EXPORT_NO_DATA | Message explicite si aucune donnee, pas de fichier vide |
| EXPORT_CSV_FR | Separateur point-virgule pour compatibilite Excel FR |
| EXPORT_FILENAME | Convention de nommage : export_[type]_[commune]_[from]_[to].[ext] |

---

## 6. Criteres d'acceptation

- [ ] Le bouton "Exporter" est visible sur la page historique d'une commune (connecte uniquement)
- [ ] L'utilisateur peut choisir Air / Meteo / Les deux
- [ ] L'utilisateur peut selectionner une periode (max 1 mois)
- [ ] L'utilisateur peut choisir PDF ou CSV
- [ ] Le CSV utilise le separateur point-virgule
- [ ] Le CSV contient toutes les colonnes de donnees disponibles
- [ ] Le PDF est mis en page avec titre et tableaux
- [ ] Le nom du fichier suit la convention definie
- [ ] Une periode > 1 mois est rejetee avec message d'erreur
- [ ] Si aucune donnee : message "Aucune donnee disponible" (pas de fichier)
- [ ] Un utilisateur non connecte ne peut pas acceder a l'export

---

## 7. Hors scope

- Export pour visiteurs non connectes
- Export de donnees en temps reel
- Graphiques dans le PDF
- Envoi par email du fichier exporte
- Export de plus d'un mois
