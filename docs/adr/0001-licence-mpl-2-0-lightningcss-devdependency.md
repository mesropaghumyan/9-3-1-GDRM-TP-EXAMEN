# ADR 0001 — Licence MPL-2.0 de `lightningcss` (dépendance transitive de développement)

- **Statut** : accepté (validation humaine déléguée à l'agent par instruction explicite de l'utilisateur, 2026-10-08)
- **Date** : 2026-10-08

## Contexte

`vitest@5.0.3` dépend de `vite@8.3.3`, qui dépend de `lightningcss@1.33.0` et de son binaire natif `lightningcss-darwin-arm64@1.33.0`, tous deux sous **MPL-2.0** (copyleft faible, CLAUDE.md §4.1 : ADR + validation humaine requis).

## Décision

Accepter ces deux paquets, **uniquement** comme dépendances transitives de `devDependencies`.

## Justification

- Ils n'apparaissent pas dans le périmètre de production : `license-checker-rseidelsohn --production --onlyAllow …` est vert et `sbom.cdx.json` (`--omit dev`) ne les contient pas.
- Le MPL-2.0 est un copyleft par fichier : il n'impose rien au code du projet tant que les fichiers MPL ne sont pas modifiés ni redistribués. Aucun n'est modifié ni livré.
- Aucune alternative à Vitest 5 n'est autorisée sans ADR (CLAUDE.md §0.4).

## Conséquences

- L'audit de licences de production reste la référence légale du livrable.
- Toute apparition de ces paquets dans `dependencies` ou dans le SBOM de production rouvre cet ADR.
