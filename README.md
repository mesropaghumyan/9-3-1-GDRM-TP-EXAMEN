# Réveil musical

Service qui réveille un utilisateur avec un morceau choisi selon le jour et la météo, puis le prévient sur son canal préféré (Email, SMS, Push). Point d'entrée : `WakeUpService.trigger(userId, dayOfWeek, weather)`.

Référentiel technique : [CLAUDE.md](CLAUDE.md) · [SFD](docs/SFD.md) · [STD](docs/STD.md) · [ADR](docs/adr) · [Contrat OpenAPI](docs/api/openapi.yaml) · [Revue de conformité](docs/REVUE_CONFORMITE.md).

## Prérequis et commandes

- Node.js **24** (`nvm use`, voir `.nvmrc`), puis `npm ci`.
- `npm run verify` : typecheck, lint, format, arch, tests, couverture, audit des vulnérabilités et des licences.
- Couverture (seuils bloquants dans `vitest.config.ts`) : `domain`+`application` ≥ 90 % lignes / 85 % branches, `infrastructure` ≥ 85 % / 75 %, global ≥ 85 % / 80 %. Aucun fichier n'est exclu de la couverture. Un test sans assertion échoue (`expect.requireAssertions`), et `fetch` est bloqué dans tous les tests.
- Serveur HTTP (contrat [docs/api/openapi.yaml](docs/api/openapi.yaml), ADR 0002) : `npm run serve` (variable `PORT`, défaut 3000), puis par exemple `curl -X POST localhost:3000/wake-ups -H 'Content-Type: application/json' -d '{"userId":"alice","day":"LUNDI","weather":"SOLEIL"}'`. Le contrat est importable tel quel dans Swagger Editor ou Postman et servi par `GET /openapi.yaml`.
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
- Le projet lui-même est sous licence MIT ([LICENSE](LICENSE)).
- `npm audit --omit=dev --audit-level=high` : 0 vulnérabilité. SBOM de production : [sbom.cdx.json](sbom.cdx.json).

## Composants qui posent question

Critères de `CLAUDE.md` §4.2 (dernière publication de plus de 12 mois, mainteneur unique, version en retard). Les dates viennent de `npm view <paquet> time.modified` (audit du 2026-10-08).

| Package                               | Constat                                                        | Justification                                                                                                                                                                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tsyringe 4.10.0                       | Dernière publication le 2025-04-16 (≈ 18 mois) ; 2 mainteneurs | Conteneur IoC **imposé** par `CLAUDE.md`. C'est la dernière version stable ; le projet est à rythme de release lent et son API est stable. Utilisé uniquement via `@injectable`, `@inject`, `container` (isolés par `dependency-cruiser`), ce qui limite le coût d'un remplacement. |
| reflect-metadata 0.2.2                | Dernière publication le 2024-03-29 (≈ 30 mois) ; 1 mainteneur  | Prérequis de tsyringe, polyfill de l'API `Reflect.metadata` : fonctionnellement stable. Importé une seule fois (`src/main/index.ts` et le setup de test).                                                                                                                           |
| tslib 1.14.1 (transitive de tsyringe) | Dernière stable 2.8.1 ; version de 2020                        | Imposée par la plage de dépendances de tsyringe ; licence 0BSD (autorisée). Non remplaçable sans modifier tsyringe.                                                                                                                                                                 |
| @types/node 24.19.1                   | Dernière stable 26.6.4 ; 1 mainteneur                          | Types alignés sur Node 24 (cible de `engines`).                                                                                                                                                                                                                                     |
| tsx 4.23.15                           | 1 mainteneur                                                   | Dev uniquement (`npm run dev`, test du point d'entrée) ; non livré.                                                                                                                                                                                                                 |
| typescript 6.0.3                      | Dernière stable 7.0.2                                          | `typescript-eslint@8.71.1` exige `typescript <6.1.0`.                                                                                                                                                                                                                               |

## Commandes d'audit exécutées (2026-10-08)

| Commande                                                                                                                                          | Résultat                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm ls --all --omit=dev`                                                                                                                         | `reflect-metadata@0.2.2`, `tsyringe@4.10.0` → `tslib@1.14.1` (3 paquets de production)                                |
| `npm outdated`                                                                                                                                    | `@types/node` 24.19.1 → 26.6.4 et `typescript` 6.0.3 → 7.0.2 (retards justifiés ci-dessus) ; tout le reste est à jour |
| `npm audit --omit=dev --audit-level=high`                                                                                                         | 0 vulnérabilité                                                                                                       |
| `license-checker-rseidelsohn --production --excludePrivatePackages --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;0BSD;BlueOak-1.0.0"` | code 0 : MIT 1, Apache-2.0 1, 0BSD 1                                                                                  |
| `npm run sbom`                                                                                                                                    | `sbom.cdx.json` régénéré (périmètre production)                                                                       |

Écarts d'outil : `license-checker-rseidelsohn` exige Node ≥ 24 et affiche `UNLICENSED` pour tout paquet marqué `"private": true`, d'où `--excludePrivatePackages` (le projet racine est bien sous licence MIT, voir [LICENSE](LICENSE)).
