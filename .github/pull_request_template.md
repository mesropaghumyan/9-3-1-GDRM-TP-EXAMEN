## Résumé

<!-- Quoi et pourquoi, en quelques lignes. -->

## Definition of Done (`CLAUDE.md` §5.1)

- [ ] `npm run verify` est vert (typecheck, lint, format, arch, test, coverage, audits)
- [ ] Les critères d'acceptation de la story sont tous couverts par des tests
- [ ] Aucun détail tiers ne fuit hors de `infrastructure` (pas de `trackViewUrl`, `artist-credit`)
- [ ] README et SBOM à jour si une dépendance a changé (audit licence et fraîcheur fait)
- [ ] `_bmad-output/implementation-artifacts/sprint-status.yaml` mis à jour dans ce même changement

## Revue QA

Automatique : la CI (`verify`) rejoue la Definition of Done ; la pull request est fusionnée (squash) dès qu'elle est verte.
