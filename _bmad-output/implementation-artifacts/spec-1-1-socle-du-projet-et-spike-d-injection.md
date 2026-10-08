---
title: 'Story 1.1 — Socle du projet et spike d''injection'
type: 'chore'
created: '2026-10-08'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'c5fcad124c334b794dea765d93044cc70ecfe3db'
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-9-3-1-GDRM-TP-EXAMEN-2026-10-08/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** le dépôt ne contient aucun code ni outillage ; on ignore si `@inject` (décorateurs de paramètres) fonctionne sous Vitest 5 sans `emitDecoratorMetadata`.

**Approche :** initialiser le projet (npm, TypeScript strict, ESLint, Prettier, dependency-cruiser, Vitest, scripts §5.1), produire README/licences/SBOM, et prouver la résolution `@inject(TOKEN)` par un test minimal. Si le spike échoue : arrêt, ADR de repli `useFactory`, accord humain.

## Boundaries & Constraints

**Always :** versions épinglées exactes (pile du spine, relevées par `npm view`) ; `.npmrc` `save-exact` + `ignore-scripts` ; Node 24 (`.nvmrc`, `engines >=24 <25`) ; `import 'reflect-metadata'` uniquement dans le setup de test et `src/main/index.ts` ; `fetch` bloqué au setup de test ; règles de couches AD-1 actives ; README/licences/SBOM dans le même commit.

**Never :** code métier (Story 1.2+) ; `emitDecoratorMetadata` ; paquet hors pile (`cockatiel`, lib de schéma) ; licence hors matrice §4.1 ; modifier un test pour le faire passer.

## I/O & Edge-Case Matrix

| Scénario | État | Résultat attendu | Erreur |
|---|---|---|---|
| Spike nominal | classe `@injectable()` + `@inject(TOKEN)` sur paramètre d'interface | résolution réussie sous Vitest | N/A |
| Spike en échec | résolution impossible | arrêt, ADR `useFactory`, attente humaine | N/A |
| `fetch` en test | appel de `fetch` | lève une erreur explicite | setup global |
| Import interdit | `domain` importe `infrastructure` | `npm run arch` échoue | règle depcruise |

</frozen-after-approval>

## Code Map

- `CLAUDE.md` §1.1, §4, §5.1, §6 -- règles de couches, audit, scripts, seuils de couverture.
- `ARCHITECTURE-SPINE.md` « Stack » -- versions à épingler (TypeScript 6.0.3 car typescript-eslint 8.71.1 exige `<6.1.0` ; TS 7.0.2 existe mais est incompatible → « ⚠️ En retard » justifié).
- `@types/node` 24.19.1 (cible Node 24) alors que la dernière est 26.x : justifié de même.
- `docs/GIT_WORKFLOW.md` -- convention de commit/branche.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- statut de la story à mettre à jour.

## Tasks & Acceptance

**Execution :**
- [x] `package.json`, `.npmrc`, `.nvmrc`, `package-lock.json` -- init npm, ESM, scripts §5.1, `engines`
- [x] `tsconfig.json`, `tsconfig.build.json` -- strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `experimentalDecorators`
- [x] `eslint.config.js`, `.prettierrc`, `.dependency-cruiser.cjs`, `vitest.config.ts` -- outillage et seuils
- [x] `tests/setup.ts`, `tests/unit/spike/injection.spec.ts`, `tests/unit/spike/fetch-blocked.spec.ts` -- setup (reflect-metadata, blocage fetch), spike
- [x] `tests/architecture/layers.spec.ts` -- règles de couches vérifiées
- [x] `src/main/index.ts` + dossiers de couches (`.gitkeep`) -- squelette
- [x] `README.md`, `docs/licenses.csv`, `sbom.cdx.json` -- tableau issu de `npm ls`/`npm outdated`/license-checker
- [x] `sprint-status.yaml` -- statut de la story

**Acceptance Criteria :**
- Given dépôt propre, when `npm ci` puis `npm run verify`, then tout est vert.
- Given le spike, when Vitest s'exécute, then `@inject` résout sans `emitDecoratorMetadata`.
- Given un test appelant `fetch`, when il s'exécute, then une erreur est levée.

## Implementation Notes

## Verification

**Commands :**
- `npm ci && npm run verify` -- expected: code 0

Notes d'implémentation (2026-10-08) :
- Spike `@inject` sous Vitest 5.0.3 : **réussi** sans `emitDecoratorMetadata` (`tests/unit/spike/injection.spec.ts`) ; pas d'ADR de repli nécessaire.
- Node 24.21.0 installé via nvm (absent localement) ; `license-checker-rseidelsohn@5.0.1` exige Node ≥ 24.
- `audit:licenses` utilise `--excludePrivatePackages` pour ignorer le paquet racine privé.
- ADR 0001 : MPL-2.0 de `lightningcss` (transitive de dev via vite).
- Les seuils de couverture par périmètre sont déclarés ; ils deviendront effectifs avec le code des stories suivantes.
- `npm ci` puis `npm run verify` : code 0.
