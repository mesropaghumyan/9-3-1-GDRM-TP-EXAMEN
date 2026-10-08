# Réveil musical

Service qui réveille un utilisateur avec un morceau choisi selon le jour et la météo, puis le prévient sur son canal préféré (Email, SMS, Push). Point d'entrée : `WakeUpService.trigger(userId, dayOfWeek, weather)`.

Référentiel technique : [CLAUDE.md](CLAUDE.md) · [SFD](docs/SFD.md) · [STD](docs/STD.md) · [ADR](docs/adr).

## Prérequis et commandes

- Node.js **24** (`nvm use`, voir `.nvmrc`), puis `npm ci`.
- `npm run verify` : typecheck, lint, format, arch, tests, couverture, audit des vulnérabilités et des licences.
- Autres scripts : `build`, `start`, `dev`, `test:unit`, `test:contract`, `test:integration`, `sbom`.

## Dépendances (audit du 2026-10-08)

Versions issues de `npm ls` / `npm outdated`, licences issues de `license-checker-rseidelsohn`. Toutes sont épinglées exactement (`.npmrc` : `save-exact`, `ignore-scripts`).

| Package                     | Type             | Version installée | Dernière stable | Licence      | Statut       | Justification                                                                                                             |
| --------------------------- | ---------------- | ----------------- | --------------- | ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| tsyringe                    | Direct (runtime) | 4.10.0            | 4.10.0          | MIT          | ✅ À jour    | Conteneur IoC imposé                                                                                                      |
| reflect-metadata            | Direct (runtime) | 0.2.2             | 0.2.2           | Apache-2.0   | ✅ À jour    | Prérequis de tsyringe ; dernière version stable, publiée de longue date (projet à rythme de release lent)                 |
| typescript                  | Direct (dev)     | 6.0.3             | 7.0.2           | Apache-2.0   | ⚠️ En retard | `typescript-eslint@8.71.1` déclare `typescript >=4.8.4 <6.1.0` : la majeure 7 est incompatible avec le lint strict imposé |
| @types/node                 | Direct (dev)     | 24.19.1           | 26.6.4          | MIT          | ⚠️ En retard | Aligné sur Node 24 (cible `engines`) ; les types 26 décrivent des API absentes de Node 24                                 |
| vitest                      | Direct (dev)     | 5.0.3             | 5.0.3           | MIT          | ✅ À jour    | Test runner imposé                                                                                                        |
| @vitest/coverage-v8         | Direct (dev)     | 5.0.3             | 5.0.3           | MIT          | ✅ À jour    | Couverture (seuils bloquants)                                                                                             |
| eslint                      | Direct (dev)     | 10.12.0           | 10.12.0         | MIT          | ✅ À jour    | Lint                                                                                                                      |
| typescript-eslint           | Direct (dev)     | 8.71.1            | 8.71.1          | MIT          | ✅ À jour    | Règles strictes typées                                                                                                    |
| prettier                    | Direct (dev)     | 3.9.9             | 3.9.9           | MIT          | ✅ À jour    | Formatage                                                                                                                 |
| dependency-cruiser          | Direct (dev)     | 18.5.0            | 18.5.0          | MIT          | ✅ À jour    | Règles de couches (AD-1)                                                                                                  |
| license-checker-rseidelsohn | Direct (dev)     | 5.0.1             | 5.0.1           | BSD-3-Clause | ✅ À jour    | Audit des licences ; exige Node ≥ 24                                                                                      |
| @cyclonedx/cyclonedx-npm    | Direct (dev)     | 6.0.1             | 6.0.1           | Apache-2.0   | ✅ À jour    | Génération du SBOM                                                                                                        |
| tsx                         | Direct (dev)     | 4.23.15           | 4.23.15         | MIT          | ✅ À jour    | `npm run dev`                                                                                                             |

### Transitives

- **Production** (3 paquets, voir [docs/licenses.csv](docs/licenses.csv)) : Apache-2.0 (`reflect-metadata`), MIT (`tsyringe`), 0BSD (`tslib@1.14.1`). Aucune licence hors matrice : `npm run audit:licenses` est vert.
- **Développement** (liste complète dans [docs/licenses-dev.csv](docs/licenses-dev.csv)) : majoritairement MIT, ISC, Apache-2.0, BSD, BlueOak-1.0.0, CC0-1.0. Exceptions relevées : `lightningcss` et `lightningcss-darwin-arm64` (MPL-2.0, via `vite`, voir [ADR 0001](docs/adr/0001-licence-mpl-2-0-lightningcss-devdependency.md)) ; `argparse` (Python-2.0), `spdx-exceptions` / `spdx-ranges` (CC-BY-3.0), `expand-template` (MIT OR WTFPL), `rc` (BSD-2-Clause OR MIT OR Apache-2.0) : outils de développement uniquement, non livrés.
- `npm audit --omit=dev --audit-level=high` : 0 vulnérabilité. SBOM de production : [sbom.cdx.json](sbom.cdx.json).
